import React, { useState } from 'react';
import { X, CheckCircle2, Calendar, Wrench, AlertCircle, DollarSign, Gauge } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '../UI';
import { Vehicle, Maintenance } from '../../types';
import { format } from 'date-fns';

interface MaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (maintenance: Omit<Maintenance, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  vehicles: Vehicle[];
  maintenance?: Maintenance | null;
}

export function MaintenanceModal({ isOpen, onClose, onSave, vehicles, maintenance }: MaintenanceModalProps) {
  const [vehicleId, setVehicleId] = useState(maintenance?.vehicleId || '');
  const [type, setType] = useState<Maintenance['type']>(maintenance?.type || 'preventive');
  const [description, setDescription] = useState(maintenance?.description || '');
  const [scheduledDate, setScheduledDate] = useState(maintenance?.scheduledDate || format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [cost, setCost] = useState(maintenance?.cost || 0);
  const [kmAtMaintenance, setKmAtMaintenance] = useState(maintenance?.kmAtMaintenance || 0);
  const [notes, setNotes] = useState(maintenance?.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId) return;
    setIsSubmitting(true);
    try {
      await onSave({
        vehicleId,
        type,
        status: maintenance?.status || 'pending',
        description,
        scheduledDate,
        cost,
        kmAtMaintenance,
        notes
      });
      onClose();
    } catch (err) {
      console.error('Error saving maintenance:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-2xl my-auto max-h-[95vh] flex flex-col"
      >
        <div className="p-4 sm:p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
          <h2 className="text-lg sm:text-xl font-bold dark:text-white">
            {maintenance ? 'Editar Manutenção' : 'Agendar Manutenção'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
            <X size={20} className="text-zinc-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase ml-1">Veículo</label>
              <select 
                required
                value={vehicleId}
                onChange={(e) => {
                  setVehicleId(e.target.value);
                  const v = vehicles.find(veh => veh.id === e.target.value);
                  if (v) setKmAtMaintenance(v.currentKm);
                }}
                className="w-full p-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-white"
              >
                <option value="">Selecione um veículo</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.brand} {v.model} ({v.plate})</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase ml-1">Tipo</label>
              <select 
                required
                value={type}
                onChange={(e) => setType(e.target.value as Maintenance['type'])}
                className="w-full p-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-white"
              >
                <option value="preventive">Preventiva</option>
                <option value="corrective">Corretiva</option>
                <option value="cleaning">Limpeza</option>
                <option value="other">Outro</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase ml-1">Descrição do Serviço</label>
            <input 
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Troca de óleo e filtros"
              className="w-full p-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-white"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase ml-1">Data Agendada</label>
              <input 
                type="datetime-local"
                required
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full p-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase ml-1">KM Previsto</label>
              <input 
                type="number"
                required
                value={kmAtMaintenance}
                onChange={(e) => setKmAtMaintenance(Number(e.target.value))}
                className="w-full p-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-white font-mono"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase ml-1">Custo Estimado (R$)</label>
            <div className="relative">
              <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input 
                type="number"
                step="0.01"
                value={cost}
                onChange={(e) => setCost(Number(e.target.value))}
                className="w-full p-4 pl-12 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-white font-mono"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase ml-1">Observações</label>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalhes adicionais..."
              className="w-full p-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-white resize-none"
              rows={3}
            />
          </div>

          <div className="pt-4 flex flex-col sm:flex-row gap-3 sticky bottom-0 bg-white dark:bg-zinc-900 mt-auto">
            <Button variant="secondary" className="w-full sm:flex-1" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button variant="primary" className="w-full sm:flex-1" type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  {maintenance ? 'Salvar Alterações' : 'Agendar'}
                </>
              )}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
