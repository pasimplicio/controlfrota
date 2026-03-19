import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  serverTimestamp,
  arrayUnion,
  orderBy
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Reservation, Vehicle, UserProfile } from '../types';
import { Card, StatusBadge, Button } from '../components/UI';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  MessageSquare, 
  User as UserIcon, 
  Car, 
  Calendar,
  History,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { createNotification } from '../services/notificationService';
import { ConfirmModal } from '../components/Modals/ConfirmModal';

export function Approvals() {
  const { user, profile } = useAuth();
  const [pendingReservations, setPendingReservations] = useState<Reservation[]>([]);
  const [historyReservations, setHistoryReservations] = useState<Reservation[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [selectedRes, setSelectedRes] = useState<Reservation | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);

  useEffect(() => {
    // Listen for pending reservations
    const qPending = query(
      collection(db, 'reservations'), 
      where('status', '==', 'pending'),
      orderBy('startDate', 'asc')
    );
    
    const unsubPending = onSnapshot(qPending, (snap) => {
      let data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reservation));
      // Filter by unit if manager
      if (profile?.role === 'manager' && profile.unit) {
        data = data.filter(r => r.unit === profile.unit);
      }
      setPendingReservations(data);
      setLoading(false);
    });

    // Listen for recent history (last 10 approved/rejected)
    const qHistory = query(
      collection(db, 'reservations'),
      where('status', 'in', ['approved', 'rejected']),
      orderBy('updatedAt', 'desc')
    );

    const unsubHistory = onSnapshot(qHistory, (snap) => {
      let data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reservation));
      if (profile?.role === 'manager' && profile.unit) {
        data = data.filter(r => r.unit === profile.unit);
      }
      setHistoryReservations(data.slice(0, 10));
    });

    const unsubVehicles = onSnapshot(collection(db, 'vehicles'), (snap) => {
      setVehicles(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle)));
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
    });

    return () => {
      unsubPending();
      unsubHistory();
      unsubVehicles();
      unsubUsers();
    };
  }, [profile]);

  const handleAction = async () => {
    if (!selectedRes || !actionType || !user) return;

    try {
      const newStatus = actionType === 'approve' ? 'approved' : 'rejected';
      const historyItem = {
        status: newStatus,
        updatedBy: user.uid,
        updatedAt: new Date().toISOString(),
        comment: comment.trim() || (actionType === 'approve' ? 'Aprovado pelo gestor.' : 'Rejeitado pelo gestor.')
      };

      await updateDoc(doc(db, 'reservations', selectedRes.id), {
        status: newStatus,
        approvedBy: actionType === 'approve' ? user.uid : null,
        updatedAt: serverTimestamp(),
        approvalHistory: arrayUnion(historyItem)
      });

      // Notify driver
      const vehicle = vehicles.find(v => v.id === selectedRes.vehicleId);
      createNotification({
        userId: selectedRes.driverId,
        title: actionType === 'approve' ? 'Reserva Aprovada' : 'Reserva Rejeitada',
        message: `Sua reserva do veículo ${vehicle?.model} para ${selectedRes.destination} foi ${actionType === 'approve' ? 'aprovada' : 'rejeitada'}.${comment ? ` Motivo: ${comment}` : ''}`,
        type: actionType === 'approve' ? 'success' : 'error',
        link: '/reservations'
      });

      setSelectedRes(null);
      setActionType(null);
      setComment('');
    } catch (err) {
      console.error('Error processing approval:', err);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Aprovações</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Gerencie as solicitações de reserva da sua unidade.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Pending Requests */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-2 text-amber-500 mb-2">
            <Clock size={20} />
            <h2 className="font-bold uppercase tracking-widest text-sm">Solicitações Pendentes ({pendingReservations.length})</h2>
          </div>

          <AnimatePresence mode="popLayout">
            {pendingReservations.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white dark:bg-zinc-900 p-12 rounded-3xl border border-zinc-200 dark:border-zinc-800 text-center"
              >
                <CheckCircle2 className="mx-auto text-emerald-500 mb-4" size={48} />
                <p className="text-zinc-500 dark:text-zinc-400 font-medium">Tudo em dia! Nenhuma pendência encontrada.</p>
              </motion.div>
            ) : (
              pendingReservations.map((res) => {
                const vehicle = vehicles.find(v => v.id === res.vehicleId);
                const driver = users.find(u => u.uid === res.driverId);
                return (
                  <motion.div
                    key={res.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <Card className="hover:shadow-lg transition-all border-l-4 border-l-amber-500">
                      <div className="flex flex-col md:flex-row gap-6">
                        <div className="flex-1 space-y-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-lg font-bold dark:text-white">{vehicle?.brand} {vehicle?.model}</h3>
                              <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400">{vehicle?.plate}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Prioridade</p>
                              <div className={`text-sm font-bold ${res.priority > 2 ? 'text-red-500' : 'text-emerald-500'}`}>
                                {res.priority > 2 ? 'Alta' : 'Normal'}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl">
                              <UserIcon className="text-zinc-400" size={18} />
                              <div>
                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Motorista</p>
                                <p className="text-sm font-medium dark:text-white">{driver?.name}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl">
                              <Calendar className="text-zinc-400" size={18} />
                              <div>
                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Período</p>
                                <p className="text-sm font-medium dark:text-white">
                                  {format(new Date(res.startDate), "d 'de' MMM, HH:mm", { locale: ptBR })}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                            <div className="flex items-center gap-2 mb-2">
                              <MessageSquare size={14} className="text-zinc-400" />
                              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Motivo e Destino</span>
                            </div>
                            <p className="text-sm dark:text-white font-medium mb-1">{res.destination}</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 italic">"{res.reason}"</p>
                            {res.justification && (
                              <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700">
                                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest block mb-1">Justificativa de Exceção</span>
                                <p className="text-xs text-amber-600 dark:text-amber-400">{res.justification}</p>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex md:flex-col gap-2 justify-end">
                          <button 
                            onClick={() => { setSelectedRes(res); setActionType('reject'); }}
                            className="flex-1 md:flex-none p-4 bg-red-50 dark:bg-red-500/10 text-red-600 rounded-2xl hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2 font-bold text-sm"
                          >
                            <XCircle size={18} />
                            Rejeitar
                          </button>
                          <button 
                            onClick={() => { setSelectedRes(res); setActionType('approve'); }}
                            className="flex-1 md:flex-none p-4 bg-emerald-500 text-white rounded-2xl hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2 font-bold text-sm shadow-lg shadow-emerald-500/20"
                          >
                            <CheckCircle2 size={18} />
                            Aprovar
                          </button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>

        {/* History Sidebar */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-zinc-500 mb-2">
            <History size={20} />
            <h2 className="font-bold uppercase tracking-widest text-sm">Histórico Recente</h2>
          </div>

          <div className="space-y-4">
            {historyReservations.map((res) => {
              const vehicle = vehicles.find(v => v.id === res.vehicleId);
              const driver = users.find(u => u.uid === res.driverId);
              return (
                <div key={res.id} className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <StatusBadge status={res.status} />
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {res.updatedAt ? format(res.updatedAt.toDate(), "HH:mm, d/MM", { locale: ptBR }) : ''}
                    </span>
                  </div>
                  <p className="text-sm font-bold dark:text-white truncate">{vehicle?.model}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">{driver?.name}</p>
                  
                  {res.approvalHistory && res.approvalHistory.length > 0 && (
                    <div className="p-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-800">
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 italic line-clamp-2">
                        "{res.approvalHistory[res.approvalHistory.length - 1].comment}"
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Action Modal */}
      <AnimatePresence>
        {selectedRes && actionType && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <h3 className="text-lg font-bold dark:text-white">
                  {actionType === 'approve' ? 'Confirmar Aprovação' : 'Confirmar Rejeição'}
                </h3>
                <button onClick={() => { setSelectedRes(null); setActionType(null); }} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full">
                  <XCircle size={20} className="text-zinc-400" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className={`p-4 rounded-2xl flex items-start gap-3 ${actionType === 'approve' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600' : 'bg-red-50 dark:bg-red-500/10 text-red-600'}`}>
                  <AlertCircle size={20} className="shrink-0" />
                  <p className="text-sm">
                    {actionType === 'approve' 
                      ? 'Ao aprovar, o veículo será reservado para este motorista no período solicitado.' 
                      : 'Ao rejeitar, a solicitação será cancelada e o motorista será notificado.'}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase ml-1">Comentário / Justificativa</label>
                  <textarea 
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={actionType === 'approve' ? 'Opcional: Adicione uma observação...' : 'Obrigatório: Informe o motivo da rejeição...'}
                    className="w-full p-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-white resize-none"
                    rows={4}
                  />
                </div>
              </div>
              <div className="p-6 bg-zinc-50 dark:bg-zinc-800/50 flex gap-3">
                <button 
                  onClick={() => { setSelectedRes(null); setActionType(null); }}
                  className="flex-1 py-3 text-sm font-bold text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleAction}
                  disabled={actionType === 'reject' && !comment.trim()}
                  className={`flex-1 py-3 text-sm font-bold text-white rounded-xl shadow-lg transition-all disabled:opacity-50 ${actionType === 'approve' ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-red-500 shadow-red-500/20'}`}
                >
                  {actionType === 'approve' ? 'Aprovar' : 'Rejeitar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
