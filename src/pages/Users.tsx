import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc,
  query,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  Users as UsersIcon, 
  Search, 
  UserPlus, 
  MoreVertical, 
  Shield, 
  Trash2, 
  Edit2,
  Filter,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, UserRole, UserHierarchy } from '../types';
import { Card, StatusBadge, Button } from '../components/UI';
import { UserModal } from '../components/Modals/UserModal';
import { useAuth } from '../context/AuthContext';
import { ConfirmModal } from '../components/Modals/ConfirmModal';
import { registerUserAuth } from '../services/authService';
import { setDoc } from 'firebase/firestore';

import { handleFirestoreError, OperationType } from '../services/errorService';

export function Users() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'primary';
    isAlert?: boolean;
  } | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const uData = snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      setUsers(uData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'users');
    });
    return () => unsubscribe();
  }, []);

  const handleUpdateRole = async (uid: string, role: UserRole) => {
    try {
      await updateDoc(doc(db, 'users', uid), { 
        role,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
    }
  };

  const handleUpdateHierarchy = async (uid: string, hierarchy: UserHierarchy) => {
    try {
      await updateDoc(doc(db, 'users', uid), { 
        hierarchy,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
    }
  };

  const handleUpdateStatus = async (uid: string, status: string) => {
    try {
      await updateDoc(doc(db, 'users', uid), { 
        status,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
    }
  };

  const handleDeleteUser = async (uid: string) => {
    setConfirmConfig({
      title: 'Excluir Usuário',
      message: 'Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'users', uid));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `users/${uid}`);
          setConfirmConfig({
            title: 'Erro',
            message: 'Erro ao excluir usuário. Verifique suas permissões.',
            variant: 'danger',
            isAlert: true,
            onConfirm: () => {}
          });
        }
      }
    });
  };

  const handleSaveUser = async (data: Partial<UserProfile & { password?: string }>) => {
    try {
      const { password, ...profileData } = data;

      if (!editingUser) {
        // Check for duplicates
        const duplicateEmail = users.find(u => u.email.toLowerCase() === data.email?.toLowerCase());
        if (duplicateEmail) {
          setConfirmConfig({
            title: 'E-mail Duplicado',
            message: 'Este e-mail já está cadastrado.',
            variant: 'danger',
            isAlert: true,
            onConfirm: () => {}
          });
          return;
        }

        if (data.cpf) {
          const duplicateCpf = users.find(u => u.cpf?.replace(/\D/g, '') === data.cpf?.replace(/\D/g, ''));
          if (duplicateCpf) {
            setConfirmConfig({
              title: 'CPF Duplicado',
              message: 'Este CPF já está cadastrado.',
              variant: 'danger',
              isAlert: true,
              onConfirm: () => {}
            });
            return;
          }
        }

        // Register in Firebase Auth first
        if (!password) {
          throw new Error('Senha é obrigatória para novos usuários.');
        }

        const uid = await registerUserAuth(data.email!, password);
        
        // Create Firestore document
        try {
          await setDoc(doc(db, 'users', uid), {
            ...profileData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `users/${uid}`);
          throw err;
        }
      } else {
        try {
          await updateDoc(doc(db, 'users', editingUser.uid), {
            ...profileData,
            updatedAt: serverTimestamp()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `users/${editingUser.uid}`);
          throw err;
        }
      }
    } catch (err: any) {
      console.error('Error saving user:', err);
      setConfirmConfig({
        title: 'Erro ao Salvar',
        message: err.message || 'Ocorreu um erro ao salvar o usuário.',
        variant: 'danger',
        isAlert: true,
        onConfirm: () => {}
      });
      throw err;
    }
  };

  const openEditModal = (user: UserProfile) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const openNewModal = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    pending: users.filter(u => u.status === 'pending').length,
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Gestão de Usuários</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Controle de acesso, perfis e hierarquia da equipe.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input 
              type="text"
              placeholder="Buscar por nome ou e-mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-white w-full md:w-64"
            />
          </div>
          <Button variant="primary" onClick={openNewModal}>
            <UserPlus size={18} />
            Novo Usuário
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-emerald-500 border-none text-white">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-widest mb-1">Total de Usuários</p>
              <h3 className="text-3xl font-bold">{stats.total}</h3>
            </div>
            <UsersIcon className="text-emerald-400/50" size={32} />
          </div>
        </Card>
        <Card className="bg-white dark:bg-zinc-900">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-1">Usuários Ativos</p>
              <h3 className="text-3xl font-bold dark:text-white">{stats.active}</h3>
            </div>
            <CheckCircle2 className="text-emerald-500" size={32} />
          </div>
        </Card>
        <Card className="bg-white dark:bg-zinc-900">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-1">Aguardando Aprovação</p>
              <h3 className="text-3xl font-bold dark:text-white">{stats.pending}</h3>
            </div>
            <Clock className="text-amber-500" size={32} />
          </div>
        </Card>
      </div>

      {/* Users Table */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800/50 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                <th className="px-6 py-4">Usuário</th>
                <th className="px-6 py-4">Perfil / Hierarquia</th>
                <th className="px-6 py-4">Unidade</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              <AnimatePresence mode="popLayout">
                {filteredUsers.map((user) => (
                  <motion.tr 
                    key={user.uid}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 font-bold border border-zinc-200 dark:border-zinc-700">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold dark:text-white">{user.name}</p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <select 
                          value={user.role}
                          disabled={profile?.role !== 'admin'}
                          onChange={(e) => handleUpdateRole(user.uid, e.target.value as UserRole)}
                          className="text-xs bg-zinc-100 dark:bg-zinc-800 border-none rounded-lg px-2 py-1 focus:ring-1 focus:ring-emerald-500 dark:text-white outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="pending">Pendente</option>
                          <option value="driver">Motorista</option>
                          <option value="manager">Gestor</option>
                          <option value="admin">Administrador</option>
                          <option value="finance">Financeiro</option>
                          <option value="maintenance">Manutenção</option>
                        </select>
                        <div className="flex items-center gap-1">
                          <Shield size={10} className="text-zinc-400" />
                          <select 
                            value={user.hierarchy}
                            disabled={profile?.role !== 'admin'}
                            onChange={(e) => handleUpdateHierarchy(user.uid, e.target.value as UserHierarchy)}
                            className="text-[10px] bg-transparent border-none p-0 focus:ring-0 text-zinc-500 dark:text-zinc-400 outline-none cursor-pointer uppercase font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <option value="none">Nenhuma</option>
                            <option value="operacional">Operacional</option>
                            <option value="supervisao">Supervisão</option>
                            <option value="gerencia">Gerência</option>
                            <option value="diretoria">Diretoria</option>
                          </select>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-zinc-600 dark:text-zinc-400">{user.unit || '---'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <select 
                        value={user.status}
                        disabled={profile?.role !== 'admin'}
                        onChange={(e) => handleUpdateStatus(user.uid, e.target.value)}
                        className="text-[10px] font-bold uppercase tracking-wider bg-transparent border-none p-0 focus:ring-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="active" className="text-emerald-500">Ativo</option>
                        <option value="pending" className="text-amber-500">Pendente</option>
                        <option value="blocked" className="text-red-500">Bloqueado</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 transition-opacity">
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(user);
                          }}
                          className="p-2 text-zinc-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteUser(user.uid);
                          }}
                          className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </Card>

      <UserModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveUser}
        userProfile={editingUser}
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
    </div>
  );
}
