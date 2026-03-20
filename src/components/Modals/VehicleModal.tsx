import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Car, Shield, MapPin, Wrench, FileText, Camera, Upload, Trash2, History, Package, Calendar as CalendarIcon, Gauge } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase';
import { Vehicle, Unit, UserHierarchy, Maintenance } from '../../types';
import { Button } from '../UI';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface VehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Vehicle>) => Promise<void>;
  vehicle?: Vehicle | null;
}

type TabType = 'geral' | 'manutencao' | 'acessorios' | 'documentos' | 'historico';

export function VehicleModal({ isOpen, onClose, onSave, vehicle }: VehicleModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('geral');
  const [formData, setFormData] = useState<Partial<Vehicle>>({
    plate: '',
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    color: '',
    fuelType: 'Flex',
    currentKm: 0,
    status: 'active',
    type: 'Sedan',
    category: 'Operacional',
    hierarchyLevel: 'operacional',
    unit: '',
    hasGps: false,
    hasCamera: false,
    photos: [],
    lastMaintenanceKm: 0,
    nextMaintenanceKm: 10000,
    nextMaintenanceDate: '',
    documents: {
      crlv: '',
      insurance: '',
      licensing: ''
    }
  });
  const [units, setUnits] = useState<Unit[]>([]);
  const [maintenanceHistory, setMaintenanceHistory] = useState<Maintenance[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const q = query(collection(db, 'units'), where('status', '==', 'active'));
      const unsubscribe = onSnapshot(q, (snap) => {
        setUnits(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Unit)));
      });
      return () => unsubscribe();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && vehicle?.id) {
      const q = query(
        collection(db, 'maintenance'), 
        where('vehicleId', '==', vehicle.id),
        orderBy('scheduledDate', 'desc')
      );
      const unsubscribe = onSnapshot(q, (snap) => {
        setMaintenanceHistory(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Maintenance)));
      });
      return () => unsubscribe();
    }
  }, [isOpen, vehicle]);

  useEffect(() => {
    if (vehicle) {
      setFormData({
        ...vehicle,
        photos: vehicle.photos || [],
        documents: vehicle.documents || { crlv: '', insurance: '', licensing: '' }
      });
    } else {
      setFormData({
        plate: '',
        brand: '',
        model: '',
        year: new Date().getFullYear(),
        color: '',
        fuelType: 'Flex',
        currentKm: 0,
        status: 'active',
        type: 'Sedan',
        category: 'Operacional',
        hierarchyLevel: 'operacional',
        unit: '',
        hasGps: false,
        hasCamera: false,
        photos: [],
        documents: {
          crlv: '',
          insurance: '',
          licensing: ''
        }
      });
    }
    setActiveTab('geral');
  }, [vehicle, isOpen]);

  if (!isOpen) return null;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Basic file validation
    if (file.size > 5 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 5MB.');
      return;
    }

    setIsUploading(true);
    setError(null);
    try {
      const plate = formData.plate?.trim() || 'temp';
      const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const storageRef = ref(storage, `vehicles/${plate}/${fileName}`);
      
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      
      setFormData(prev => ({
        ...prev,
        photos: [...(prev.photos || []), url]
      }));
    } catch (err: any) {
      console.error('Error uploading photo:', err);
      setError('Erro ao fazer upload da foto. Verifique sua conexão ou permissões.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removePhoto = (url: string) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos?.filter(p => p !== url)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      console.error('Error saving vehicle:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const hierarchies: { value: UserHierarchy; label: string }[] = [
    { value: 'diretoria', label: 'Diretoria' },
    { value: 'gerencia', label: 'Gerência' },
    { value: 'supervisao', label: 'Supervisão' },
    { value: 'operacional', label: 'Operacional' },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Car className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold dark:text-white">{vehicle ? 'Editar Veículo' : 'Novo Veículo'}</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Gerencie as informações detalhadas do veículo</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full transition-colors">
            <X size={20} className="text-zinc-500 dark:text-zinc-400" />
          </button>
        </div>

        {/* Tabs Navigation */}
        <div className="flex items-center gap-2 px-8 pt-4 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
          {[
            { id: 'geral', label: 'Geral', icon: Car },
            { id: 'manutencao', label: 'Manutenção', icon: Wrench },
            { id: 'acessorios', label: 'Fotos e Acessórios', icon: Camera },
            { id: 'documentos', label: 'Documentos', icon: FileText },
            { id: 'historico', label: 'Histórico', icon: History, hidden: !vehicle },
          ].filter(t => !t.hidden).map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${
                activeTab === tab.id 
                  ? 'text-emerald-500 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/5' 
                  : 'text-zinc-400 border-transparent hover:text-zinc-600 dark:hover:text-zinc-200'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-10">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl flex items-start gap-3">
              <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center shrink-0">
                <X className="text-white" size={12} />
              </div>
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {activeTab === 'geral' && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-10"
            >
              {/* Identificação */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-emerald-500">
                  <Shield size={16} />
                  <h3 className="text-xs font-bold uppercase tracking-widest">Identificação</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Placa</label>
                    <input 
                      required
                      value={formData.plate}
                      onChange={e => setFormData({...formData, plate: e.target.value.toUpperCase()})}
                      placeholder="ABC-1234"
                      className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Marca</label>
                    <input 
                      required
                      value={formData.brand}
                      onChange={e => setFormData({...formData, brand: e.target.value})}
                      placeholder="Ex: Toyota"
                      className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Modelo</label>
                    <input 
                      required
                      value={formData.model}
                      onChange={e => setFormData({...formData, model: e.target.value})}
                      placeholder="Ex: Corolla"
                      className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Ano</label>
                    <input 
                      type="number"
                      required
                      value={formData.year}
                      onChange={e => setFormData({...formData, year: parseInt(e.target.value)})}
                      className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Cor</label>
                    <input 
                      required
                      value={formData.color}
                      onChange={e => setFormData({...formData, color: e.target.value})}
                      placeholder="Ex: Prata"
                      className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white"
                    />
                  </div>
                </div>
              </section>

              {/* Especificações */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-emerald-500">
                  <Wrench size={16} />
                  <h3 className="text-xs font-bold uppercase tracking-widest">Especificações</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Tipo</label>
                    <select 
                      value={formData.type}
                      onChange={e => setFormData({...formData, type: e.target.value})}
                      className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white"
                    >
                      <option value="Sedan">Sedan</option>
                      <option value="Carros Populares">Carros Populares</option>
                      <option value="Picape">Picape</option>
                      <option value="SUV">SUV</option>
                      <option value="Van">Van</option>
                      <option value="Caminhão">Caminhão</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Combustível</label>
                    <select 
                      value={formData.fuelType}
                      onChange={e => setFormData({...formData, fuelType: e.target.value})}
                      className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white"
                    >
                      <option value="Flex">Flex</option>
                      <option value="Gasolina">Gasolina</option>
                      <option value="Etanol">Etanol</option>
                      <option value="Diesel">Diesel</option>
                      <option value="Elétrico">Elétrico</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">KM Atual</label>
                    <input 
                      type="number"
                      value={formData.currentKm}
                      onChange={e => setFormData({...formData, currentKm: Number(e.target.value)})}
                      className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white"
                    />
                  </div>
                </div>
              </section>

              {/* Operacional e Classificação */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-emerald-500">
                  <MapPin size={16} />
                  <h3 className="text-xs font-bold uppercase tracking-widest">Operacional e Classificação</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Unidade / Base</label>
                    <select 
                      required
                      value={formData.unit}
                      onChange={e => setFormData({...formData, unit: e.target.value})}
                      className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white"
                    >
                      <option value="">Selecione uma unidade...</option>
                      {units.map(unit => (
                        <option key={unit.id} value={unit.name}>{unit.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Categoria</label>
                    <select 
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value})}
                      className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white"
                    >
                      <option value="Operacional">Operacional</option>
                      <option value="Executivo">Executivo</option>
                      <option value="Diretoria">Diretoria</option>
                      <option value="Utilitário">Utilitário</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Nível Hierárquico</label>
                    <select 
                      value={formData.hierarchyLevel}
                      onChange={e => setFormData({...formData, hierarchyLevel: e.target.value as UserHierarchy})}
                      className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white"
                    >
                      {hierarchies.map(h => (
                        <option key={h.value} value={h.value}>{h.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Status</label>
                    <select 
                      value={formData.status}
                      onChange={e => setFormData({...formData, status: e.target.value as any})}
                      className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white"
                    >
                      <option value="active">Ativo</option>
                      <option value="maintenance">Manutenção</option>
                      <option value="inactive">Inativo</option>
                      <option value="reserved">Reservado</option>
                    </select>
                  </div>
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'manutencao' && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-10"
            >
              {/* Manutenção Preventiva */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-emerald-500">
                  <Wrench size={16} />
                  <h3 className="text-xs font-bold uppercase tracking-widest">Manutenção Preventiva</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Última Manutenção (KM)</label>
                    <input 
                      type="number"
                      value={formData.lastMaintenanceKm}
                      onChange={e => setFormData({...formData, lastMaintenanceKm: Number(e.target.value)})}
                      className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Próxima Manutenção (KM)</label>
                    <input 
                      type="number"
                      value={formData.nextMaintenanceKm}
                      onChange={e => setFormData({...formData, nextMaintenanceKm: Number(e.target.value)})}
                      className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Próxima Manutenção (Data)</label>
                    <input 
                      type="date"
                      value={formData.nextMaintenanceDate}
                      onChange={e => setFormData({...formData, nextMaintenanceDate: e.target.value})}
                      className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white"
                    />
                  </div>
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'acessorios' && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-10"
            >
              {/* Acessórios */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 text-emerald-500">
                  <Shield size={16} />
                  <h3 className="text-xs font-bold uppercase tracking-widest">Acessórios</h3>
                </div>
                <div className="flex flex-wrap gap-6 pt-2">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-10 h-6 rounded-full transition-colors relative ${formData.hasGps ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.hasGps ? 'left-5' : 'left-1'}`} />
                    </div>
                    <input 
                      type="checkbox" 
                      className="hidden" 
                      checked={formData.hasGps}
                      onChange={e => setFormData({...formData, hasGps: e.target.checked})}
                    />
                    <span className="text-sm font-medium dark:text-white">Possui GPS</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={`w-10 h-6 rounded-full transition-colors relative ${formData.hasCamera ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.hasCamera ? 'left-5' : 'left-1'}`} />
                    </div>
                    <input 
                      type="checkbox" 
                      className="hidden" 
                      checked={formData.hasCamera}
                      onChange={e => setFormData({...formData, hasCamera: e.target.checked})}
                    />
                    <span className="text-sm font-medium dark:text-white">Possui Câmera</span>
                  </label>
                </div>
              </section>

              {/* Fotos do Veículo */}
              <section className="space-y-6">
                <div className="flex items-center gap-2 text-emerald-500">
                  <Camera size={16} />
                  <h3 className="text-xs font-bold uppercase tracking-widest">Fotos do Veículo</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-4">
                    {formData.photos?.map((url, index) => (
                      <div key={index} className="relative group w-32 h-32 rounded-2xl overflow-hidden border-2 border-zinc-100 dark:border-zinc-800 shadow-sm">
                        <img src={url} alt={`Veículo ${index + 1}`} className="w-full h-full object-cover" />
                        <button 
                          type="button"
                          onClick={() => removePhoto(url)}
                          className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="w-32 h-32 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center gap-2 text-zinc-400 hover:text-emerald-500 hover:border-emerald-500 transition-all bg-zinc-50 dark:bg-zinc-900/50"
                    >
                      {isUploading ? (
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-emerald-500 border-t-transparent" />
                      ) : (
                        <>
                          <Upload size={24} />
                          <span className="text-[10px] font-bold uppercase tracking-tighter">Upload</span>
                        </>
                      )}
                    </button>
                    <input 
                      type="file"
                      ref={fileInputRef}
                      onChange={handlePhotoUpload}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'documentos' && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-10"
            >
              {/* Documentação */}
              <section className="space-y-6">
                <div className="flex items-center gap-2 text-emerald-500">
                  <FileText size={16} />
                  <h3 className="text-xs font-bold uppercase tracking-widest">Documentação</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Número CRLV</label>
                    <input 
                      value={formData.documents?.crlv}
                      onChange={e => setFormData({...formData, documents: { ...formData.documents, crlv: e.target.value }})}
                      placeholder="00000000000"
                      className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Vencimento Seguro</label>
                    <input 
                      type="date"
                      value={formData.documents?.insurance}
                      onChange={e => setFormData({...formData, documents: { ...formData.documents, insurance: e.target.value }})}
                      className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Vencimento Licenciamento</label>
                    <input 
                      type="date"
                      value={formData.documents?.licensing}
                      onChange={e => setFormData({...formData, documents: { ...formData.documents, licensing: e.target.value }})}
                      className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white"
                    />
                  </div>
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'historico' && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              <div className="flex items-center gap-2 text-emerald-500">
                <History size={16} />
                <h3 className="text-xs font-bold uppercase tracking-widest">Histórico de Manutenções e Peças</h3>
              </div>

              {maintenanceHistory.length === 0 ? (
                <div className="py-12 text-center bg-zinc-50 dark:bg-zinc-800/50 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800">
                  <Wrench className="mx-auto text-zinc-300 dark:text-zinc-700 mb-4" size={32} />
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Nenhum histórico de manutenção encontrado.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {maintenanceHistory.map((m) => (
                    <div key={m.id} className="bg-white dark:bg-zinc-800 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-700 shadow-sm">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">{m.type}</span>
                            <span className="text-zinc-300 dark:text-zinc-700">•</span>
                            <span className="text-xs text-zinc-500 dark:text-zinc-400">{format(parseISO(m.scheduledDate), "d 'de' MMM, yyyy", { locale: ptBR })}</span>
                          </div>
                          <h4 className="font-bold dark:text-white">{m.description}</h4>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold dark:text-white">R$ {m.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          <p className="text-[10px] text-zinc-500 dark:text-zinc-400">{m.kmAtMaintenance} KM</p>
                        </div>
                      </div>

                      {m.parts && m.parts.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-zinc-50 dark:border-zinc-700">
                          <div className="flex items-center gap-2 mb-3 text-zinc-500 dark:text-zinc-400">
                            <Package size={14} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Peças Substituídas</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {m.parts.map((part, idx) => (
                              <div key={idx} className="flex justify-between items-center p-2 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg text-xs">
                                <span className="dark:text-zinc-300">{part.name}</span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">x{part.quantity}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </form>

        <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-bold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <Button 
            onClick={handleSubmit}
            disabled={isSaving || isUploading}
            variant="primary"
          >
            {isSaving ? 'Salvando...' : 'Salvar Veículo'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
