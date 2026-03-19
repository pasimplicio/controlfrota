import React, { useState, useRef } from 'react';
import { 
  X, 
  Camera, 
  CheckCircle2, 
  AlertCircle, 
  Gauge, 
  Fuel, 
  ClipboardCheck, 
  Plus,
  Trash2,
  Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../UI';
import { Reservation, Vehicle, Inspection } from '../../types';
import { uploadMultipleFiles } from '../../services/storageService';

interface InspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (inspection: Omit<Inspection, 'id' | 'createdAt'>) => Promise<void>;
  reservation?: Reservation;
  maintenanceId?: string;
  vehicle: Vehicle;
  type: 'check-out' | 'check-in';
  driverId: string;
}

const CHECKLIST_ITEMS = [
  'Pneus (Calibragem/Estado)',
  'Nível de Óleo',
  'Líquido de Arrefecimento',
  'Luzes (Faróis/Setas/Freio)',
  'Limpadores de Para-brisa',
  'Estepe/Macaco/Chave de Roda',
  'Documentação do Veículo',
  'Limpeza Interna/Externa',
  'Ar Condicionado',
  'Freios'
];

export function InspectionModal({ isOpen, onClose, onSave, reservation, maintenanceId, vehicle, type, driverId }: InspectionModalProps) {
  const [km, setKm] = useState(type === 'check-out' ? vehicle.currentKm : (reservation?.startKm || vehicle.currentKm));
  const [fuelLevel, setFuelLevel] = useState(type === 'check-out' ? 100 : (reservation?.startFuel || 100));
  const [checklist, setChecklist] = useState(CHECKLIST_ITEMS.map(item => ({ item, status: 'ok' as const, comment: '' })));
  const [damages, setDamages] = useState<{ part: string; description: string; photo?: string }[]>([]);
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPhotos(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const addDamage = () => {
    setDamages(prev => [...prev, { part: '', description: '' }]);
  };

  const removeDamage = (index: number) => {
    setDamages(prev => prev.filter((_, i) => i !== index));
  };

  const updateDamage = (index: number, field: string, value: string) => {
    setDamages(prev => prev.map((d, i) => i === index ? { ...d, [field]: value } : d));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Upload photos to Firebase Storage
      const photoUrls = await uploadMultipleFiles(photos, `inspections/${reservation?.id || maintenanceId}/${type}`);
      
      await onSave({
        reservationId: reservation?.id,
        maintenanceId,
        vehicleId: vehicle.id,
        driverId,
        type,
        km,
        fuelLevel,
        photos: photoUrls,
        damages,
        checklist,
        notes
      });
      onClose();
    } catch (err) {
      console.error('Error saving inspection:', err);
      alert('Erro ao salvar vistoria. Tente novamente.');
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
        className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-4xl my-auto max-h-[95vh] flex flex-col"
      >
        <div className="p-4 sm:p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between sticky top-0 bg-white dark:bg-zinc-900 z-10 rounded-t-3xl shrink-0">
          <div>
            <h2 className="text-lg sm:text-xl font-bold dark:text-white">
              Vistoria de {type === 'check-out' ? 'Saída (Check-out)' : 'Retorno (Check-in)'}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {vehicle.brand} {vehicle.model} • {vehicle.plate}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
            <X size={20} className="text-zinc-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6 sm:space-y-8 overflow-y-auto">
          {/* KM and Fuel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase ml-1 flex items-center gap-2">
                <Gauge size={14} /> Quilometragem Atual (KM)
              </label>
              <input 
                type="number"
                required
                min={type === 'check-out' ? vehicle.currentKm : (reservation.startKm || 0)}
                value={km}
                onChange={(e) => setKm(Number(e.target.value))}
                className="w-full p-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-white font-mono text-lg"
              />
              {type === 'check-out' && (
                <p className="text-[10px] text-zinc-400 ml-1 italic">KM atual do veículo: {vehicle.currentKm}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase ml-1 flex items-center gap-2">
                <Fuel size={14} /> Nível de Combustível (%)
              </label>
              <div className="flex items-center gap-4 p-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl">
                <input 
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={fuelLevel}
                  onChange={(e) => setFuelLevel(Number(e.target.value))}
                  className="flex-1 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <span className="font-bold text-emerald-500 w-12 text-right">{fuelLevel}%</span>
              </div>
            </div>
          </div>

          {/* Checklist */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-zinc-500">
              <ClipboardCheck size={18} />
              <h3 className="font-bold uppercase tracking-widest text-xs">Itens de Vistoria</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {checklist.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800">
                  <span className="text-sm dark:text-zinc-300">{item.item}</span>
                  <div className="flex bg-white dark:bg-zinc-900 p-1 rounded-lg border border-zinc-200 dark:border-zinc-700">
                    {(['ok', 'not-ok', 'n/a'] as const).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setChecklist(prev => prev.map((c, i) => i === idx ? { ...c, status } : c))}
                        className={`px-3 py-1 text-[10px] font-bold uppercase rounded-md transition-all ${
                          item.status === status 
                            ? status === 'ok' ? 'bg-emerald-500 text-white' : status === 'not-ok' ? 'bg-red-500 text-white' : 'bg-zinc-400 text-white'
                            : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        }`}
                      >
                        {status === 'ok' ? 'OK' : status === 'not-ok' ? 'RUIM' : 'N/A'}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Damages */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-zinc-500">
                <AlertCircle size={18} />
                <h3 className="font-bold uppercase tracking-widest text-xs">Avarias e Problemas</h3>
              </div>
              <button 
                type="button"
                onClick={addDamage}
                className="text-xs font-bold text-emerald-500 hover:underline flex items-center gap-1"
              >
                <Plus size={14} /> Adicionar Avaria
              </button>
            </div>
            
            <AnimatePresence>
              {damages.map((damage, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-red-50/50 dark:bg-red-500/5 rounded-2xl border border-red-100 dark:border-red-900/20"
                >
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase ml-1">Parte do Veículo</label>
                    <input 
                      type="text"
                      placeholder="Ex: Para-choque dianteiro"
                      value={damage.part}
                      onChange={(e) => updateDamage(idx, 'part', e.target.value)}
                      className="w-full p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase ml-1">Descrição do Dano</label>
                    <input 
                      type="text"
                      placeholder="Ex: Arranhão profundo"
                      value={damage.description}
                      onChange={(e) => updateDamage(idx, 'description', e.target.value)}
                      className="w-full p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none dark:text-white"
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <button 
                      type="button"
                      onClick={() => removeDamage(idx)}
                      className="p-3 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Photos */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-zinc-500">
              <Camera size={18} />
              <h3 className="font-bold uppercase tracking-widest text-xs">Fotos da Vistoria</h3>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
              {photos.map((photo, idx) => (
                <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border-2 border-zinc-200 dark:border-zinc-800 group">
                  <img src={URL.createObjectURL(photo)} alt="Preview" className="w-full h-full object-cover" />
                  <button 
                    type="button"
                    onClick={() => removePhoto(idx)}
                    className="absolute top-1 right-1 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center gap-2 text-zinc-400 hover:border-emerald-500 hover:text-emerald-500 transition-all"
              >
                <Camera size={24} />
                <span className="text-[10px] font-bold uppercase">Adicionar Foto</span>
              </button>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handlePhotoChange} 
              multiple 
              accept="image/*" 
              className="hidden" 
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase ml-1">Observações Gerais</label>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Alguma observação adicional sobre o estado do veículo?"
              className="w-full p-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-white resize-none"
              rows={3}
            />
          </div>

          <div className="pt-6 flex flex-col sm:flex-row gap-3 sticky bottom-0 bg-white dark:bg-zinc-900 pb-2 mt-auto">
            <Button variant="secondary" className="w-full sm:flex-1" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button variant="primary" className="w-full sm:flex-1" type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  Finalizar Vistoria
                </>
              )}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
