import React, { useState, useEffect } from 'react';
import { 
  X, 
  Fuel, 
  Calendar, 
  Gauge, 
  MapPin, 
  DollarSign, 
  Camera, 
  AlertCircle,
  MapPin as MapPinIcon,
  Navigation
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { Fueling, Vehicle } from '../../types';
import { Button } from '../UI';
import { uploadFile } from '../../services/storageService';

interface FuelingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Fueling>) => Promise<void>;
  fueling?: Fueling | null;
  vehicles: Vehicle[];
  driverId: string;
}

export function FuelingModal({ isOpen, onClose, onSave, fueling, vehicles, driverId }: FuelingModalProps) {
  const [formData, setFormData] = useState<Partial<Fueling>>({
    vehicleId: '',
    driverId: driverId,
    date: new Date().toISOString().split('T')[0],
    km: 0,
    liters: 0,
    pricePerLiter: 0,
    totalValue: 0,
    stationName: '',
    fuelType: '',
    notes: '',
  });

  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    if (fueling) {
      setFormData(fueling);
      if (fueling.receiptPhoto) {
        setReceiptPreview(fueling.receiptPhoto);
      }
    } else {
      setFormData({
        vehicleId: '',
        driverId: driverId,
        date: new Date().toISOString().split('T')[0],
        km: 0,
        liters: 0,
        pricePerLiter: 0,
        totalValue: 0,
        stationName: '',
        fuelType: '',
        notes: '',
      });
      setReceiptFile(null);
      setReceiptPreview(null);
    }
  }, [fueling, driverId, isOpen]);

  const handleVehicleChange = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    setFormData(prev => ({
      ...prev,
      vehicleId,
      km: vehicle?.currentKm || 0,
      fuelType: vehicle?.fuelType || ''
    }));
  };

  const handlePriceChange = (price: number) => {
    const total = price * (formData.liters || 0);
    setFormData(prev => ({
      ...prev,
      pricePerLiter: price,
      totalValue: Number(total.toFixed(2))
    }));
  };

  const handleLitersChange = (liters: number) => {
    const total = (formData.pricePerLiter || 0) * liters;
    setFormData(prev => ({
      ...prev,
      liters,
      totalValue: Number(total.toFixed(2))
    }));
  };

  const handleTotalChange = (total: number) => {
    const price = total / (formData.liters || 1);
    setFormData(prev => ({
      ...prev,
      totalValue: total,
      pricePerLiter: Number(price.toFixed(2))
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocalização não é suportada pelo seu navegador.');
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }
        }));
        setLocationLoading(false);
      },
      (err) => {
        console.error('Error getting location:', err);
        setError('Não foi possível obter sua localização.');
        setLocationLoading(false);
      }
    );
  };

  const calculateConsumption = async (vehicleId: string, currentKm: number, currentLiters: number) => {
    try {
      const q = query(
        collection(db, 'fueling'),
        where('vehicleId', '==', vehicleId),
        orderBy('km', 'desc'),
        limit(1)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const lastFueling = snap.docs[0].data() as Fueling;
        const kmDiff = currentKm - lastFueling.km;
        if (kmDiff > 0) {
          return Number((kmDiff / currentLiters).toFixed(2));
        }
      }
      return undefined;
    } catch (err) {
      console.error('Error calculating consumption:', err);
      return undefined;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vehicleId || !formData.km || !formData.liters || !formData.totalValue) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let receiptPhoto = formData.receiptPhoto;
      if (receiptFile) {
        receiptPhoto = await uploadFile(receiptFile, `fueling/${formData.vehicleId}/${Date.now()}_receipt.jpg`);
      }

      const consumption = await calculateConsumption(formData.vehicleId!, formData.km!, formData.liters!);

      await onSave({
        ...formData,
        receiptPhoto,
        consumption
      });
      onClose();
    } catch (err) {
      console.error('Error saving fueling:', err);
      setError('Erro ao salvar registro de abastecimento.');
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
        className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-2xl my-auto max-h-[95vh] flex flex-col overflow-hidden"
      >
        <div className="p-4 sm:p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between sticky top-0 bg-white dark:bg-zinc-900 z-10 rounded-t-3xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl flex items-center justify-center">
              <Fuel className="text-emerald-500" size={20} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold dark:text-white">
                {fueling ? 'Editar Abastecimento' : 'Novo Abastecimento'}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Registre os detalhes do abastecimento do veículo.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors text-zinc-500">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400 text-sm">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase ml-1">Veículo</label>
              <select
                required
                value={formData.vehicleId}
                onChange={(e) => handleVehicleChange(e.target.value)}
                className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-white"
              >
                <option value="">Selecione um veículo</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.model} - {v.plate}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase ml-1">Data</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full pl-10 pr-4 p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase ml-1">Quilometragem (KM)</label>
              <div className="relative">
                <Gauge className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.km}
                  onChange={(e) => setFormData({ ...formData, km: Number(e.target.value) })}
                  className="w-full pl-10 pr-4 p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase ml-1">Posto de Combustível</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input
                  type="text"
                  required
                  placeholder="Nome do posto"
                  value={formData.stationName}
                  onChange={(e) => setFormData({ ...formData, stationName: e.target.value })}
                  className="w-full pl-10 pr-4 p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-white"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase ml-1">Litros</label>
              <input
                type="number"
                required
                step="0.01"
                min="0"
                value={formData.liters}
                onChange={(e) => handleLitersChange(Number(e.target.value))}
                className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase ml-1">Preço por Litro</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                <input
                  type="number"
                  required
                  step="0.001"
                  min="0"
                  value={formData.pricePerLiter}
                  onChange={(e) => handlePriceChange(Number(e.target.value))}
                  className="w-full pl-8 pr-4 p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase ml-1">Valor Total</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  value={formData.totalValue}
                  onChange={(e) => handleTotalChange(Number(e.target.value))}
                  className="w-full pl-8 pr-4 p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-white"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase ml-1">Comprovante (Foto)</label>
              <button
                type="button"
                onClick={() => document.getElementById('receipt-upload')?.click()}
                className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1"
              >
                <Camera size={14} />
                {receiptPreview ? 'Alterar Foto' : 'Tirar Foto / Upload'}
              </button>
              <input
                id="receipt-upload"
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {receiptPreview && (
              <div className="relative aspect-video rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-700">
                <img src={receiptPreview} alt="Comprovante" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setReceiptFile(null);
                    setReceiptPreview(null);
                    setFormData({ ...formData, receiptPhoto: undefined });
                  }}
                  className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg shadow-lg hover:bg-red-600 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase ml-1">Localização</label>
              <button
                type="button"
                onClick={getCurrentLocation}
                disabled={locationLoading}
                className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1 disabled:opacity-50"
              >
                {locationLoading ? (
                  <div className="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Navigation size={14} />
                )}
                Obter Localização Atual
              </button>
            </div>
            {formData.location && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/20 rounded-xl flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-xs">
                <MapPinIcon size={14} />
                <span>Localização capturada: {formData.location.latitude.toFixed(6)}, {formData.location.longitude.toFixed(6)}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase ml-1">Observações</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Observações adicionais..."
              className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-white h-24 resize-none"
            />
          </div>

          <div className="pt-6 flex flex-col sm:flex-row gap-3 sticky bottom-0 bg-white dark:bg-zinc-900 pb-2 mt-auto">
            <Button variant="secondary" className="w-full sm:flex-1 order-2 sm:order-1" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button variant="primary" className="w-full sm:flex-1 order-1 sm:order-2" type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Salvar Registro'
              )}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
