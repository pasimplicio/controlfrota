import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Calendar, Wrench, AlertCircle, DollarSign, Gauge, Hash, Flag, Building2, Plus, Trash2, FileText, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../UI';
import { Vehicle, Maintenance, Workshop, MaintenancePart, MaintenanceBudget } from '../../types';
import { format } from 'date-fns';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import * as storageService from '../../services/storageService';

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
  const [status, setStatus] = useState<Maintenance['status']>(maintenance?.status || 'pending');
  const [priority, setPriority] = useState<Maintenance['priority']>(maintenance?.priority || 'medium');
  const [osNumber, setOsNumber] = useState(maintenance?.osNumber || '');
  const [description, setDescription] = useState(maintenance?.description || '');
  const [scheduledDate, setScheduledDate] = useState(maintenance?.scheduledDate || format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [cost, setCost] = useState(maintenance?.cost || 0);
  const [kmAtMaintenance, setKmAtMaintenance] = useState(maintenance?.kmAtMaintenance || 0);
  const [nextMaintenanceKm, setNextMaintenanceKm] = useState(maintenance?.nextMaintenanceKm || 0);
  const [nextMaintenanceDate, setNextMaintenanceDate] = useState(maintenance?.nextMaintenanceDate || '');
  const [workshopId, setWorkshopId] = useState(maintenance?.workshopId || '');
  const [notes, setNotes] = useState(maintenance?.notes || '');
  const [parts, setParts] = useState<MaintenancePart[]>(maintenance?.parts || []);
  const [budgets, setBudgets] = useState<MaintenanceBudget[]>(maintenance?.budgets || []);
  const [documents, setDocuments] = useState<Maintenance['documents']>(maintenance?.documents || []);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const q = query(collection(db, 'workshops'), orderBy('name', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setWorkshops(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Workshop)));
    });
    return unsub;
  }, [isOpen]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'os' | 'invoice' | 'other') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await storageService.uploadFile(file, `maintenance/${vehicleId}/${Date.now()}_${file.name}`);
      setDocuments(prev => [...prev, { name: file.name, url, type, uploadedAt: new Date().toISOString() }]);
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setUploading(false);
    }
  };

  const addPart = () => {
    setParts(prev => [...prev, { id: crypto.randomUUID(), name: '', quantity: 1, unitPrice: 0, totalPrice: 0 }]);
  };

  const updatePart = (id: string, field: keyof MaintenancePart, value: any) => {
    setParts(prev => prev.map(p => {
      if (p.id === id) {
        const updated = { ...p, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          updated.totalPrice = updated.quantity * updated.unitPrice;
        }
        return updated;
      }
      return p;
    }));
  };

  const removePart = (id: string) => {
    setParts(prev => prev.filter(p => p.id !== id));
  };

  const addBudget = () => {
    setBudgets(prev => [...prev, {
      id: crypto.randomUUID(),
      workshopId: '',
      value: 0,
      description: '',
      status: 'pending',
      createdAt: new Date().toISOString()
    }]);
  };

  const updateBudget = (id: string, field: keyof MaintenanceBudget, value: any) => {
    setBudgets(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
  };

  const removeBudget = (id: string) => {
    setBudgets(prev => prev.filter(b => b.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId) return;
    setIsSubmitting(true);
    try {
      await onSave({
        vehicleId,
        type,
        status,
        priority,
        osNumber,
        description,
        scheduledDate,
        cost: parts.reduce((acc, p) => acc + p.totalPrice, 0) || cost,
        kmAtMaintenance,
        nextMaintenanceKm: nextMaintenanceKm || undefined,
        nextMaintenanceDate: nextMaintenanceDate || undefined,
        workshopId,
        notes,
        parts,
        budgets,
        documents
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
        className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-3xl my-auto max-h-[95vh] flex flex-col overflow-hidden"
      >
        <div className="p-4 sm:p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
          <h2 className="text-lg sm:text-xl font-bold dark:text-white">
            {maintenance ? 'Editar Manutenção' : 'Abertura de OS / Manutenção'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
            <X size={20} className="text-zinc-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1">
          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
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
                className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-white text-sm"
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
                className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-white text-sm"
              >
                <option value="preventive">Preventiva</option>
                <option value="corrective">Corretiva</option>
                <option value="cleaning">Limpeza</option>
                <option value="other">Outro</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase ml-1">Prioridade</label>
              <div className="flex gap-2">
                {(['low', 'medium', 'high', 'urgent'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase transition-all border ${
                      priority === p 
                        ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                        : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-500'
                    }`}
                  >
                    {p === 'low' ? 'Baixa' : p === 'medium' ? 'Média' : p === 'high' ? 'Alta' : 'Urgente'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase ml-1">Status</label>
              <select 
                required
                value={status}
                onChange={(e) => setStatus(e.target.value as Maintenance['status'])}
                className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-white text-sm"
              >
                <option value="pending">Pendente (Aguardando)</option>
                <option value="scheduled">Agendada</option>
                <option value="in-progress">Em Execução</option>
                <option value="waiting-parts">Aguardando Peças</option>
                <option value="waiting-approval">Aguardando Aprovação</option>
                <option value="completed">Concluída</option>
                <option value="cancelled">Cancelada</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase ml-1">Número da OS</label>
              <div className="relative">
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input 
                  type="text"
                  value={osNumber}
                  onChange={(e) => setOsNumber(e.target.value)}
                  placeholder="Ex: OS-2024-001"
                  className="w-full p-3 pl-12 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-white text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase ml-1">Oficina / Prestador</label>
              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <select 
                  value={workshopId}
                  onChange={(e) => setWorkshopId(e.target.value)}
                  className="w-full p-3 pl-12 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-white text-sm"
                >
                  <option value="">Selecione uma oficina</option>
                  {workshops.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {type === 'preventive' && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-500/5 rounded-2xl border border-emerald-100 dark:border-emerald-500/20 space-y-4">
              <h3 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                <Calendar size={14} />
                Planejamento da Próxima Revisão
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase ml-1">Próxima Revisão (KM)</label>
                  <div className="relative">
                    <Gauge className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                    <input 
                      type="number"
                      value={nextMaintenanceKm}
                      onChange={(e) => setNextMaintenanceKm(Number(e.target.value))}
                      placeholder="Ex: 50000"
                      className="w-full p-3 pl-12 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-white font-mono text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase ml-1">Próxima Revisão (Data)</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                    <input 
                      type="date"
                      value={nextMaintenanceDate}
                      onChange={(e) => setNextMaintenanceDate(e.target.value)}
                      className="w-full p-3 pl-12 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-white text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase ml-1">Descrição do Problema / Serviço</label>
            <textarea 
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o problema ou o serviço a ser realizado..."
              className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-white resize-none text-sm"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase ml-1">Data Agendada</label>
              <input 
                type="datetime-local"
                required
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-white text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase ml-1">KM Atual / Previsto</label>
              <div className="relative">
                <Gauge className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input 
                  type="number"
                  required
                  value={kmAtMaintenance}
                  onChange={(e) => setKmAtMaintenance(Number(e.target.value))}
                  className="w-full p-3 pl-12 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-white font-mono text-sm"
                />
              </div>
            </div>
          </div>

          {/* Parts Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase ml-1">Peças e Materiais</label>
              <button 
                type="button"
                onClick={addPart}
                className="text-xs font-bold text-emerald-500 flex items-center gap-1 hover:underline"
              >
                <Plus size={14} /> Adicionar Peça
              </button>
            </div>
            
            <div className="space-y-3">
              {parts.map((part) => (
                <div key={part.id} className="grid grid-cols-12 gap-2 items-end bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                  <div className="col-span-12 sm:col-span-5 space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase">Nome da Peça</label>
                    <input 
                      value={part.name}
                      onChange={(e) => updatePart(part.id, 'name', e.target.value)}
                      className="w-full p-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs outline-none dark:text-white"
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase">Qtd</label>
                    <input 
                      type="number"
                      value={part.quantity}
                      onChange={(e) => updatePart(part.id, 'quantity', Number(e.target.value))}
                      className="w-full p-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs outline-none dark:text-white"
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase">V. Unit</label>
                    <input 
                      type="number"
                      value={part.unitPrice}
                      onChange={(e) => updatePart(part.id, 'unitPrice', Number(e.target.value))}
                      className="w-full p-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs outline-none dark:text-white"
                    />
                  </div>
                  <div className="col-span-3 sm:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase">Total</label>
                    <div className="p-2 text-xs font-bold dark:text-white">
                      R$ {part.totalPrice.toFixed(2)}
                    </div>
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button 
                      type="button"
                      onClick={() => removePart(part.id)}
                      className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {parts.length > 0 && (
                <div className="flex justify-end p-2">
                  <span className="text-sm font-bold dark:text-white">
                    Total em Peças: R$ {parts.reduce((acc, p) => acc + p.totalPrice, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Budgets Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase ml-1">Orçamentos e Cotações</label>
              <button 
                type="button"
                onClick={addBudget}
                className="text-xs font-bold text-blue-500 flex items-center gap-1 hover:underline"
              >
                <Plus size={14} /> Adicionar Orçamento
              </button>
            </div>
            
            <div className="space-y-3">
              {budgets.map((budget) => (
                <div key={budget.id} className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase">Oficina</label>
                      <select 
                        value={budget.workshopId}
                        onChange={(e) => updateBudget(budget.id, 'workshopId', e.target.value)}
                        className="w-full p-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs outline-none dark:text-white"
                      >
                        <option value="">Selecione a oficina</option>
                        {workshops.map(w => (
                          <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase">Valor (R$)</label>
                      <input 
                        type="number"
                        value={budget.value}
                        onChange={(e) => updateBudget(budget.id, 'value', Number(e.target.value))}
                        className="w-full p-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs outline-none dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase">Descrição / Itens</label>
                    <textarea 
                      value={budget.description}
                      onChange={(e) => updateBudget(budget.id, 'description', e.target.value)}
                      className="w-full p-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs outline-none dark:text-white resize-none"
                      rows={2}
                    />
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex gap-2">
                      {(['pending', 'approved', 'rejected'] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => {
                            updateBudget(budget.id, 'status', s);
                            if (s === 'approved') {
                              setWorkshopId(budget.workshopId);
                              setCost(budget.value);
                            }
                          }}
                          className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                            budget.status === s 
                              ? s === 'approved' ? 'bg-emerald-500 text-white' : s === 'rejected' ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'
                              : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500'
                          }`}
                        >
                          {s === 'pending' ? 'Pendente' : s === 'approved' ? 'Aprovado' : 'Recusado'}
                        </button>
                      ))}
                    </div>
                    <button 
                      type="button"
                      onClick={() => removeBudget(budget.id)}
                      className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Documents Section */}
          <div className="space-y-4">
            <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase ml-1">Documentos e Anexos</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(['os', 'invoice', 'other'] as const).map((docType) => (
                <div key={docType} className="relative">
                  <input 
                    type="file"
                    id={`file-${docType}`}
                    className="hidden"
                    onChange={(e) => handleFileUpload(e, docType)}
                    disabled={uploading}
                  />
                  <label 
                    htmlFor={`file-${docType}`}
                    className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/5 transition-all cursor-pointer group"
                  >
                    <Upload size={20} className="text-zinc-400 group-hover:text-emerald-500 mb-2" />
                    <span className="text-[10px] font-bold uppercase text-zinc-500 group-hover:text-emerald-600">
                      {docType === 'os' ? 'Anexar OS' : docType === 'invoice' ? 'Anexar NF' : 'Outros'}
                    </span>
                  </label>
                </div>
              ))}
            </div>

            {documents.length > 0 && (
              <div className="space-y-2">
                {documents.map((doc, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-100 dark:border-zinc-700">
                    <div className="flex items-center gap-3">
                      <FileText size={18} className="text-emerald-500" />
                      <div>
                        <p className="text-xs font-bold dark:text-white line-clamp-1">{doc.name}</p>
                        <p className="text-[10px] text-zinc-500 uppercase">{doc.type}</p>
                      </div>
                    </div>
                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="p-2 text-zinc-400 hover:text-emerald-500 transition-colors">
                      <FileText size={16} />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase ml-1">Observações Internas</label>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalhes adicionais, histórico de aprovação..."
              className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-white resize-none text-sm"
              rows={3}
            />
          </div>

          <div className="pt-4 flex flex-col sm:flex-row gap-3 sticky bottom-0 bg-white dark:bg-zinc-900 mt-auto pb-2">
            <Button variant="secondary" className="w-full sm:flex-1 order-2 sm:order-1" onClick={onClose} disabled={isSubmitting || uploading}>
              Cancelar
            </Button>
            <Button variant="primary" className="w-full sm:flex-1 order-1 sm:order-2" type="submit" disabled={isSubmitting || uploading}>
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  {maintenance ? 'Salvar Alterações' : 'Abrir Ordem de Serviço'}
                </>
              )}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
