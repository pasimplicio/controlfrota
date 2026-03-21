import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  orderBy, 
  where, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  Fuel, 
  Plus, 
  Search, 
  Filter, 
  TrendingUp, 
  Calendar, 
  MapPin, 
  User as UserIcon, 
  Car, 
  ChevronRight,
  MoreVertical,
  Trash2,
  Edit2,
  AlertTriangle,
  FileText,
  Gauge
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { Fueling, Vehicle, UserProfile } from '../types';
import { useAuth } from '../context/AuthContext';
import { Button, Card, StatusBadge } from '../components/UI';
import { FuelingModal } from '../components/Modals/FuelingModal';
import { ConfirmModal } from '../components/Modals/ConfirmModal';

import { handleFirestoreError, OperationType } from '../services/errorService';

export function FuelingPage() {
  const { profile } = useAuth();
  const [fuelingRecords, setFuelingRecords] = useState<Fueling[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<string>('all');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFueling, setEditingFueling] = useState<Fueling | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    const unsubVehicles = onSnapshot(collection(db, 'vehicles'), (snap) => {
      setVehicles(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'vehicles');
    });

    let unsubUsers: (() => void) | undefined;
    if (profile?.role === 'admin' || profile?.role === 'manager') {
      unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
        setUsers(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'users');
      });
    }

    const q = query(collection(db, 'fueling'), orderBy('date', 'desc'));
    const unsubFueling = onSnapshot(q, (snap) => {
      setFuelingRecords(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Fueling)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'fueling');
    });

    return () => {
      unsubVehicles();
      if (unsubUsers) unsubUsers();
      unsubFueling();
    };
  }, [profile]);

  const handleSaveFueling = async (data: Partial<Fueling>) => {
    try {
      if (editingFueling) {
        await updateDoc(doc(db, 'fueling', editingFueling.id), {
          ...data,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'fueling'), {
          ...data,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        // Update vehicle current KM
        if (data.vehicleId && data.km) {
          await updateDoc(doc(db, 'vehicles', data.vehicleId), {
            currentKm: data.km,
            updatedAt: serverTimestamp()
          });
        }
      }
    } catch (err) {
      handleFirestoreError(err, editingFueling ? OperationType.UPDATE : OperationType.CREATE, editingFueling ? `fueling/${editingFueling.id}` : 'fueling');
      throw err;
    }
  };

  const handleDeleteFueling = async () => {
    if (!confirmDelete) return;
    try {
      await deleteDoc(doc(db, 'fueling', confirmDelete));
      setConfirmDelete(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `fueling/${confirmDelete}`);
    }
  };

  const filteredRecords = fuelingRecords.filter(record => {
    const vehicle = vehicles.find(v => v.id === record.vehicleId);
    const driver = users.find(u => u.uid === record.driverId);
    
    const matchesSearch = (
      vehicle?.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle?.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.stationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const matchesVehicle = selectedVehicle === 'all' || record.vehicleId === selectedVehicle;

    return matchesSearch && matchesVehicle;
  });

  const consumptionData = [...fuelingRecords]
    .reverse()
    .filter(r => r.consumption !== undefined)
    .slice(-10)
    .map(r => ({
      date: format(new Date(r.date), 'dd/MM'),
      consumption: r.consumption
    }));

  const totalSpent = filteredRecords.reduce((acc, curr) => acc + (curr.totalValue || 0), 0);
  const totalLiters = filteredRecords.reduce((acc, curr) => acc + (curr.liters || 0), 0);
  const avgConsumption = filteredRecords.filter(r => r.consumption).reduce((acc, curr, _, arr) => acc + (curr.consumption || 0) / arr.length, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Abastecimento</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Controle de consumo e gastos com combustível.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
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
          <select
            value={selectedVehicle}
            onChange={(e) => setSelectedVehicle(e.target.value)}
            className="p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-white"
          >
            <option value="all">Todos os Veículos</option>
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>{v.model} - {v.plate}</option>
            ))}
          </select>
          <Button variant="primary" onClick={() => { setEditingFueling(null); setIsModalOpen(true); }}>
            <Plus size={18} />
            Novo Registro
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Gasto', value: `R$ ${totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: TrendingUp, color: 'text-emerald-600', border: 'border-l-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
          { label: 'Total Litros', value: `${totalLiters.toFixed(1)} L`, icon: Fuel, color: 'text-blue-600', border: 'border-l-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
          { label: 'Consumo Médio', value: `${avgConsumption.toFixed(2)} km/l`, icon: Gauge, color: 'text-amber-600', border: 'border-l-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
          { label: 'Registros', value: filteredRecords.length, icon: FileText, color: 'text-purple-600', border: 'border-l-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10' },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 border-l-4 ${stat.border} shadow-sm`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 ${stat.bg} rounded-2xl`}>
                <stat.icon className={stat.color} size={24} />
              </div>
            </div>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">{stat.label}</p>
            <h3 className="text-2xl font-bold dark:text-white">{stat.value}</h3>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Consumption Chart */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <h3 className="text-lg font-bold mb-6 dark:text-white flex items-center gap-2">
              <TrendingUp size={20} className="text-emerald-500" />
              Histórico de Consumo (km/l)
            </h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={consumptionData}>
                  <defs>
                    <linearGradient id="colorCons" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '12px', color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="consumption" stroke="#10b981" fillOpacity={1} fill="url(#colorCons)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-bold dark:text-white px-2">Registros Recentes</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence mode="popLayout">
                {filteredRecords.map((record) => {
                  const vehicle = vehicles.find(v => v.id === record.vehicleId);
                  const driver = users.find(u => u.uid === record.driverId);
                  
                  return (
                    <motion.div
                      key={record.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                    >
                      <Card className="group hover:shadow-xl transition-all duration-300 border-l-4 border-l-blue-500 h-full flex flex-col relative overflow-hidden">
                        <div className="flex justify-between items-start mb-4">
                          <div className="w-12 h-12 bg-zinc-50 dark:bg-zinc-800 rounded-2xl flex items-center justify-center group-hover:bg-blue-50 dark:group-hover:bg-blue-500/10 transition-colors">
                            <Fuel className="text-zinc-400 group-hover:text-blue-500 transition-colors" size={24} />
                          </div>
                          <div className="flex items-center gap-1">
                            {record.consumption && record.consumption < 8 && (
                              <div className="p-1.5 bg-red-100 text-red-600 rounded-lg" title="Consumo Elevado">
                                <AlertTriangle size={14} />
                              </div>
                            )}
                            <button 
                              onClick={() => { setEditingFueling(record); setIsModalOpen(true); }}
                              className="p-2 text-zinc-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => setConfirmDelete(record.id)}
                              className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        <div className="flex-1">
                          <h3 className="text-lg font-bold dark:text-white mb-1">{vehicle?.model}</h3>
                          <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded inline-block mb-4">
                            {vehicle?.plate}
                          </p>

                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Valor Total</p>
                              <p className="text-sm font-bold dark:text-white">R$ {record.totalValue.toLocaleString('pt-BR')}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Litros</p>
                              <p className="text-sm font-bold dark:text-white">{record.liters} L</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Consumo</p>
                              <p className={`text-sm font-bold ${record.consumption && record.consumption < 8 ? 'text-red-500' : 'text-emerald-500'}`}>
                                {record.consumption ? `${record.consumption} km/l` : '---'}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">KM Atual</p>
                              <p className="text-sm font-bold dark:text-white">{record.km.toLocaleString('pt-BR')} km</p>
                            </div>
                          </div>

                          <div className="space-y-2 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                            <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                              <MapPin size={14} className="text-zinc-400" />
                              <span className="truncate">{record.stationName}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                              <UserIcon size={14} className="text-zinc-400" />
                              <span>{driver?.name}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                              <Calendar size={14} className="text-zinc-400" />
                              <span>{format(new Date(record.date), "d 'de' MMMM, yyyy", { locale: ptBR })}</span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-8">
          <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <h3 className="text-lg font-bold mb-6 dark:text-white flex items-center gap-2">
              <AlertTriangle size={20} className="text-amber-500" />
              Alertas de Consumo
            </h3>
            <div className="space-y-4">
              {filteredRecords.filter(r => r.consumption && r.consumption < 8).slice(0, 3).map((record) => (
                <div key={record.id} className="p-4 bg-red-50 dark:bg-red-500/5 border border-red-100 dark:border-red-500/20 rounded-2xl">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-red-100 dark:bg-red-500/20 rounded-lg flex items-center justify-center">
                      <TrendingUp className="text-red-600" size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold dark:text-white">{vehicles.find(v => v.id === record.vehicleId)?.model}</p>
                      <p className="text-[10px] text-red-500 font-medium">Consumo crítico: {record.consumption} km/l</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    Este veículo apresentou um consumo abaixo do esperado no dia {format(new Date(record.date), 'dd/MM')}.
                  </p>
                </div>
              ))}
              {filteredRecords.filter(r => r.consumption && r.consumption < 8).length === 0 && (
                <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-4">
                  Nenhum alerta de consumo elevado no momento.
                </p>
              )}
            </div>
          </div>

          <div className="bg-zinc-900 p-8 rounded-3xl text-white shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-xl font-bold mb-2">Dica de Economia</h3>
              <p className="text-zinc-400 text-sm mb-6">Mantenha os pneus calibrados e evite acelerações bruscas para reduzir o consumo em até 15%.</p>
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <TrendingUp size={16} />
                <span>Meta: +2.0 km/l</span>
              </div>
            </div>
            <Fuel className="absolute -right-8 -bottom-8 text-white/5 w-48 h-48 rotate-12" />
          </div>
        </div>
      </div>

      <FuelingModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveFueling}
        fueling={editingFueling}
        vehicles={vehicles}
        driverId={profile?.uid || ''}
      />

      <ConfirmModal 
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDeleteFueling}
        title="Excluir Registro"
        message="Tem certeza que deseja excluir este registro de abastecimento? Esta ação não pode ser desfeita."
        variant="danger"
      />
    </div>
  );
}
