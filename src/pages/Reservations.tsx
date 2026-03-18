import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  collection, 
  onSnapshot, 
  doc, 
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  where,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  Calendar, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  MapPin, 
  User as UserIcon,
  Check,
  X,
  Clock,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Reservation, Vehicle, UserProfile } from '../types';
import { Card, StatusBadge, Button } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ReservationModal } from '../components/Modals/ReservationModal';
import { ConfirmModal } from '../components/Modals/ConfirmModal';

export function Reservations() {
  const { user, profile } = useAuth();
  const location = useLocation();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'primary';
    isAlert?: boolean;
  } | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'reservations'), orderBy('startDate', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const rData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reservation));
      setReservations(rData);
      setLoading(false);
    });

    const unsubVehicles = onSnapshot(collection(db, 'vehicles'), (snap) => {
      const vData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle));
      setVehicles(vData);
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const uData = snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      setUsers(uData);
    });

    return () => {
      unsubscribe();
      unsubVehicles();
      unsubUsers();
    };
  }, []);

  useEffect(() => {
    if (location.state?.openModal) {
      openAddModal();
      // Clear state to prevent reopening on refresh/back
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleDeleteReservation = (id: string) => {
    setConfirmConfig({
      title: 'Excluir Reserva',
      message: 'Tem certeza que deseja excluir esta reserva? Esta ação não pode ser desfeita.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'reservations', id));
        } catch (err) {
          console.error('Error deleting reservation:', err);
          setConfirmConfig({
            title: 'Erro',
            message: 'Erro ao excluir reserva. Verifique suas permissões.',
            variant: 'danger',
            isAlert: true,
            onConfirm: () => {}
          });
        }
      }
    });
  };

  const handleSaveReservation = async (data: Partial<Reservation>) => {
    try {
      if (editingReservation) {
        await updateDoc(doc(db, 'reservations', editingReservation.id), {
          ...data,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'reservations'), {
          ...data,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          status: 'pending'
        });
      }
    } catch (err) {
      console.error('Error saving reservation:', err);
      throw err;
    }
  };

  const openAddModal = () => {
    setEditingReservation(null);
    setIsModalOpen(true);
  };

  const openEditModal = (reservation: Reservation) => {
    setEditingReservation(reservation);
    setIsModalOpen(true);
  };

  const handleApprove = async (id: string) => {
    try {
      const reservation = reservations.find(r => r.id === id);
      if (!reservation) return;

      // Check for conflicts with other approved/active reservations
      const conflicts = reservations.filter(r => 
        r.id !== id &&
        r.vehicleId === reservation.vehicleId &&
        (r.status === 'approved' || r.status === 'active') &&
        ((reservation.startDate >= r.startDate && reservation.startDate < r.endDate) ||
         (reservation.endDate > r.startDate && reservation.endDate <= r.endDate))
      );

      if (conflicts.length > 0) {
        const higherPriority = conflicts.some(c => c.priority > (reservation.priority || 0));
        const message = higherPriority 
          ? 'Existem reservas de maior prioridade para este período. Deseja aprovar mesmo assim?'
          : 'Existem outras reservas aprovadas para este período. Deseja aprovar mesmo assim?';

        setConfirmConfig({
          title: 'Confirmar Aprovação',
          message,
          variant: 'primary',
          onConfirm: async () => {
            await updateDoc(doc(db, 'reservations', id), {
              status: 'approved',
              approvedBy: user?.uid,
              updatedAt: serverTimestamp()
            });
          }
        });
        return;
      }

      await updateDoc(doc(db, 'reservations', id), {
        status: 'approved',
        approvedBy: user?.uid,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Error approving reservation:', err);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await updateDoc(doc(db, 'reservations', id), {
        status: 'rejected',
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Error rejecting reservation:', err);
    }
  };

  const filteredReservations = reservations.filter(r => {
    const vehicle = vehicles.find(v => v.id === r.vehicleId);
    const driver = users.find(u => u.uid === r.driverId);
    
    // Rule: Driver only sees their own reservations or reservations from their unit
    if (profile?.role === 'driver') {
      const isOwn = r.driverId === profile.uid;
      const isSameUnit = driver?.unit === profile.unit;
      if (!isOwn && !isSameUnit) return false;
    }

    const searchMatch = (
      vehicle?.model.toLowerCase().includes(searchTerm.toLowerCase()) || 
      vehicle?.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle?.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.destination.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return searchMatch;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Reservas de Veículos</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Solicite e gerencie o uso da frota.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input 
              type="text"
              placeholder="Buscar por veículo, tipo, motorista ou destino..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-white w-full md:w-64"
            />
          </div>
          <Button variant="primary" onClick={openAddModal}>
            <Plus size={18} />
            Nova Reserva
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredReservations.length === 0 ? (
            <div className="col-span-full py-24 text-center bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
              <Calendar className="mx-auto text-zinc-300 dark:text-zinc-700 mb-4" size={48} />
              <p className="text-zinc-500 dark:text-zinc-400">Nenhuma reserva encontrada.</p>
            </div>
          ) : (
            filteredReservations.map((res) => {
              const vehicle = vehicles.find(v => v.id === res.vehicleId);
              const driver = users.find(u => u.uid === res.driverId);
              return (
                <motion.div
                  key={res.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <Card className="group hover:shadow-xl transition-all duration-300 border-l-4 border-l-emerald-500 h-full flex flex-col relative overflow-hidden">
                    {res.priority > 2 && (
                      <div className="absolute top-0 right-0 px-3 py-1 bg-amber-500 text-white text-[10px] font-bold uppercase tracking-widest rounded-bl-xl">
                        Alta Prioridade
                      </div>
                    )}
                    
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 bg-zinc-50 dark:bg-zinc-800 rounded-2xl flex items-center justify-center group-hover:bg-emerald-50 dark:group-hover:bg-emerald-500/10 transition-colors">
                        <Calendar className="text-zinc-400 group-hover:text-emerald-500 transition-colors" size={24} />
                      </div>
                      <StatusBadge status={res.status} />
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="text-lg font-bold dark:text-white mb-1">{vehicle?.brand} {vehicle?.model || 'Veículo'}</h3>
                      <div className="flex items-center gap-2 mb-4">
                        <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded inline-block">{vehicle?.plate || '---'}</p>
                        <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest">{vehicle?.hierarchyLevel || 'Livre'}</span>
                      </div>
                      
                      <div className="space-y-3 mb-6">
                        <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                          <UserIcon size={14} className="text-zinc-400" />
                          <span>{driver?.name || 'Motorista'} ({driver?.unit || 'N/A'})</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                          <Clock size={14} className="text-zinc-400" />
                          <span>
                            {(() => {
                              try {
                                return format(new Date(res.startDate), "d 'de' MMM, HH:mm", { locale: ptBR });
                              } catch (e) {
                                return 'Data inválida';
                              }
                            })()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                          <MapPin size={14} className="text-zinc-400" />
                          <span>{res.destination || 'Não informado'}</span>
                        </div>
                      </div>

                      {res.justification && (
                        <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl mb-4">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Justificativa</span>
                          <p className="text-xs text-zinc-600 dark:text-zinc-400 italic line-clamp-2">"{res.justification}"</p>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                      <div className="flex gap-2">
                        {(profile?.role === 'admin' || profile?.role === 'manager' || res.driverId === profile?.uid) && (
                          <>
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteReservation(res.id);
                              }}
                              className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Excluir"
                            >
                              <Trash2 size={16} />
                            </button>
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditModal(res);
                              }}
                              className="p-2 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                      
                      {(profile?.role === 'admin' || profile?.role === 'manager') && res.status === 'pending' && (
                        <div className="flex gap-2">
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReject(res.id);
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Rejeitar"
                          >
                            <X size={16} />
                          </button>
                          <button 
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApprove(res.id);
                            }}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                            title="Aprovar"
                          >
                            <Check size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </Card>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      <ReservationModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveReservation}
        reservation={editingReservation}
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
