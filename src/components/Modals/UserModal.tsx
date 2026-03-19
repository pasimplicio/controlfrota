import React, { useState, useEffect } from 'react';
import { X, User as UserIcon, Shield, MapPin, Briefcase } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { UserProfile, UserRole, UserHierarchy, Unit } from '../../types';
import { Button } from '../UI';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<UserProfile & { password?: string }>) => Promise<void>;
  userProfile?: UserProfile | null;
}

export function UserModal({ isOpen, onClose, onSave, userProfile }: UserModalProps) {
  const [formData, setFormData] = useState<Partial<UserProfile & { password?: string }>>({
    name: '',
    email: '',
    password: '',
    role: 'pending',
    hierarchy: 'none',
    unit: '',
    status: 'pending'
  });
  const [units, setUnits] = useState<Unit[]>([]);
  const [isSaving, setIsSaving] = useState(false);

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
    if (userProfile) {
      setFormData({ ...userProfile, password: '' });
    } else {
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'pending',
        hierarchy: 'none',
        unit: '',
        status: 'pending'
      });
    }
  }, [userProfile, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      console.error('Error saving user:', err);
    } finally {
      setIsSaving(false);
    }
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
              <UserIcon className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold dark:text-white">{userProfile ? 'Editar Usuário' : 'Novo Usuário'}</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Gerencie as permissões e dados do colaborador</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full transition-colors">
            <X size={20} className="text-zinc-500 dark:text-zinc-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8">
          {/* Dados Pessoais */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-500">
              <UserIcon size={16} />
              <h3 className="text-xs font-bold uppercase tracking-widest">Dados Pessoais</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Nome Completo</label>
                <input 
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="Ex: João Silva"
                  className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">E-mail</label>
                <input 
                  required
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  placeholder="joao@empresa.com"
                  className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white"
                />
              </div>
              {!userProfile && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Senha de Acesso</label>
                  <input 
                    required={!userProfile}
                    type="password"
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    placeholder="••••••••"
                    className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white"
                  />
                </div>
              )}
            </div>
          </section>

          {/* Acesso e Permissões */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-500">
              <Shield size={16} />
              <h3 className="text-xs font-bold uppercase tracking-widest">Acesso e Permissões</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Perfil de Acesso</label>
                <select 
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
                  className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white"
                >
                  <option value="pending">Pendente</option>
                  <option value="driver">Motorista</option>
                  <option value="manager">Gestor</option>
                  <option value="admin">Administrador</option>
                  <option value="finance">Financeiro</option>
                  <option value="maintenance">Manutenção</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Hierarquia</label>
                <select 
                  value={formData.hierarchy}
                  onChange={e => setFormData({...formData, hierarchy: e.target.value as UserHierarchy})}
                  className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 transition-all dark:text-white"
                >
                  <option value="none">Nenhuma</option>
                  <option value="operacional">Operacional</option>
                  <option value="supervisao">Supervisão</option>
                  <option value="gerencia">Gerência</option>
                  <option value="diretoria">Diretoria</option>
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
                  <option value="pending">Pendente</option>
                  <option value="blocked">Bloqueado</option>
                </select>
              </div>
            </div>
          </section>

          {/* Localização */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-500">
              <MapPin size={16} />
              <h3 className="text-xs font-bold uppercase tracking-widest">Localização</h3>
            </div>
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
          </section>
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
            disabled={isSaving}
            variant="primary"
          >
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
