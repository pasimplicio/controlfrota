import React, { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  getDoc, 
  setDoc,
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { UserProfile, Vehicle, Reservation } from './types';
import { 
  LayoutDashboard, 
  Car, 
  Calendar, 
  Wrench, 
  Fuel, 
  AlertTriangle, 
  Users, 
  LogOut, 
  Plus, 
  Search,
  ChevronRight,
  MapPin,
  Clock,
  Shield,
  User as UserIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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

// --- Components ---

const SidebarItem = ({ icon: Icon, label, active, onClick }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
      active 
        ? 'bg-zinc-900 text-white border-r-2 border-emerald-500' 
        : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
    }`}
  >
    <Icon size={18} />
    <span>{label}</span>
  </button>
);

const Card = ({ children, title, subtitle, action }: any) => (
  <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden shadow-sm">
    {(title || action) && (
      <div className="px-6 py-4 border-bottom border-zinc-100 flex justify-between items-center">
        <div>
          {title && <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider">{title}</h3>}
          {subtitle && <p className="text-xs text-zinc-500 mt-1 italic serif">{subtitle}</p>}
        </div>
        {action}
      </div>
    )}
    <div className="p-6">{children}</div>
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const colors: any = {
    active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    maintenance: 'bg-amber-100 text-amber-700 border-amber-200',
    inactive: 'bg-zinc-100 text-zinc-700 border-zinc-200',
    reserved: 'bg-blue-100 text-blue-700 border-blue-200',
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    rejected: 'bg-red-100 text-red-700 border-red-200',
    completed: 'bg-zinc-100 text-zinc-700 border-zinc-200',
  };
  
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${colors[status] || 'bg-zinc-100 text-zinc-700'}`}>
      {status}
    </span>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);

  const seedData = async () => {
    if (vehicles.length > 0) return;
    
    const initialVehicles = [
      { plate: 'ABC-1234', brand: 'Toyota', model: 'Corolla', year: 2023, color: 'Prata', fuelType: 'Flex', currentKm: 15400, status: 'active', type: 'Sedan', unit: 'Matriz', hasGps: true, hasCamera: false },
      { plate: 'XYZ-9876', brand: 'Ford', model: 'Ranger', year: 2022, color: 'Branco', fuelType: 'Diesel', currentKm: 42000, status: 'active', type: 'Pickup', unit: 'Filial Sul', hasGps: true, hasCamera: true },
      { plate: 'KJH-5544', brand: 'Fiat', model: 'Mobi', year: 2021, color: 'Preto', fuelType: 'Flex', currentKm: 28000, status: 'maintenance', type: 'Popular', unit: 'Matriz', hasGps: false, hasCamera: false },
      { plate: 'LMN-0011', brand: 'VW', model: 'Nivus', year: 2024, color: 'Cinza', fuelType: 'Flex', currentKm: 5200, status: 'active', type: 'SUV', unit: 'Matriz', hasGps: true, hasCamera: true },
    ];

    for (const v of initialVehicles) {
      const newDoc = doc(collection(db, 'vehicles'));
      await setDoc(newDoc, v);
    }
  };

  useEffect(() => {
    if (vehicles.length === 0 && profile?.role === 'admin') {
      seedData();
    }
  }, [vehicles, profile]);

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [stats, setStats] = useState({
    totalVehicles: 0,
    activeReservations: 0,
    maintenanceCount: 0,
    pendingApprovals: 0
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const docRef = doc(db, 'users', u.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        } else {
          // Create default profile for new user
          const newProfile: UserProfile = {
            uid: u.uid,
            name: u.displayName || 'Usuário',
            email: u.email || '',
            role: u.email === 'pasimplicio@gmail.com' ? 'admin' : 'driver',
            unit: 'Matriz',
            status: 'active'
          };
          await setDoc(docRef, newProfile);
          setProfile(newProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!profile) return;

    // Real-time vehicles
    const vQuery = query(collection(db, 'vehicles'));
    const unsubscribeV = onSnapshot(vQuery, (snapshot) => {
      const vList = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Vehicle));
      setVehicles(vList);
      setStats(prev => ({
        ...prev,
        totalVehicles: vList.length,
        maintenanceCount: vList.filter(v => v.status === 'maintenance').length
      }));
    });

    // Real-time reservations
    const rQuery = query(collection(db, 'reservations'), orderBy('startDate', 'desc'), limit(50));
    const unsubscribeR = onSnapshot(rQuery, (snapshot) => {
      const rList = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Reservation));
      setReservations(rList);
      setStats(prev => ({
        ...prev,
        activeReservations: rList.filter(r => r.status === 'active').length,
        pendingApprovals: rList.filter(r => r.status === 'pending').length
      }));
    });

    return () => {
      unsubscribeV();
      unsubscribeR();
    };
  }, [profile]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = () => signOut(auth);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-zinc-500 font-mono text-xs uppercase tracking-widest">Carregando ControlFrota...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-zinc-900 p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-2xl overflow-hidden shadow-2xl"
        >
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg rotate-3">
              <Car className="text-white" size={32} />
            </div>
            <h1 className="text-3xl font-bold text-zinc-900 mb-2">ControlFrota</h1>
            <p className="text-zinc-500 mb-8">Gestão inteligente de veículos e frotas corporativas.</p>
            
            <button
              onClick={handleLogin}
              className="w-full flex items-center justify-center gap-3 bg-zinc-900 text-white py-4 rounded-xl font-bold hover:bg-zinc-800 transition-all shadow-lg active:scale-95"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
              Entrar com Google
            </button>
            
            <p className="mt-8 text-[10px] text-zinc-400 uppercase tracking-widest">
              Acesso restrito a colaboradores autorizados
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-zinc-50 text-zinc-900 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-zinc-200 flex flex-col">
        <div className="p-6 flex items-center gap-3 border-b border-zinc-100">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-sm">
            <Car className="text-white" size={18} />
          </div>
          <span className="font-bold tracking-tight text-lg">ControlFrota</span>
        </div>

        <nav className="flex-1 py-6">
          <SidebarItem icon={LayoutDashboard} label="Visão Geral" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <SidebarItem icon={Car} label="Veículos" active={activeTab === 'vehicles'} onClick={() => setActiveTab('vehicles')} />
          <SidebarItem icon={Calendar} label="Reservas" active={activeTab === 'reservations'} onClick={() => setActiveTab('reservations')} />
          <SidebarItem icon={Wrench} label="Manutenção" active={activeTab === 'maintenance'} onClick={() => setActiveTab('maintenance')} />
          <SidebarItem icon={Fuel} label="Abastecimento" active={activeTab === 'fuel'} onClick={() => setActiveTab('fuel')} />
          <SidebarItem icon={AlertTriangle} label="Multas" active={activeTab === 'fines'} onClick={() => setActiveTab('fines')} />
          {(profile?.role === 'admin' || profile?.role === 'manager') && (
            <SidebarItem icon={Users} label="Usuários" active={activeTab === 'users'} onClick={() => setActiveTab('users')} />
          )}
        </nav>

        <div className="p-4 border-t border-zinc-100">
          <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-lg mb-3">
            <div className="w-10 h-10 rounded-full bg-zinc-200 overflow-hidden border border-white shadow-sm">
              {user.photoURL ? <img src={user.photoURL} alt={user.displayName || ''} /> : <UserIcon className="p-2 text-zinc-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate">{profile?.name}</p>
              <p className="text-[10px] text-zinc-500 uppercase font-mono">{profile?.role}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={14} />
            Sair do Sistema
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="h-16 bg-white border-b border-zinc-200 px-8 flex items-center justify-between sticky top-0 z-10">
          <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500">
            {activeTab === 'dashboard' ? 'Dashboard de Operações' : activeTab.toUpperCase()}
          </h2>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
              <input 
                type="text" 
                placeholder="Buscar veículo, placa, motorista..." 
                className="pl-10 pr-4 py-2 bg-zinc-100 border-none rounded-full text-xs w-64 focus:ring-2 focus:ring-emerald-500 transition-all"
              />
            </div>
            <button className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors">
              <Shield size={20} />
            </button>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white p-6 border border-zinc-200 rounded-xl shadow-sm">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Total da Frota</p>
                    <div className="flex items-end justify-between">
                      <h3 className="text-3xl font-light">{stats.totalVehicles}</h3>
                      <Car className="text-emerald-500 mb-1" size={24} />
                    </div>
                  </div>
                  <div className="bg-white p-6 border border-zinc-200 rounded-xl shadow-sm">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Em Uso Agora</p>
                    <div className="flex items-end justify-between">
                      <h3 className="text-3xl font-light">{stats.activeReservations}</h3>
                      <MapPin className="text-blue-500 mb-1" size={24} />
                    </div>
                  </div>
                  <div className="bg-white p-6 border border-zinc-200 rounded-xl shadow-sm">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Em Manutenção</p>
                    <div className="flex items-end justify-between">
                      <h3 className="text-3xl font-light">{stats.maintenanceCount}</h3>
                      <Wrench className="text-amber-500 mb-1" size={24} />
                    </div>
                  </div>
                  <div className="bg-white p-6 border border-zinc-200 rounded-xl shadow-sm">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Aprovações Pendentes</p>
                    <div className="flex items-end justify-between">
                      <h3 className="text-3xl font-light">{stats.pendingApprovals}</h3>
                      <Clock className="text-red-500 mb-1" size={24} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Recent Activity */}
                  <div className="lg:col-span-2 space-y-6">
                    <Card 
                      title="Últimas Reservas" 
                      subtitle="Monitoramento em tempo real de solicitações"
                      action={
                        <button className="text-[10px] font-bold text-emerald-600 hover:underline uppercase tracking-widest">Ver Todas</button>
                      }
                    >
                      <div className="space-y-1">
                        <div className="grid grid-cols-5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest pb-3 border-b border-zinc-100 px-2">
                          <div className="col-span-2">Veículo / Motorista</div>
                          <div>Data / Hora</div>
                          <div>Status</div>
                          <div className="text-right">Ação</div>
                        </div>
                        {reservations.length === 0 ? (
                          <div className="py-12 text-center text-zinc-400 italic text-sm">Nenhuma reserva encontrada.</div>
                        ) : (
                          reservations.slice(0, 5).map((res) => {
                            const vehicle = vehicles.find(v => v.id === res.vehicleId);
                            return (
                              <div key={res.id} className="grid grid-cols-5 items-center py-4 px-2 hover:bg-zinc-50 transition-colors border-b border-zinc-50 last:border-0">
                                <div className="col-span-2 flex items-center gap-3">
                                  <div className="w-8 h-8 bg-zinc-100 rounded flex items-center justify-center text-zinc-500">
                                    <Car size={16} />
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold">{vehicle?.brand} {vehicle?.model} <span className="text-zinc-400 ml-1 font-mono">{vehicle?.plate}</span></p>
                                    <p className="text-[10px] text-zinc-500">ID Motorista: {res.driverId.slice(0, 8)}...</p>
                                  </div>
                                </div>
                                <div className="text-[10px] font-mono text-zinc-500">
                                  {format(new Date(res.startDate), 'dd/MM HH:mm')}
                                </div>
                                <div>
                                  <StatusBadge status={res.status} />
                                </div>
                                <div className="text-right">
                                  <button className="p-1 hover:bg-zinc-200 rounded transition-colors">
                                    <ChevronRight size={14} className="text-zinc-400" />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </Card>

                    <Card title="Uso da Frota (Últimos 7 dias)" subtitle="Quilometragem total percorrida">
                      <div className="h-64 mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={[
                            { name: 'Seg', km: 450 },
                            { name: 'Ter', km: 320 },
                            { name: 'Qua', km: 580 },
                            { name: 'Qui', km: 410 },
                            { name: 'Sex', km: 620 },
                            { name: 'Sáb', km: 150 },
                            { name: 'Dom', km: 80 },
                          ]}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#999' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#999' }} />
                            <Tooltip 
                              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                              cursor={{ fill: '#f8f8f8' }}
                            />
                            <Bar dataKey="km" fill="#10b981" radius={[4, 4, 0, 0]} barSize={32} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </Card>
                  </div>

                  {/* Sidebar Widgets */}
                  <div className="space-y-8">
                    <Card title="Status da Frota" subtitle="Distribuição por situação">
                      <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: 'Ativo', value: vehicles.filter(v => v.status === 'active').length },
                                { name: 'Manutenção', value: vehicles.filter(v => v.status === 'maintenance').length },
                                { name: 'Reservado', value: vehicles.filter(v => v.status === 'reserved').length },
                                { name: 'Inativo', value: vehicles.filter(v => v.status === 'inactive').length },
                              ]}
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              <Cell fill="#10b981" />
                              <Cell fill="#f59e0b" />
                              <Cell fill="#3b82f6" />
                              <Cell fill="#71717a" />
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                          <span className="text-[10px] font-bold uppercase text-zinc-500">Ativo</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                          <span className="text-[10px] font-bold uppercase text-zinc-500">Manutenção</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                          <span className="text-[10px] font-bold uppercase text-zinc-500">Reservado</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-zinc-500"></div>
                          <span className="text-[10px] font-bold uppercase text-zinc-500">Inativo</span>
                        </div>
                      </div>
                    </Card>

                    <div className="bg-zinc-900 rounded-xl p-6 text-white shadow-xl relative overflow-hidden">
                      <div className="relative z-10">
                        <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-2">Acesso Rápido</p>
                        <h4 className="text-xl font-bold mb-4">Nova Reserva</h4>
                        <p className="text-xs text-zinc-400 mb-6">Solicite um veículo para sua próxima viagem de trabalho.</p>
                        <button 
                          onClick={() => setActiveTab('reservations')}
                          className="w-full py-3 bg-emerald-500 text-white rounded-lg font-bold text-xs hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
                        >
                          SOLICITAR AGORA
                        </button>
                      </div>
                      <Car className="absolute -right-8 -bottom-8 text-white/5 rotate-12" size={160} />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'vehicles' && (
              <motion.div 
                key="vehicles"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h1 className="text-2xl font-bold text-zinc-900">Gestão de Veículos</h1>
                    <p className="text-sm text-zinc-500">Controle total da frota ativa e inativa</p>
                  </div>
                  {(profile?.role === 'admin' || profile?.role === 'manager') && (
                    <button 
                      onClick={() => setIsVehicleModalOpen(true)}
                      className="flex items-center gap-2 bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg hover:bg-zinc-800 transition-all"
                    >
                      <Plus size={18} />
                      Cadastrar Veículo
                    </button>
                  )}
                </div>

                {/* Simple Modal Overlay */}
                {isVehicleModalOpen && (
                  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
                    >
                      <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
                        <h3 className="font-bold text-lg">Novo Veículo</h3>
                        <button onClick={() => setIsVehicleModalOpen(false)} className="text-zinc-400 hover:text-zinc-900">×</button>
                      </div>
                      <div className="p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] font-bold text-zinc-400 uppercase">Placa</label>
                            <input type="text" className="w-full mt-1 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm" placeholder="ABC-1234" />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-zinc-400 uppercase">Marca</label>
                            <input type="text" className="w-full mt-1 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm" placeholder="Toyota" />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-zinc-400 uppercase">Modelo</label>
                          <input type="text" className="w-full mt-1 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm" placeholder="Corolla" />
                        </div>
                        <div className="flex justify-end gap-3 mt-8">
                          <button onClick={() => setIsVehicleModalOpen(false)} className="px-4 py-2 text-sm font-bold text-zinc-500">Cancelar</button>
                          <button className="px-6 py-2 bg-emerald-500 text-white rounded-lg text-sm font-bold shadow-lg shadow-emerald-500/20">Salvar Veículo</button>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                )}


                <Card>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-100">
                          <th className="px-4 py-3">Veículo</th>
                          <th className="px-4 py-3">Placa</th>
                          <th className="px-4 py-3">Tipo</th>
                          <th className="px-4 py-3">KM Atual</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vehicles.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-12 text-center text-zinc-400 italic text-sm">Nenhum veículo cadastrado.</td>
                          </tr>
                        ) : (
                          vehicles.map((v) => (
                            <tr key={v.id} className="border-b border-zinc-50 hover:bg-zinc-50 transition-colors group">
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-zinc-100 rounded-lg flex items-center justify-center text-zinc-500 group-hover:bg-white group-hover:shadow-sm transition-all">
                                    <Car size={20} />
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold">{v.brand} {v.model}</p>
                                    <p className="text-[10px] text-zinc-500">{v.year} • {v.color}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4 font-mono text-xs font-bold text-zinc-600">{v.plate}</td>
                              <td className="px-4 py-4 text-xs text-zinc-500">{v.type}</td>
                              <td className="px-4 py-4 text-xs font-mono text-zinc-500">{v.currentKm.toLocaleString()} km</td>
                              <td className="px-4 py-4">
                                <StatusBadge status={v.status} />
                              </td>
                              <td className="px-4 py-4 text-right">
                                <button className="text-zinc-400 hover:text-zinc-900 transition-colors p-1">
                                  <ChevronRight size={18} />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Placeholder for other tabs */}
            {['reservations', 'maintenance', 'fuel', 'fines', 'users'].includes(activeTab) && (
              <motion.div 
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-24 text-center"
              >
                <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-300 mb-6">
                  <LayoutDashboard size={40} />
                </div>
                <h3 className="text-xl font-bold text-zinc-900 mb-2">Módulo em Desenvolvimento</h3>
                <p className="text-zinc-500 max-w-md">Esta funcionalidade está sendo implementada para garantir a melhor experiência de gestão de frota.</p>
                <button 
                  onClick={() => setActiveTab('dashboard')}
                  className="mt-8 text-emerald-600 font-bold text-sm hover:underline"
                >
                  Voltar para o Dashboard
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
