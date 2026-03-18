import React, { useState, useEffect } from 'react';
import { X, MapPin, Building2, User as UserIcon, Wallet, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { Unit, UserProfile } from '../../types';
import { Button } from '../UI';

interface UnitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Unit>) => Promise<void>;
  unit?: Unit | null;
}

export function UnitModal({ isOpen, onClose, onSave, unit }: UnitModalProps) {
  const [formData, setFormData] = useState<Partial<Unit>>({
    name: '',
    address: '',
    city: '',
    state: '',
    costCenter: '',
    managerId: '',
    departments: [],
    status: 'active'
  });
  const [managers, setManagers] = useState<UserProfile[]>([]);
  const [deptInput, setDeptInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const q = query(collection(db, 'users'), where('role', 'in', ['admin', 'manager']));
      const unsubscribe = onSnapshot(q, (snap) => {
        setManagers(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
      });
      return () => unsubscribe();
    }
  }, [isOpen]);

  useEffect(() => {
    if (unit) {
      setFormData({
        ...unit,
        departments: unit.departments || []
      });
    } else {
      setFormData({
        name: '',
        address: '',
        city: '',
        state: '',
        costCenter: '',
        managerId: '',
        departments: [],
        status: 'active'
      });
    }
  }, [unit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      console.error('Error saving unit:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const addDepartment = () => {
    if (deptInput.trim() && !formData.departments?.includes(deptInput.trim())) {
      setFormData({
        ...formData,
        departments: [...(formData.departments || []), deptInput.trim()]
      });
      setDeptInput('');
    }
  };

  const removeDepartment = (dept: string) => {
    setFormData({
      ...formData,
      departments: formData.departments?.filter(d => d !== dept)
    });
  };

  return (
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
              <Building2 className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold dark:text-white">{unit ? 'Editar Unidade' : 'Nova Unidade'}</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Gerencie as bases operacionais e departamentos</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full transition-colors">
            <X size={20} className="text-zinc-500 dark:text-zinc-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8">
          {/* Identificação e Localização */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-500">
              <MapPin size={16} />
              <h3 className="text-xs font-bold uppercase tracking-widest">Identificação e Localização</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Nome da Unidade / Base</label>
                <input 
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="Ex: Matriz - São Paulo"
                  className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white"
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Endereço Completo</label>
                <input 
                  required
                  value={formData.address}
                  onChange={e => setFormData({...formData, address: e.target.value})}
                  placeholder="Rua, número, bairro..."
                  className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Cidade</label>
                <input 
                  required
                  value={formData.city}
                  onChange={e => setFormData({...formData, city: e.target.value})}
                  placeholder="Ex: São Paulo"
                  className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Estado (UF)</label>
                <input 
                  required
                  maxLength={2}
                  value={formData.state}
                  onChange={e => setFormData({...formData, state: e.target.value.toUpperCase()})}
                  placeholder="Ex: SP"
                  className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white"
                />
              </div>
            </div>
          </section>

          {/* Estrutura e Responsáveis */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-500">
              <Wallet size={16} />
              <h3 className="text-xs font-bold uppercase tracking-widest">Estrutura e Responsáveis</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Centro de Custo</label>
                <input 
                  value={formData.costCenter}
                  onChange={e => setFormData({...formData, costCenter: e.target.value})}
                  placeholder="Ex: 10.20.30"
                  className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Gestor Responsável</label>
                <select 
                  value={formData.managerId}
                  onChange={e => setFormData({...formData, managerId: e.target.value})}
                  className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white"
                >
                  <option value="">Selecione um gestor...</option>
                  {managers.map(m => (
                    <option key={m.uid} value={m.uid}>{m.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Departamentos */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-500">
              <Layers size={16} />
              <h3 className="text-xs font-bold uppercase tracking-widest">Departamentos</h3>
            </div>
            <div className="space-y-3">
              <div className="flex gap-2">
                <input 
                  value={deptInput}
                  onChange={e => setDeptInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addDepartment())}
                  placeholder="Adicionar departamento (ex: Logística)"
                  className="flex-1 bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white"
                />
                <Button type="button" onClick={addDepartment} variant="secondary">
                  Adicionar
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.departments?.map(dept => (
                  <span 
                    key={dept}
                    className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-lg border border-emerald-100 dark:border-emerald-500/20"
                  >
                    {dept}
                    <button type="button" onClick={() => removeDepartment(dept)} className="hover:text-emerald-800 dark:hover:text-emerald-200">
                      <X size={12} />
                    </button>
                  </span>
                ))}
                {(!formData.departments || formData.departments.length === 0) && (
                  <p className="text-xs text-zinc-500 italic">Nenhum departamento adicionado.</p>
                )}
              </div>
            </div>
          </section>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Status</label>
            <select 
              value={formData.status}
              onChange={e => setFormData({...formData, status: e.target.value as any})}
              className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white"
            >
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
            </select>
          </div>
        </form>

        <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 flex justify-end gap-3">
          <button 
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-bold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <Button 
            onClick={handleSubmit}
            disabled={isSaving}
            variant="primary"
          >
            {isSaving ? 'Salvando...' : 'Salvar Unidade'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
