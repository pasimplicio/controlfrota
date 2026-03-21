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
  serverTimestamp,
  arrayUnion
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  MapPin, 
  User as UserIcon,
  Check,
  X,
  Clock,
  Filter,
  LayoutGrid,
  List,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Reservation, Vehicle, UserProfile } from '../types';
import { Card, StatusBadge, Button } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { format, startOfWeek, addDays, isSameDay, parseISO, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ReservationModal } from '../components/Modals/ReservationModal';
import { ConfirmModal } from '../components/Modals/ConfirmModal';
import { InspectionModal } from '../components/Modals/InspectionModal';
import { createNotification } from '../services/notificationService';
import { Inspection } from '../types';
import { handleFirestoreError, OperationType } from '../services/errorService';

export function Reservations() {
  const { user, profile } = useAuth();
  const location = useLocation();
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
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

  // Inspection Modal State
  const [isInspectionModalOpen, setIsInspectionModalOpen] = useState(false);
  const [inspectionType, setInspectionType] = useState<'check-out' | 'check-in'>('check-out');
  const [selectedResForInspection, setSelectedResForInspection] = useState<Reservation | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'reservations'), orderBy('startDate', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const rData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reservation));
      setReservations(rData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'reservations');
    });

    const unsubVehicles = onSnapshot(collection(db, 'vehicles'), (snap) => {
      const vData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle));
      setVehicles(vData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'vehicles');
    });

    let unsubUsers: (() => void) | undefined;
    if (profile?.role === 'admin' || profile?.role === 'manager') {
      unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
        const uData = snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
        setUsers(uData);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'users');
      });
    }

    return () => {
      unsubscribe();
      unsubVehicles();
      if (unsubUsers) unsubUsers();
    };
  }, [profile]);

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
          handleFirestoreError(err, OperationType.DELETE, `reservations/${id}`);
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

        // Notify admins/managers about new reservation
        const admins = users.filter(u => u.role === 'admin' || u.role === 'manager');
        const vehicle = vehicles.find(v => v.id === data.vehicleId);
        const driver = users.find(u => u.uid === data.driverId);

        admins.forEach(admin => {
          createNotification({
            userId: admin.uid,
            title: 'Nova Solicitação de Reserva',
            message: `${driver?.name} solicitou o veículo ${vehicle?.model} para ${data.destination}.`,
            type: 'info',
            link: '/reservations'
          });
        });
      }
    } catch (err) {
      handleFirestoreError(err, editingReservation ? OperationType.UPDATE : OperationType.CREATE, editingReservation ? `reservations/${editingReservation.id}` : 'reservations');
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
      if (!reservation || !user) return;

      const approveAction = async () => {
        const historyItem = {
          status: 'approved',
          updatedBy: user.uid,
          updatedAt: new Date().toISOString(),
          comment: 'Aprovado via lista de reservas.'
        };

        await updateDoc(doc(db, 'reservations', id), {
          status: 'approved',
          approvedBy: user.uid,
          updatedAt: serverTimestamp(),
          approvalHistory: arrayUnion(historyItem)
        });

        // Notify driver
        const vehicle = vehicles.find(v => v.id === reservation.vehicleId);
        createNotification({
          userId: reservation.driverId,
          title: 'Reserva Aprovada',
          message: `Sua reserva do veículo ${vehicle?.model} para ${reservation.destination} foi aprovada.`,
          type: 'success',
          link: '/reservations'
        });
      };

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
          onConfirm: approveAction
        });
        return;
      }

      await approveAction();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `reservations/${id}`);
    }
  };

  const handleReject = async (id: string) => {
    try {
      const reservation = reservations.find(r => r.id === id);
      if (!reservation || !user) return;

      const historyItem = {
        status: 'rejected',
        updatedBy: user.uid,
        updatedAt: new Date().toISOString(),
        comment: 'Rejeitado via lista de reservas.'
      };

      await updateDoc(doc(db, 'reservations', id), {
        status: 'rejected',
        updatedAt: serverTimestamp(),
        approvalHistory: arrayUnion(historyItem)
      });

      // Notify driver
      const vehicle = vehicles.find(v => v.id === reservation.vehicleId);
      createNotification({
        userId: reservation.driverId,
        title: 'Reserva Rejeitada',
        message: `Sua reserva do veículo ${vehicle?.model} para ${reservation.destination} foi rejeitada.`,
        type: 'error',
        link: '/reservations'
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `reservations/${id}`);
    }
  };

  const handleSaveInspection = async (inspectionData: Omit<Inspection, 'id' | 'createdAt'>) => {
    if (!selectedResForInspection) return;

    try {
      const inspectionRef = await addDoc(collection(db, 'inspections'), {
        ...inspectionData,
        createdAt: serverTimestamp()
      });

      const resUpdate: any = {
        updatedAt: serverTimestamp(),
      };

      const vehicleUpdate: any = {
        currentKm: inspectionData.km,
        updatedAt: serverTimestamp(),
      };

      if (inspectionData.type === 'check-out') {
        resUpdate.status = 'active';
        resUpdate.checkOutId = inspectionRef.id;
        resUpdate.startKm = inspectionData.km;
        resUpdate.startFuel = inspectionData.fuelLevel;
        vehicleUpdate.status = 'reserved';
      } else {
        resUpdate.status = 'completed';
        resUpdate.checkInId = inspectionRef.id;
        resUpdate.endKm = inspectionData.km;
        resUpdate.endFuel = inspectionData.fuelLevel;
        vehicleUpdate.status = 'active';
      }

      await updateDoc(doc(db, 'reservations', selectedResForInspection.id), resUpdate);
      await updateDoc(doc(db, 'vehicles', selectedResForInspection.vehicleId), vehicleUpdate);

      setIsInspectionModalOpen(false);
      setSelectedResForInspection(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'inspections');
      throw err;
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

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Reservas de Veículos</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Solicite e gerencie o uso da frota.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-zinc-700 text-emerald-500 shadow-sm' : 'text-zinc-500'}`}
            >
              <List size={18} />
            </button>
            <button 
              onClick={() => setViewMode('calendar')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'calendar' ? 'bg-white dark:bg-zinc-700 text-emerald-500 shadow-sm' : 'text-zinc-500'}`}
            >
              <LayoutGrid size={18} />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input 
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-white w-full md:w-48"
            />
          </div>
          <Button variant="primary" onClick={openAddModal}>
            <Plus size={18} />
            Nova Reserva
          </Button>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <h3 className="font-bold dark:text-white flex items-center gap-2">
              <CalendarIcon className="text-emerald-500" size={20} />
              Agenda da Semana
            </h3>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setCurrentWeekStart(addDays(currentWeekStart, -7))}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500"
              >
                Anterior
              </button>
              <span className="text-sm font-bold dark:text-white">
                {format(currentWeekStart, "d 'de' MMM", { locale: ptBR })} - {format(addDays(currentWeekStart, 6), "d 'de' MMM", { locale: ptBR })}
              </span>
              <button 
                onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500"
              >
                Próxima
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[1000px]">
              <div className="grid grid-cols-[200px_repeat(7,1fr)] bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
                <div className="p-4 text-xs font-bold text-zinc-400 uppercase tracking-widest">Veículo</div>
                {weekDays.map((day, i) => (
                  <div key={i} className={`p-4 text-center border-l border-zinc-100 dark:border-zinc-800 ${isSameDay(day, new Date()) ? 'bg-emerald-500/5' : ''}`}>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{format(day, 'EEE', { locale: ptBR })}</p>
                    <p className={`text-sm font-bold ${isSameDay(day, new Date()) ? 'text-emerald-500' : 'dark:text-white'}`}>{format(day, 'd')}</p>
                  </div>
                ))}
              </div>
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {vehicles.map(vehicle => (
                  <div key={vehicle.id} className="grid grid-cols-[200px_repeat(7,1fr)] group hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                    <div className="p-4 border-r border-zinc-100 dark:border-zinc-800">
                      <p className="text-sm font-bold dark:text-white truncate">{vehicle.model}</p>
                      <p className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400">{vehicle.plate}</p>
                    </div>
                    {weekDays.map((day, i) => {
                      const dayReservations = reservations.filter(r => 
                        r.vehicleId === vehicle.id && 
                        (r.status === 'approved' || r.status === 'active' || r.status === 'pending') &&
                        isSameDay(parseISO(r.startDate), day)
                      );
                      return (
                        <div key={i} className="p-2 border-l border-zinc-100 dark:border-zinc-800 min-h-[80px] flex flex-col gap-1">
                          {dayReservations.map(res => (
                            <div 
                              key={res.id}
                              onClick={() => openEditModal(res)}
                              className={`p-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all hover:scale-[1.02] shadow-sm ${
                                res.status === 'approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30' :
                                res.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30' :
                                'bg-zinc-100 text-zinc-700 dark:bg-zinc-500/20 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-500/30'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-0.5">
                                <span>{format(parseISO(res.startDate), 'HH:mm')}</span>
                                {res.priority > 2 && <div className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                              </div>
                              <p className="truncate opacity-80">{users.find(u => u.uid === res.driverId)?.name.split(' ')[0]}</p>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredReservations.length === 0 ? (
              <div className="col-span-full py-24 text-center bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
                <CalendarIcon className="mx-auto text-zinc-300 dark:text-zinc-700 mb-4" size={48} />
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
                          <CalendarIcon className="text-zinc-400 group-hover:text-emerald-500 transition-colors" size={24} />
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

                        {res.approvalHistory && res.approvalHistory.length > 0 && (
                          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl mb-4 border-l-2 border-emerald-500">
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block mb-1">Histórico de Aprovação</span>
                            <div className="space-y-2">
                              {res.approvalHistory.map((history, idx) => (
                                <div key={idx} className="text-[10px]">
                                  <span className={`font-bold uppercase ${history.status === 'approved' ? 'text-emerald-500' : 'text-red-500'}`}>
                                    {history.status === 'approved' ? 'Aprovado' : 'Rejeitado'}
                                  </span>
                                  <span className="text-zinc-400 ml-1">por {users.find(u => u.uid === history.updatedBy)?.name || 'Gestor'}</span>
                                  {history.comment && <p className="text-zinc-500 dark:text-zinc-400 italic mt-1">"{history.comment}"</p>}
                                </div>
                              ))}
                            </div>
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

                              {/* Check-out Button */}
                              {res.status === 'approved' && (profile?.role === 'admin' || profile?.role === 'manager' || res.driverId === profile?.uid) && (
                                <button 
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedResForInspection(res);
                                    setInspectionType('check-out');
                                    setIsInspectionModalOpen(true);
                                  }}
                                  className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-lg hover:bg-emerald-600 transition-colors"
                                >
                                  <CheckCircle2 size={14} />
                                  Check-out
                                </button>
                              )}

                              {/* Check-in Button */}
                              {res.status === 'active' && (profile?.role === 'admin' || profile?.role === 'manager' || res.driverId === profile?.uid) && (
                                <button 
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedResForInspection(res);
                                    setInspectionType('check-in');
                                    setIsInspectionModalOpen(true);
                                  }}
                                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 text-white text-xs font-bold rounded-lg hover:bg-blue-600 transition-colors"
                                >
                                  <CheckCircle2 size={14} />
                                  Check-in
                                </button>
                              )}
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
      )}

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

      {isInspectionModalOpen && selectedResForInspection && (
        <InspectionModal
          isOpen={isInspectionModalOpen}
          onClose={() => {
            setIsInspectionModalOpen(false);
            setSelectedResForInspection(null);
          }}
          type={inspectionType}
          reservation={selectedResForInspection}
          vehicle={vehicles.find(v => v.id === selectedResForInspection.vehicleId)!}
          driverId={selectedResForInspection.driverId}
          onSave={handleSaveInspection}
        />
      )}
    </div>
  );
}
