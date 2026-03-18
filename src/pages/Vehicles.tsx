import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  deleteDoc,
  query,
  orderBy,
  addDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  Car, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  MapPin, 
  Wrench,
  Shield,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Vehicle } from '../types';
import { Card, StatusBadge, Button } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { VehicleModal } from '../components/Modals/VehicleModal';
import { ConfirmModal } from '../components/Modals/ConfirmModal';

export function Vehicles() {
  const { profile } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'primary';
    isAlert?: boolean;
  } | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'vehicles'), orderBy('model', 'asc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const vData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle));
      setVehicles(vData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleDeleteVehicle = async (id: string) => {
    setConfirmConfig({
      title: 'Excluir Veículo',
      message: 'Tem certeza que deseja excluir este veículo? Esta ação não pode ser desfeita.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'vehicles', id));
        } catch (err) {
          console.error('Error deleting vehicle:', err);
          setConfirmConfig({
            title: 'Erro',
            message: 'Erro ao excluir veículo. Verifique suas permissões.',
            variant: 'danger',
            isAlert: true,
            onConfirm: () => {}
          });
        }
      }
    });
  };

  const handleSaveVehicle = async (data: Partial<Vehicle>) => {
    try {
      // Check for duplicates
      if (!editingVehicle) {
        const duplicatePlate = vehicles.find(v => v.plate.toUpperCase() === data.plate?.toUpperCase());
        if (duplicatePlate) {
          setConfirmConfig({
            title: 'Veículo Duplicado',
            message: 'Este veículo (placa) já está cadastrado.',
            variant: 'danger',
            isAlert: true,
            onConfirm: () => {}
          });
          return;
        }
      }

      if (editingVehicle) {
        await updateDoc(doc(db, 'vehicles', editingVehicle.id), {
          ...data,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'vehicles'), {
          ...data,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    } catch (err) {
      console.error('Error saving vehicle:', err);
      throw err;
    }
  };

  const openAddModal = () => {
    setEditingVehicle(null);
    setIsModalOpen(true);
  };

  const openEditModal = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setIsModalOpen(true);
  };

  const filteredVehicles = vehicles.filter(v => {
    // Rule: Driver only sees vehicles from their unit
    if (profile?.role === 'driver' && profile.unit) {
      if (v.unit !== profile.unit) return false;
    }

    return (
      v.model.toLowerCase().includes(searchTerm.toLowerCase()) || 
      v.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.type.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Frota de Veículos</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Gerencie todos os veículos da organização.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input 
              type="text"
              placeholder="Buscar por modelo, placa ou tipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-white w-full md:w-64"
            />
          </div>
          {(profile?.role === 'admin' || profile?.role === 'manager') && (
            <Button variant="primary" onClick={openAddModal}>
              <Plus size={18} />
              Novo Veículo
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredVehicles.length === 0 ? (
            <div className="col-span-full py-24 text-center bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
              <Car className="mx-auto text-zinc-300 dark:text-zinc-700 mb-4" size={48} />
              <p className="text-zinc-500 dark:text-zinc-400">Nenhum veículo encontrado.</p>
            </div>
          ) : (
            filteredVehicles.map((v) => (
              <motion.div
                key={v.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <Card className="group hover:shadow-xl transition-all duration-300 border-l-4 border-l-emerald-500 h-full flex flex-col overflow-hidden p-0">
                  {v.photos && v.photos.length > 0 ? (
                    <div className="h-40 w-full overflow-hidden relative">
                      <img 
                        src={v.photos[0]} 
                        alt={`${v.brand} ${v.model}`} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-3 right-3">
                        <StatusBadge status={v.status} />
                      </div>
                    </div>
                  ) : (
                    <div className="h-40 w-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center relative">
                      <Car className="text-zinc-300 dark:text-zinc-700" size={48} />
                      <div className="absolute top-3 right-3">
                        <StatusBadge status={v.status} />
                      </div>
                    </div>
                  )}
                  
                  <div className="p-6 flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="text-lg font-bold dark:text-white">{v.brand} {v.model}</h3>
                    </div>
                    <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400 mb-4 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded inline-block">{v.plate}</p>
                    
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                        <MapPin size={14} className="text-zinc-400" />
                        <span>{v.unit}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                        <Shield size={14} className="text-zinc-400" />
                        <span>{v.type} • {v.category || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                        <Filter size={14} className="text-zinc-400" />
                        <span>Nível: {v.hierarchyLevel || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                        <Wrench size={14} className="text-zinc-400" />
                        <span>{v.currentKm.toLocaleString()} km</span>
                      </div>
                    </div>
                  </div>

                  <div className="px-6 pb-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                    <div className="flex gap-1">
                      {v.hasGps && <div className="w-6 h-6 bg-blue-50 dark:bg-blue-500/10 rounded flex items-center justify-center" title="GPS"><MapPin size={12} className="text-blue-500" /></div>}
                      {v.hasCamera && <div className="w-6 h-6 bg-purple-50 dark:bg-purple-500/10 rounded flex items-center justify-center" title="Câmera"><Shield size={12} className="text-purple-500" /></div>}
                    </div>
                    
                    {(profile?.role === 'admin' || profile?.role === 'manager') && (
                      <div className="flex gap-2">
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteVehicle(v.id);
                          }}
                          className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(v);
                          }}
                          className="p-2 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </Card>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      <VehicleModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveVehicle}
        vehicle={editingVehicle}
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

