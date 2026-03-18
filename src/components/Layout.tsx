import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { cleanupDuplicateData } from '../services/maintenanceService';
import { 
  LayoutDashboard, 
  Car, 
  Calendar, 
  Wrench, 
  Fuel, 
  AlertTriangle, 
  Users, 
  LogOut, 
  X,
  Sun,
  Moon,
  User as UserIcon,
  Menu,
  Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { SidebarItem } from './SidebarItem';

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  manager: 'Gestor',
  driver: 'Motorista',
  finance: 'Financeiro',
  maintenance: 'Manutenção',
  pending: 'Pendente',
};

export function Layout() {
  const { user, profile, logout } = useAuth();
  const { darkMode, setDarkMode } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const runCleanup = async () => {
      if (profile?.role !== 'admin') return;
      
      try {
        const configRef = doc(db, 'system_config', 'maintenance');
        const configSnap = await getDoc(configRef);
        
        if (!configSnap.exists() || !configSnap.data().cleanup_done) {
          console.log('Running one-time database cleanup...');
          await cleanupDuplicateData();
          await setDoc(configRef, { cleanup_done: true, last_run: new Date() }, { merge: true });
          console.log('Database cleanup completed.');
        }
      } catch (err) {
        console.error('Error during automatic cleanup:', err);
      }
    };
    runCleanup();
  }, [profile]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Visão Geral', path: '/' },
    { icon: Car, label: 'Veículos', path: '/vehicles' },
    { icon: Calendar, label: 'Reservas', path: '/reservations' },
    { icon: Wrench, label: 'Manutenção', path: '/maintenance' },
    { icon: Fuel, label: 'Abastecimento', path: '/fuel' },
    { icon: AlertTriangle, label: 'Multas', path: '/fines' },
  ];

  if (profile?.role === 'admin' || profile?.role === 'manager') {
    menuItems.push({ icon: Building2, label: 'Unidades', path: '/units' });
    menuItems.push({ icon: Users, label: 'Usuários', path: '/users' });
  }

  return (
    <div className="h-screen flex bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans overflow-hidden">
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-sm">
              <Car className="text-white" size={18} />
            </div>
            <span className="font-bold tracking-tight text-lg dark:text-white">ControlFrota</span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 py-6 overflow-y-auto">
          {menuItems.map((item) => (
            <SidebarItem 
              key={item.path}
              icon={item.icon} 
              label={item.label} 
              active={location.pathname === item.path} 
              onClick={() => { navigate(item.path); setIsSidebarOpen(false); }} 
            />
          ))}
          
          <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <SidebarItem 
              icon={darkMode ? Sun : Moon} 
              label={darkMode ? "Tema Claro" : "Tema Escuro"} 
              onClick={() => setDarkMode(!darkMode)} 
            />
            <SidebarItem 
              icon={LogOut} 
              label="Sair" 
              onClick={handleLogout} 
              danger
            />
          </div>
        </nav>

        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg mb-3">
            <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden border border-white dark:border-zinc-600 shadow-sm">
              {user?.photoURL ? <img src={user.photoURL} alt={user.displayName || ''} /> : <UserIcon className="p-2 text-zinc-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate dark:text-white">{profile?.name}</p>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase font-mono">{profile?.role ? (roleLabels[profile.role] || profile.role) : ''}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Mobile Header */}
        <header className="lg:hidden h-16 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center px-4 shrink-0">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500"
          >
            <Menu size={20} />
          </button>
          <div className="ml-4 flex items-center gap-2">
            <div className="w-6 h-6 bg-emerald-500 rounded flex items-center justify-center">
              <Car className="text-white" size={14} />
            </div>
            <span className="font-bold text-sm dark:text-white">ControlFrota</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
