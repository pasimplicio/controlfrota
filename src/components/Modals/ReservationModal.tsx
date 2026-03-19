import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar, MapPin, User as UserIcon, Car, Clock, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Reservation, Vehicle, UserProfile, HIERARCHY_PRIORITY } from '../../types';
import { Button } from '../UI';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { ConfirmModal } from './ConfirmModal';
import { useAuth } from '../../context/AuthContext';
import { subscribeToSettings, DEFAULT_SETTINGS } from '../../services/settingsService';
import { Settings } from '../../types';

interface ReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Reservation>) => Promise<void>;
  reservation?: Reservation | null;
}

export function ReservationModal({ isOpen, onClose, onSave, reservation }: ReservationModalProps) {
  const { profile } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [formData, setFormData] = useState<Partial<Reservation>>({
    vehicleId: '',
    driverId: profile?.uid || '',
    startDate: new Date().toISOString().slice(0, 16),
    endDate: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
    destination: '',
    reason: '',
    status: 'pending',
    justification: '',
    priority: 0
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'primary';
    isAlert?: boolean;
  } | null>(null);

  useEffect(() => {
    const unsubVehicles = onSnapshot(collection(db, 'vehicles'), (snap) => {
      setVehicles(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle)));
    });
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
    });
    const unsubSettings = subscribeToSettings(setSettings);
    return () => {
      unsubVehicles();
      unsubUsers();
      unsubSettings();
    };
  }, []);

  useEffect(() => {
    if (reservation) {
      setFormData({
        ...reservation,
        startDate: new Date(reservation.startDate).toISOString().slice(0, 16),
        endDate: new Date(reservation.endDate).toISOString().slice(0, 16),
      });
    } else {
      setFormData({
        vehicleId: '',
        driverId: profile?.uid || '',
        startDate: new Date().toISOString().slice(0, 16),
        endDate: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
        destination: '',
        reason: '',
        status: 'pending',
        justification: '',
        priority: profile?.hierarchy ? HIERARCHY_PRIORITY[profile.hierarchy] : 0
      });
    }
  }, [reservation, isOpen, profile]);

  const selectedDriver = useMemo(() => {
    return users.find(u => u.uid === formData.driverId);
  }, [users, formData.driverId]);

  const filteredVehicles = useMemo(() => {
    let filtered = vehicles.filter(v => v.status === 'active');
    
    // Rule: Driver only sees vehicles from their unit
    if (profile?.role === 'driver' && profile.unit) {
      filtered = filtered.filter(v => v.unit === profile.unit);
    } else if (selectedDriver?.role === 'driver' && selectedDriver.unit) {
      // If admin is selecting for a driver, show vehicles from that driver's unit
      filtered = filtered.filter(v => v.unit === selectedDriver.unit);
    }

    return filtered;
  }, [vehicles, profile, selectedDriver]);

  const selectedVehicle = useMemo(() => {
    return vehicles.find(v => v.id === formData.vehicleId);
  }, [vehicles, formData.vehicleId]);

  const needsJustification = useMemo(() => {
    if (!selectedVehicle || !selectedDriver || !settings.requireJustificationAboveHierarchy) return false;
    
    const vehiclePriority = selectedVehicle.hierarchyLevel ? HIERARCHY_PRIORITY[selectedVehicle.hierarchyLevel] : 0;
    const driverPriority = selectedDriver.hierarchy ? HIERARCHY_PRIORITY[selectedDriver.hierarchy] : 0;

    // Rule: If vehicle level > driver level, need justification
    return vehiclePriority > driverPriority;
  }, [selectedVehicle, selectedDriver, settings.requireJustificationAboveHierarchy]);

  const [allReservations, setAllReservations] = useState<Reservation[]>([]);
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'reservations'), (snap) => {
      setAllReservations(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reservation)));
    });
    return () => unsub();
  }, []);

  const conflict = useMemo(() => {
    if (!formData.vehicleId || !formData.startDate || !formData.endDate) return null;
    
    return allReservations.find(r => 
      r.id !== reservation?.id &&
      r.vehicleId === formData.vehicleId &&
      (r.status === 'approved' || r.status === 'active' || r.status === 'pending') &&
      ((formData.startDate! >= r.startDate && formData.startDate! < r.endDate) ||
       (formData.endDate! > r.startDate && formData.endDate! <= r.endDate))
    );
  }, [allReservations, formData.vehicleId, formData.startDate, formData.endDate, reservation]);

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();
    setError(null);
    
    if (isSaving) return;

    // Basic Validations
    const now = new Date();
    const start = new Date(formData.startDate!);
    const end = new Date(formData.endDate!);
    
    // Rule: Minimum advance notice
    const minAdvance = new Date(now.getTime() + settings.minAdvanceHours * 60 * 60 * 1000);
    if (start < minAdvance && !reservation && profile?.role !== 'admin') {
      setError(`Reservas devem ser feitas com no mínimo ${settings.minAdvanceHours} horas de antecedência.`);
      return;
    }

    // Rule: Maximum advance notice
    const maxAdvance = new Date(now.getTime() + settings.maxAdvanceDays * 24 * 60 * 60 * 1000);
    if (start > maxAdvance && profile?.role !== 'admin') {
      setError(`Reservas não podem ser feitas com mais de ${settings.maxAdvanceDays} dias de antecedência.`);
      return;
    }

    // Rule: Weekend reservations
    const isWeekend = start.getDay() === 0 || start.getDay() === 6;
    if (isWeekend && !settings.allowWeekendReservations && profile?.role !== 'admin') {
      setError('Reservas não são permitidas nos fins de semana.');
      return;
    }

    if (!formData.driverId || !formData.vehicleId || !formData.startDate || !formData.endDate || !formData.destination || !formData.reason) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }
    
    if (needsJustification && !formData.justification) {
      setError('A justificativa é obrigatória para este veículo.');
      return;
    }

    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      setError('A data de início deve ser anterior à data de fim.');
      return;
    }

    setIsSaving(true);
    try {
      const driver = users.find(u => u.uid === formData.driverId);
      const priority = driver?.hierarchy ? HIERARCHY_PRIORITY[driver.hierarchy] : 0;
      const unit = driver?.unit || '';
      
      await onSave({
        ...formData,
        priority,
        unit
      });
      onClose();
    } catch (err: any) {
      console.error('Error saving reservation:', err);
      setError('Erro ao salvar a reserva. Por favor, tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <Calendar className="text-white" size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold dark:text-white">{reservation ? 'Editar Reserva' : 'Nova Reserva'}</h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Solicite o uso de um veículo da frota</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full transition-colors">
                <X size={20} className="text-zinc-500 dark:text-zinc-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                {error && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl flex items-start gap-3">
                    <AlertCircle className="text-red-500 shrink-0" size={18} />
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}

                {/* Veículo e Motorista */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-emerald-500">
                    <Car size={16} />
                    <h3 className="text-xs font-bold uppercase tracking-widest">Veículo e Motorista</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Motorista</label>
                      <select 
                        required
                        value={formData.driverId}
                        onChange={e => setFormData({...formData, driverId: e.target.value})}
                        className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white"
                        disabled={profile?.role === 'driver'}
                      >
                        <option value="">Selecione um motorista</option>
                        {users.filter(u => u.role === 'driver' || u.role === 'admin' || u.role === 'manager').map(u => (
                          <option key={u.uid} value={u.uid}>{u.name} ({u.unit})</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Veículo</label>
                      <select 
                        required
                        value={formData.vehicleId}
                        onChange={e => setFormData({...formData, vehicleId: e.target.value})}
                        className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white"
                      >
                        <option value="">Selecione um veículo</option>
                        {filteredVehicles.map(v => (
                          <option key={v.id} value={v.id}>
                            {v.brand} {v.model} ({v.plate}) - {v.hierarchyLevel || 'Livre'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {conflict && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl flex items-start gap-3">
                      <AlertCircle className="text-red-500 shrink-0" size={18} />
                      <div>
                        <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-widest">Conflito de Horário</p>
                        <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                          Este veículo já possui uma reserva {conflict.status === 'pending' ? 'pendente' : 'confirmada'} para este período.
                          {conflict.priority > (formData.priority || 0) && (
                            <span className="block font-bold mt-1 underline">Atenção: A reserva existente tem maior prioridade.</span>
                          )}
                        </p>
                      </div>
                    </div>
                  )}

                  {needsJustification && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl space-y-3"
                    >
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                        <AlertCircle size={18} />
                        <p className="text-xs font-bold">Veículo acima do nível hierárquico</p>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest ml-1">Justificativa Obrigatória</label>
                        <textarea 
                          required
                          value={formData.justification}
                          onChange={e => setFormData({...formData, justification: e.target.value})}
                          placeholder="Explique por que este veículo é necessário..."
                          rows={2}
                          className="w-full bg-white dark:bg-zinc-900 border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500 transition-all dark:text-white resize-none"
                        />
                      </div>
                    </motion.div>
                  )}
                </section>

                {/* Período */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-emerald-500">
                    <Clock size={16} />
                    <h3 className="text-xs font-bold uppercase tracking-widest">Período</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Início</label>
                      <input 
                        type="datetime-local"
                        required
                        value={formData.startDate}
                        onChange={e => setFormData({...formData, startDate: e.target.value})}
                        className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Fim (Previsão)</label>
                      <input 
                        type="datetime-local"
                        required
                        value={formData.endDate}
                        onChange={e => setFormData({...formData, endDate: e.target.value})}
                        className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white"
                      />
                    </div>
                  </div>
                </section>

                {/* Destino e Finalidade */}
                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-emerald-500">
                    <MapPin size={16} />
                    <h3 className="text-xs font-bold uppercase tracking-widest">Destino e Finalidade</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Destino</label>
                      <input 
                        required
                        value={formData.destination}
                        onChange={e => setFormData({...formData, destination: e.target.value})}
                        placeholder="Ex: Cliente X - São Paulo/SP"
                        className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Finalidade / Motivo</label>
                      <textarea 
                        required
                        value={formData.reason}
                        onChange={e => setFormData({...formData, reason: e.target.value})}
                        placeholder="Descreva o motivo da viagem..."
                        rows={3}
                        className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white resize-none"
                      />
                    </div>
                  </div>
                </section>
              </div>

              <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 text-sm font-bold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <Button 
                  type="submit"
                  disabled={isSaving}
                  variant="primary"
                >
                  {isSaving ? 'Salvando...' : 'Confirmar Reserva'}
                </Button>
              </div>
            </form>
          </motion.div>

          <ConfirmModal 
            isOpen={!!confirmConfig}
            onClose={() => setConfirmConfig(null)}
            onConfirm={confirmConfig?.onConfirm || (() => {})}
            title={confirmConfig?.title || ''}
            message={confirmConfig?.message || ''}
            variant={confirmConfig?.variant}
            isAlert={confirmConfig?.isAlert}
          />
        </div>
      )}
    </AnimatePresence>
  );
}
