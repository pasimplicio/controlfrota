import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  addDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  Building2, 
  Search, 
  Plus, 
  Trash2, 
  Edit2,
  MapPin,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Unit } from '../types';
import { Card, StatusBadge, Button } from '../components/UI';
import { UnitModal } from '../components/Modals/UnitModal';
import { ConfirmModal } from '../components/Modals/ConfirmModal';

import { handleFirestoreError, OperationType } from '../services/errorService';

export function Units() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'primary';
    isAlert?: boolean;
  } | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'units'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const uData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Unit));
      setUnits(uData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'units');
    });
    return () => unsubscribe();
  }, []);

  const handleSaveUnit = async (data: Partial<Unit>) => {
    try {
      // Check for duplicates
      if (!editingUnit) {
        const duplicateName = units.find(u => u.name.trim().toLowerCase() === data.name?.trim().toLowerCase());
        if (duplicateName) {
          setConfirmConfig({
            title: 'Unidade Duplicada',
            message: 'Esta unidade já está cadastrada.',
            variant: 'danger',
            isAlert: true,
            onConfirm: () => {}
          });
          return;
        }
      }

      if (editingUnit) {
        await updateDoc(doc(db, 'units', editingUnit.id), {
          ...data,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'units'), {
          ...data,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    } catch (err) {
      console.error('Error saving unit:', err);
      throw err;
    }
  };

  const handleDeleteUnit = async (id: string) => {
    setConfirmConfig({
      title: 'Excluir Unidade',
      message: 'Tem certeza que deseja excluir esta unidade? Esta ação não pode ser desfeita.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'units', id));
        } catch (err) {
          console.error('Error deleting unit:', err);
          setConfirmConfig({
            title: 'Erro',
            message: 'Erro ao excluir unidade. Verifique suas permissões.',
            variant: 'danger',
            isAlert: true,
            onConfirm: () => {}
          });
        }
      }
    });
  };

  const openEditModal = (unit: Unit) => {
    setEditingUnit(unit);
    setIsModalOpen(true);
  };

  const openNewModal = () => {
    setEditingUnit(null);
    setIsModalOpen(true);
  };

  const filteredUnits = units.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Unidades e Bases</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Gerencie as bases operacionais e pontos de apoio.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input 
              type="text"
              placeholder="Buscar por nome ou cidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-white w-full md:w-64"
            />
          </div>
          <Button variant="primary" onClick={openNewModal}>
            <Plus size={18} />
            Nova Unidade
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredUnits.map((unit) => (
            <motion.div
              key={unit.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <Card className="group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 flex gap-2">
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(unit);
                    }}
                    className="p-2 bg-white dark:bg-zinc-800 shadow-lg rounded-lg text-zinc-400 hover:text-emerald-500 transition-colors"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteUnit(unit.id);
                    }}
                    className="p-2 bg-white dark:bg-zinc-800 shadow-lg rounded-lg text-zinc-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500">
                    <Building2 size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold dark:text-white truncate">{unit.name}</h3>
                    <div className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400 mt-1">
                      <MapPin size={12} />
                      <span className="text-xs truncate">{unit.city}, {unit.state}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Status</span>
                      <StatusBadge status={unit.status} />
                    </div>
                    {unit.costCenter && (
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">C. Custo</span>
                        <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">{unit.costCenter}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-left">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Endereço</span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate block max-w-[150px]">{unit.address}</span>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <UnitModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveUnit}
        unit={editingUnit}
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
