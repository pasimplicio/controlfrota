import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { 
  Car, 
  Calendar, 
  Wrench, 
  AlertTriangle, 
  ChevronRight,
  MapPin,
  Clock
} from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Vehicle, Reservation, UserProfile } from '../types';
import { useAuth } from '../context/AuthContext';

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6366f1'];

const statusTranslations: Record<string, string> = {
  pending: 'Pendente',
  approved: 'Aprovada',
  rejected: 'Rejeitada',
  active: 'Em curso',
  completed: 'Concluída'
};

export function Dashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalVehicles: 0,
    activeReservations: 0,
    maintenanceCount: 0,
    pendingApprovals: 0
  });
  const [recentReservations, setRecentReservations] = useState<Reservation[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
    });

    const unsubVehicles = onSnapshot(collection(db, 'vehicles'), (snap) => {
      let vData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle));
      
      // Filter by unit for drivers
      if (profile?.role === 'driver' && profile.unit) {
        vData = vData.filter(v => v.unit === profile.unit);
      }

      setVehicles(vData);
      setStats(prev => ({
        ...prev,
        totalVehicles: vData.length,
        maintenanceCount: vData.filter(v => v.status === 'maintenance').length
      }));
    });

    const unsubReservations = onSnapshot(
      query(collection(db, 'reservations'), orderBy('startDate', 'desc')),
      (snap) => {
        let rData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reservation));
        
        // Filter by unit or driverId for drivers
        if (profile?.role === 'driver' && profile.unit) {
          rData = rData.filter(r => r.unit === profile.unit || r.driverId === profile.uid);
        }

        setRecentReservations(rData.slice(0, 5));
        setStats(prev => ({
          ...prev,
          activeReservations: rData.filter(r => r.status === 'active').length,
          pendingApprovals: rData.filter(r => r.status === 'pending').length
        }));
      }
    );

    return () => {
      unsubUsers();
      unsubVehicles();
      unsubReservations();
    };
  }, []);

  const vehicleTypeData = vehicles.reduce((acc: any[], vehicle) => {
    const existing = acc.find(item => item.name === vehicle.type);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: vehicle.type, value: 1 });
    }
    return acc;
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Dashboard</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Bem-vindo ao sistema de gestão de frota.</p>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <Clock size={16} className="text-emerald-500" />
          {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total de Veículos', value: stats.totalVehicles, icon: Car, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-500/10' },
          { label: 'Reservas Ativas', value: stats.activeReservations, icon: Calendar, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
          { label: 'Em Manutenção', value: stats.maintenanceCount, icon: Wrench, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-500/10' },
          { label: 'Aguardando Aprovação', value: stats.pendingApprovals, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-500/10' },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 ${stat.bg} rounded-2xl`}>
                <stat.icon className={stat.color} size={24} />
              </div>
            </div>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">{stat.label}</p>
            <h3 className="text-3xl font-bold dark:text-white">{stat.value}</h3>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Charts */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <h3 className="text-lg font-bold mb-6 dark:text-white">Distribuição por Tipo</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={vehicleTypeData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '12px', color: '#fff' }}
                    cursor={{ fill: '#f4f4f5' }}
                  />
                  <Bar dataKey="value" fill="#10b981" radius={[6, 6, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold dark:text-white">Reservas Recentes</h3>
              <button 
                onClick={() => navigate('/reservations')}
                className="text-sm font-bold text-emerald-600 hover:underline flex items-center gap-1"
              >
                Ver todas <ChevronRight size={16} />
              </button>
            </div>
            <div className="space-y-4">
              {recentReservations.map((res, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white dark:bg-zinc-800 rounded-xl flex items-center justify-center shadow-sm">
                      <Calendar className="text-emerald-500" size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold dark:text-white">{res.destination}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                          {users.find(u => u.uid === res.driverId)?.name || 'Usuário'}
                        </p>
                        <span className="text-zinc-300 dark:text-zinc-700">•</span>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">{format(new Date(res.startDate), "d 'de' MMM, HH:mm", { locale: ptBR })}</p>
                      </div>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    res.status === 'approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                    res.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' :
                    'bg-zinc-100 text-zinc-700 dark:bg-zinc-500/20 dark:text-zinc-400'
                  }`}>
                    {statusTranslations[res.status] || res.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-8">
          <div className="bg-emerald-600 p-8 rounded-3xl text-white shadow-lg shadow-emerald-500/20 relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-xl font-bold mb-2">Pronto para sair?</h3>
              <p className="text-emerald-100 text-sm mb-6">Reserve um veículo agora de forma rápida e segura.</p>
              <button 
                onClick={() => navigate('/reservations', { state: { openModal: true } })}
                className="w-full py-3 bg-white text-emerald-600 font-bold rounded-xl shadow-md hover:bg-emerald-50 transition-colors"
              >
                Nova Reserva
              </button>
            </div>
            <Car className="absolute -right-8 -bottom-8 text-emerald-500/20 w-48 h-48 rotate-12" />
          </div>

          <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <h3 className="text-lg font-bold mb-6 dark:text-white">Status da Frota</h3>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Disponível', value: stats.totalVehicles - stats.maintenanceCount },
                      { name: 'Manutenção', value: stats.maintenanceCount }
                    ]}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {COLORS.map((color, index) => (
                      <Cell key={`cell-${index}`} fill={color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">Disponível</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">Manutenção</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
