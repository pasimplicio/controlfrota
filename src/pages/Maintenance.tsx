import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  Wrench, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar as CalendarIcon,
  Filter,
  LayoutGrid,
  List,
  Gauge,
  DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Maintenance, Vehicle, UserProfile, Inspection } from '../types';
import { Card, StatusBadge, Button } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MaintenanceModal } from '../components/Modals/MaintenanceModal';
import { ConfirmModal } from '../components/Modals/ConfirmModal';
import { InspectionModal } from '../components/Modals/InspectionModal';
import { createNotification } from '../services/notificationService';

export function MaintenancePage() {
  const { user, profile } = useAuth();
  const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState<Maintenance | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'primary';
    isAlert?: boolean;
  } | null>(null);

  // Inspection Modal State
  const [isInspectionModalOpen, setIsInspectionModalOpen] = useState(false);
  const [inspectionType, setInspectionType] = useState<'check-out' | 'check-in'>('check-out');
  const [selectedMaintForInspection, setSelectedMaintForInspection] = useState<Maintenance | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'maintenance'), orderBy('scheduledDate', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const mData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Maintenance));
      setMaintenances(mData);
      setLoading(false);
    });

    const unsubVehicles = onSnapshot(collection(db, 'vehicles'), (snap) => {
      const vData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle));
      setVehicles(vData);
    });

    return () => {
      unsubscribe();
      unsubVehicles();
    };
  }, []);

  const handleSaveMaintenance = async (mData: Omit<Maintenance, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (editingMaintenance) {
        await updateDoc(doc(db, 'maintenance', editingMaintenance.id), {
          ...mData,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'maintenance'), {
          ...mData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      setIsModalOpen(false);
      setEditingMaintenance(null);
    } catch (err) {
      console.error('Error saving maintenance:', err);
    }
  };

  const handleDeleteMaintenance = (id: string) => {
    setConfirmConfig({
      title: 'Excluir Manutenção',
      message: 'Tem certeza que deseja excluir este registro de manutenção?',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'maintenance', id));
          setConfirmConfig(null);
        } catch (err) {
          console.error('Error deleting maintenance:', err);
        }
      }
    });
  };

  const handleSaveInspection = async (inspectionData: Omit<Inspection, 'id' | 'createdAt'>) => {
    if (!selectedMaintForInspection) return;

    try {
      const inspectionRef = await addDoc(collection(db, 'inspections'), {
        ...inspectionData,
        createdAt: serverTimestamp()
      });

      const maintUpdate: any = {
        updatedAt: serverTimestamp(),
      };

      const vehicleUpdate: any = {
        currentKm: inspectionData.km,
        updatedAt: serverTimestamp(),
      };

      if (inspectionData.type === 'check-out') {
        maintUpdate.status = 'in-progress';
        maintUpdate.checkOutId = inspectionRef.id;
        vehicleUpdate.status = 'maintenance';
      } else {
        maintUpdate.status = 'completed';
        maintUpdate.checkInId = inspectionRef.id;
        maintUpdate.completedDate = new Date().toISOString();
        vehicleUpdate.status = 'active';
      }

      await updateDoc(doc(db, 'maintenance', selectedMaintForInspection.id), maintUpdate);
      await updateDoc(doc(db, 'vehicles', selectedMaintForInspection.vehicleId), vehicleUpdate);

      setIsInspectionModalOpen(false);
      setSelectedMaintForInspection(null);
    } catch (err) {
      console.error('Error saving inspection:', err);
      throw err;
    }
  };

  const filteredMaintenances = maintenances.filter(m => {
    const vehicle = vehicles.find(v => v.id === m.vehicleId);
    const searchMatch = (
      vehicle?.model.toLowerCase().includes(searchTerm.toLowerCase()) || 
      vehicle?.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return searchMatch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400';
      case 'in-progress': return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400';
      case 'completed': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400';
      case 'cancelled': return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400';
      default: return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-500/20 dark:text-zinc-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'in-progress': return 'Em Execução';
      case 'completed': return 'Concluída';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Manutenção da Frota</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Gerencie manutenções preventivas e corretivas.</p>
        </div>
        <Button variant="primary" onClick={() => { setEditingMaintenance(null); setIsModalOpen(true); }}>
          <Plus size={18} />
          Agendar Manutenção
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input 
            type="text"
            placeholder="Buscar por placa, modelo ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-white"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded-3xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredMaintenances.length === 0 ? (
              <div className="col-span-full py-24 text-center bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
                <Wrench className="mx-auto text-zinc-300 dark:text-zinc-700 mb-4" size={48} />
                <p className="text-zinc-500 dark:text-zinc-400">Nenhuma manutenção encontrada.</p>
              </div>
            ) : (
              filteredMaintenances.map((m) => {
                const vehicle = vehicles.find(v => v.id === m.vehicleId);
                return (
                  <motion.div
                    key={m.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                  >
                    <Card className="group hover:shadow-xl transition-all duration-300 border-l-4 border-l-amber-500 h-full flex flex-col relative overflow-hidden">
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-zinc-50 dark:bg-zinc-800 rounded-2xl flex items-center justify-center group-hover:bg-amber-50 dark:group-hover:bg-amber-500/10 transition-colors">
                          <Wrench className="text-zinc-400 group-hover:text-amber-500 transition-colors" size={24} />
                        </div>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(m.status)}`}>
                          {getStatusLabel(m.status)}
                        </span>
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="text-lg font-bold dark:text-white mb-1">{vehicle?.brand} {vehicle?.model || 'Veículo'}</h3>
                        <div className="flex items-center gap-2 mb-4">
                          <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded inline-block">{vehicle?.plate || '---'}</p>
                          <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest">{m.type}</span>
                        </div>
                        
                        <div className="space-y-3 mb-6">
                          <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                            <AlertCircle size={14} className="text-zinc-400" />
                            <span>{m.description}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                            <CalendarIcon size={14} className="text-zinc-400" />
                            <span>{format(parseISO(m.scheduledDate), "d 'de' MMM, HH:mm", { locale: ptBR })}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                            <Gauge size={14} className="text-zinc-400" />
                            <span>KM previsto: {m.kmAtMaintenance}</span>
                          </div>
                          {m.cost > 0 && (
                            <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                              <DollarSign size={14} className="text-zinc-400" />
                              <span>Custo: R$ {m.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                        <div className="flex gap-2">
                          <button 
                            type="button"
                            onClick={() => { setEditingMaintenance(m); setIsModalOpen(true); }}
                            className="p-2 text-zinc-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleDeleteMaintenance(m.id)}
                            className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        <div className="flex gap-2">
                          {m.status === 'pending' && (
                            <button 
                              onClick={() => {
                                setSelectedMaintForInspection(m);
                                setInspectionType('check-out');
                                setIsInspectionModalOpen(true);
                              }}
                              className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-lg hover:bg-emerald-600 transition-colors"
                            >
                              <CheckCircle2 size={14} />
                              Iniciar
                            </button>
                          )}
                          {m.status === 'in-progress' && (
                            <button 
                              onClick={() => {
                                setSelectedMaintForInspection(m);
                                setInspectionType('check-in');
                                setIsInspectionModalOpen(true);
                              }}
                              className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 text-white text-xs font-bold rounded-lg hover:bg-blue-600 transition-colors"
                            >
                              <CheckCircle2 size={14} />
                              Concluir
                            </button>
                          )}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      )}

      <MaintenanceModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveMaintenance}
        vehicles={vehicles}
        maintenance={editingMaintenance}
      />

      <ConfirmModal 
        isOpen={!!confirmConfig}
        onClose={() => setConfirmConfig(null)}
        onConfirm={confirmConfig?.onConfirm || (() => {})}
        title={confirmConfig?.title || ''}
        message={confirmConfig?.message || ''}
        variant={confirmConfig?.variant}
        isAlert={confirmConfig?.isAlert}
      />

      {isInspectionModalOpen && selectedMaintForInspection && (
        <InspectionModal
          isOpen={isInspectionModalOpen}
          onClose={() => {
            setIsInspectionModalOpen(false);
            setSelectedMaintForInspection(null);
          }}
          type={inspectionType}
          maintenanceId={selectedMaintForInspection.id}
          vehicle={vehicles.find(v => v.id === selectedMaintForInspection.vehicleId)!}
          driverId={user?.uid || ''}
          onSave={handleSaveInspection}
        />
      )}
    </div>
  );
}
