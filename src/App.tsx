import React, { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  getDoc, 
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  where,
  orderBy,
  limit,
  getDocFromServer
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { handleFirestoreError, OperationType } from './services/firestore';
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
  Check,
  Edit2,
  Trash2,
  Search,
  ChevronRight,
  MapPin,
  Clock,
  Shield,
  User as UserIcon,
  Menu,
  X
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

// --- Constants & Helpers ---

const statusLabels: Record<string, string> = {
  active: 'Ativo',
  maintenance: 'Manutenção',
  inactive: 'Inativo',
  reserved: 'Reservado',
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
  completed: 'Concluído',
  blocked: 'Bloqueado',
};

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  manager: 'Gestor',
  driver: 'Motorista',
  finance: 'Financeiro',
  maintenance: 'Manutenção',
  pending: 'Pendente',
};

const tabLabels: Record<string, string> = {
  dashboard: 'Visão Geral',
  vehicles: 'Veículos',
  reservations: 'Reservas',
  maintenance: 'Manutenção',
  fuel: 'Abastecimento',
  fines: 'Multas',
  users: 'Usuários',
};

const vehicleTypeLabels: Record<string, string> = {
  sedan: 'Sedan',
  pickup: 'Picape',
  popular: 'Popular',
  suv: 'SUV',
  van: 'Van',
  truck: 'Caminhão',
};

// --- Components ---

const SidebarItem = ({ icon: Icon, label, active, onClick, danger }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
      active 
        ? 'bg-zinc-900 text-white border-r-2 border-emerald-500' 
        : danger 
          ? 'text-red-500 hover:bg-red-50'
          : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
    }`}
  >
    <Icon size={18} />
    <span>{label}</span>
  </button>
);

const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, title, message, isAlert }: any) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="p-6">
          <div className={`w-12 h-12 ${isAlert ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'} rounded-full flex items-center justify-center mb-4`}>
            {isAlert ? <Clock size={24} /> : <AlertTriangle size={24} />}
          </div>
          <h3 className="text-lg font-bold text-zinc-900 mb-2">{title}</h3>
          <p className="text-sm text-zinc-500 mb-6">{message}</p>
          
          <div className="flex justify-end gap-3">
            {!isAlert && (
              <button 
                onClick={onClose}
                className="px-4 py-2 text-sm font-bold text-zinc-500 hover:text-zinc-900 transition-colors"
              >
                Cancelar
              </button>
            )}
            <button 
              onClick={isAlert ? onClose : onConfirm}
              className={`px-6 py-2 ${isAlert ? 'bg-zinc-900' : 'bg-red-600'} text-white rounded-lg font-bold hover:opacity-90 transition-all shadow-lg active:scale-95 text-sm`}
            >
              {isAlert ? 'Entendi' : 'Confirmar Exclusão'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const VehicleModal = ({ isOpen, onClose, onSave, vehicle }: any) => {
  const [formData, setFormData] = useState({
    plate: '',
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    color: '',
    fuelType: 'Flex',
    currentKm: 0,
    status: 'active',
    type: 'Sedan',
    unit: 'Matriz',
    hasGps: false,
    hasCamera: false
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (vehicle) {
      setFormData(vehicle);
    } else {
      setFormData({
        plate: '',
        brand: '',
        model: '',
        year: new Date().getFullYear(),
        color: '',
        fuelType: 'Flex',
        currentKm: 0,
        status: 'active',
        type: 'Sedan',
        unit: 'Matriz',
        hasGps: false,
        hasCamera: false
      });
    }
  }, [vehicle, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error('VehicleModal save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="px-6 py-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50 shrink-0">
          <h3 className="font-bold text-zinc-900">{vehicle ? 'Editar Veículo' : 'Novo Veículo'}</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-900 transition-colors" disabled={isSaving}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 overflow-y-auto flex-1">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 ml-1">Placa</label>
                  <input 
                    type="text" 
                    required
                    disabled={isSaving}
                    value={formData.plate}
                    onChange={(e) => setFormData({ ...formData, plate: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm disabled:opacity-50 font-mono"
                    placeholder="ABC-1234"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 ml-1">Tipo</label>
                  <select 
                    value={formData.type}
                    disabled={isSaving}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm disabled:opacity-50"
                  >
                    {Object.entries(vehicleTypeLabels).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 ml-1">Marca</label>
                  <input 
                    type="text" 
                    required
                    disabled={isSaving}
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm disabled:opacity-50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 ml-1">Modelo</label>
                  <input 
                    type="text" 
                    required
                    disabled={isSaving}
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm disabled:opacity-50"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 ml-1">Ano</label>
                  <input 
                    type="number" 
                    required
                    disabled={isSaving}
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm disabled:opacity-50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 ml-1">Cor</label>
                  <input 
                    type="text" 
                    required
                    disabled={isSaving}
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm disabled:opacity-50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 ml-1">Combustível</label>
                  <select 
                    value={formData.fuelType}
                    disabled={isSaving}
                    onChange={(e) => setFormData({ ...formData, fuelType: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm disabled:opacity-50"
                  >
                    <option value="Flex">Flex</option>
                    <option value="Gasolina">Gasolina</option>
                    <option value="Etanol">Etanol</option>
                    <option value="Diesel">Diesel</option>
                    <option value="Elétrico">Elétrico</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 ml-1">KM Atual</label>
                  <input 
                    type="number" 
                    required
                    disabled={isSaving}
                    value={formData.currentKm}
                    onChange={(e) => setFormData({ ...formData, currentKm: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm disabled:opacity-50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 ml-1">Unidade</label>
                  <input 
                    type="text" 
                    required
                    disabled={isSaving}
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm disabled:opacity-50"
                  />
                </div>
              </div>
              <div className="flex gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={formData.hasGps}
                    disabled={isSaving}
                    onChange={(e) => setFormData({ ...formData, hasGps: e.target.checked })}
                    className="w-4 h-4 rounded border-zinc-300 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span className="text-xs text-zinc-600 group-hover:text-zinc-900 transition-colors">Possui GPS</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={formData.hasCamera}
                    disabled={isSaving}
                    onChange={(e) => setFormData({ ...formData, hasCamera: e.target.checked })}
                    className="w-4 h-4 rounded border-zinc-300 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span className="text-xs text-zinc-600 group-hover:text-zinc-900 transition-colors">Possui Câmera</span>
                </label>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 p-6 border-t border-zinc-100 shrink-0 bg-zinc-50/50">
            <button 
              type="button"
              disabled={isSaving}
              onClick={onClose}
              className="px-6 py-2 text-sm font-bold text-zinc-500 hover:text-zinc-900 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={isSaving}
              className="px-8 py-2 bg-zinc-900 text-white rounded-lg font-bold hover:bg-zinc-800 transition-all shadow-lg active:scale-95 text-sm disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? 'Salvando...' : (vehicle ? 'Salvar Alterações' : 'Cadastrar Veículo')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const UserModal = ({ isOpen, onClose, onSave, user }: any) => {
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    name: '',
    email: '',
    cpf: '',
    role: 'pending',
    unit: 'Matriz',
    department: '',
    status: 'pending',
    cnh: '',
    cnhCategory: '',
    cnhExpiry: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData(user);
    } else {
      setFormData({
        name: '',
        email: '',
        cpf: '',
        role: 'pending',
        unit: 'Matriz',
        department: '',
        status: 'pending',
        cnh: '',
        cnhCategory: '',
        cnhExpiry: ''
      });
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      console.log('UserModal form submitted:', formData);
      await onSave(formData);
      console.log('UserModal save successful');
    } catch (error) {
      console.error('UserModal save failed:', error);
      alert('Erro ao salvar usuário. Verifique o console para mais detalhes.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="px-6 py-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50 shrink-0">
          <h3 className="font-bold text-zinc-900">{user ? 'Editar Usuário' : 'Novo Usuário'}</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-900 transition-colors" disabled={isSaving}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 overflow-y-auto flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-zinc-400 ml-1">Nome Completo</label>
                <input 
                  type="text" 
                  required
                  disabled={isSaving}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm disabled:opacity-50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-zinc-400 ml-1">E-mail</label>
                <input 
                  type="email" 
                  required
                  disabled={isSaving}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm disabled:opacity-50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-zinc-400 ml-1">CPF</label>
                <input 
                  type="text" 
                  required
                  disabled={isSaving}
                  value={formData.cpf}
                  onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                  placeholder="000.000.000-00"
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm disabled:opacity-50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-zinc-400 ml-1">Papel / Função</label>
                <select 
                  value={formData.role}
                  disabled={isSaving}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm disabled:opacity-50"
                >
                  {Object.entries(roleLabels).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-zinc-400 ml-1">Status</label>
                <select 
                  value={formData.status}
                  disabled={isSaving}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm disabled:opacity-50"
                >
                  <option value="pending">Pendente</option>
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                  <option value="blocked">Bloqueado</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-zinc-400 ml-1">Unidade</label>
                <input 
                  type="text" 
                  disabled={isSaving}
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm disabled:opacity-50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-zinc-400 ml-1">Departamento</label>
                <input 
                  type="text" 
                  disabled={isSaving}
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm disabled:opacity-50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-zinc-400 ml-1">CNH (Número)</label>
                <input 
                  type="text" 
                  disabled={isSaving}
                  value={formData.cnh}
                  onChange={(e) => setFormData({ ...formData, cnh: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm disabled:opacity-50"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 ml-1">Categoria</label>
                  <input 
                    type="text" 
                    disabled={isSaving}
                    value={formData.cnhCategory}
                    onChange={(e) => setFormData({ ...formData, cnhCategory: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm disabled:opacity-50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 ml-1">Vencimento</label>
                  <input 
                    type="date" 
                    disabled={isSaving}
                    value={formData.cnhExpiry}
                    onChange={(e) => setFormData({ ...formData, cnhExpiry: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm disabled:opacity-50"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 p-6 border-t border-zinc-100 shrink-0 bg-zinc-50/50">
            <button 
              type="button"
              disabled={isSaving}
              onClick={onClose}
              className="px-6 py-2 text-sm font-bold text-zinc-500 hover:text-zinc-900 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={isSaving}
              className="px-8 py-2 bg-emerald-500 text-white rounded-lg font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 active:scale-95 text-sm disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Salvando...
                </>
              ) : 'Salvar Usuário'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const ReservationModal = ({ isOpen, onClose, onSave, reservation, vehicles }: any) => {
  const [formData, setFormData] = useState({
    vehicleId: '',
    reason: '',
    destination: '',
    startDate: '',
    endDate: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (reservation) {
      setFormData({
        vehicleId: reservation.vehicleId || '',
        reason: reservation.reason || '',
        destination: reservation.destination || '',
        startDate: reservation.startDate || '',
        endDate: reservation.endDate || '',
      });
    } else {
      setFormData({
        vehicleId: '',
        reason: '',
        destination: '',
        startDate: '',
        endDate: '',
      });
    }
  }, [reservation, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error('ReservationModal save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="px-6 py-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50 shrink-0">
          <h3 className="font-bold text-zinc-900">{reservation ? 'Editar Reserva' : 'Nova Reserva'}</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-900 transition-colors" disabled={isSaving}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 overflow-y-auto flex-1">
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-zinc-400 ml-1">Veículo</label>
                <select 
                  required
                  disabled={isSaving}
                  value={formData.vehicleId}
                  onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm disabled:opacity-50"
                >
                  <option value="">Selecione um veículo</option>
                  {vehicles.filter((v: any) => v.status === 'active').map((v: any) => (
                    <option key={v.id} value={v.id}>{v.brand} {v.model} ({v.plate})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-zinc-400 ml-1">Motivo / Finalidade</label>
                <input 
                  type="text" 
                  required
                  disabled={isSaving}
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm disabled:opacity-50"
                  placeholder="Ex: Visita técnica ao cliente"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-zinc-400 ml-1">Destino</label>
                <input 
                  type="text" 
                  required
                  disabled={isSaving}
                  value={formData.destination}
                  onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm disabled:opacity-50"
                  placeholder="Cidade ou Unidade de destino"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 ml-1">Início</label>
                  <input 
                    type="datetime-local" 
                    required
                    disabled={isSaving}
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm disabled:opacity-50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 ml-1">Fim (Previsão)</label>
                  <input 
                    type="datetime-local" 
                    required
                    disabled={isSaving}
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm disabled:opacity-50"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 p-6 border-t border-zinc-100 shrink-0 bg-zinc-50/50">
            <button 
              type="button"
              disabled={isSaving}
              onClick={onClose}
              className="px-6 py-2 text-sm font-bold text-zinc-500 hover:text-zinc-900 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={isSaving}
              className="px-8 py-2 bg-zinc-900 text-white rounded-lg font-bold hover:bg-zinc-800 transition-all shadow-lg active:scale-95 text-sm disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? 'Salvando...' : 'Confirmar Reserva'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

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
      {statusLabels[status] || status}
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
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [stats, setStats] = useState({
    totalVehicles: 0,
    activeReservations: 0,
    maintenanceCount: 0,
    pendingApprovals: 0
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isBypass, setIsBypass] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [userName, setUserName] = useState('');
  const [userCpf, setUserCpf] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: 'vehicle' | 'user' | 'reservation' | null;
    id: string | null;
    title: string;
    message: string;
    isAlert?: boolean;
  }>({
    isOpen: false,
    type: null,
    id: null,
    title: '',
    message: '',
    isAlert: false
  });
  const [newVehicle, setNewVehicle] = useState({
    plate: '',
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    color: '',
    fuelType: 'Flex',
    currentKm: 0,
    status: 'active',
    type: 'Sedan',
    unit: 'Matriz',
    hasGps: false,
    hasCamera: false
  });

  const handleUpdateUser = async (uid: string, updates: Partial<UserProfile>) => {
    console.log('Updating user:', uid, updates);
    if (isBypass) {
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, ...updates } : u));
      setIsUserModalOpen(false);
      setEditingUser(null);
      return;
    }
    try {
      await setDoc(doc(db, 'users', uid), updates, { merge: true });
      console.log('User updated in Firestore');
      setIsUserModalOpen(false);
      setEditingUser(null);
    } catch (err) {
      console.error('Error updating user:', err);
      handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
    }
  };

  const handleCreateUser = async (userData: Partial<UserProfile>) => {
    console.log('Creating user:', userData);
    if (isBypass) {
      const uid = Math.random().toString(36).substr(2, 9);
      const newUser: UserProfile = {
        uid,
        name: userData.name || '',
        email: userData.email || '',
        cpf: userData.cpf || '',
        role: userData.role || 'pending',
        unit: userData.unit || 'Matriz',
        status: userData.status || 'pending',
        ...userData
      } as UserProfile;
      setUsers(prev => [...prev, newUser]);
      setIsUserModalOpen(false);
      return;
    }
    try {
      const uid = Math.random().toString(36).substr(2, 9); // Mock UID for manual creation
      const newUser: UserProfile = {
        uid,
        name: userData.name || '',
        email: userData.email || '',
        cpf: userData.cpf || '',
        role: userData.role || 'pending',
        unit: userData.unit || 'Matriz',
        status: userData.status || 'pending',
        ...userData
      } as UserProfile;
      await setDoc(doc(db, 'users', uid), newUser);
      console.log('User created in Firestore');
      setIsUserModalOpen(false);
    } catch (err) {
      console.error('Error creating user:', err);
      handleFirestoreError(err, OperationType.WRITE, 'users');
    }
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    const hasReservations = reservations.some(r => r.vehicleId === vehicleId);
    if (hasReservations && profile?.role !== 'admin') {
      setDeleteConfirm({
        isOpen: true,
        type: null,
        id: null,
        title: 'Não é possível excluir',
        message: 'Este veículo possui reservas vinculadas. Exclua as reservas primeiro para manter a integridade dos dados.',
        isAlert: true
      });
      return;
    }

    setDeleteConfirm({
      isOpen: true,
      type: 'vehicle',
      id: vehicleId,
      title: 'Excluir Veículo',
      message: hasReservations 
        ? 'Este veículo possui reservas. Como administrador, você pode excluí-lo, mas isso pode deixar registros órfãos. Confirmar?' 
        : 'Deseja realmente excluir este veículo? Esta ação não pode ser desfeita.',
      isAlert: false
    });
  };

  const handleDeleteUser = async (uid: string) => {
    const hasReservations = reservations.some(r => r.driverId === uid);
    if (hasReservations && profile?.role !== 'admin') {
      setDeleteConfirm({
        isOpen: true,
        type: null,
        id: null,
        title: 'Não é possível excluir',
        message: 'Este usuário possui reservas vinculadas. Exclua as reservas primeiro para manter a integridade dos dados.',
        isAlert: true
      });
      return;
    }

    setDeleteConfirm({
      isOpen: true,
      type: 'user',
      id: uid,
      title: 'Excluir Usuário',
      message: hasReservations 
        ? 'Este usuário possui reservas. Como administrador, você pode excluí-lo, mas isso pode deixar registros órfãos. Confirmar?' 
        : 'Deseja realmente excluir este usuário? Esta ação não pode ser desfeita.',
      isAlert: false
    });
  };

  const handleDeleteReservation = async (reservationId: string) => {
    const res = reservations.find(r => r.id === reservationId);
    
    // Admins podem excluir qualquer coisa
    if (profile?.role !== 'admin' && res && (res.status === 'active' || res.status === 'approved')) {
      setDeleteConfirm({
        isOpen: true,
        type: null,
        id: null,
        title: 'Não é possível excluir',
        message: 'Não é possível excluir uma reserva ativa ou aprovada. Por favor, cancele a reserva antes de excluí-la.',
        isAlert: true
      });
      return;
    }

    setDeleteConfirm({
      isOpen: true,
      type: 'reservation',
      id: reservationId,
      title: 'Excluir Reserva',
      message: res?.status === 'active' 
        ? 'Esta reserva está ATIVA. Excluí-la agora pode causar inconsistências. Deseja continuar?' 
        : 'Deseja realmente excluir esta reserva? Esta ação não pode ser desfeita.',
      isAlert: false
    });
  };

  const executeDelete = async () => {
    const { type, id } = deleteConfirm;
    if (!type || !id) {
      setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
      return;
    }

    try {
      if (type === 'vehicle') {
        if (isBypass) {
          setVehicles(prev => prev.filter(v => v.id !== id));
        } else {
          await deleteDoc(doc(db, 'vehicles', id));
        }
      } else if (type === 'user') {
        if (isBypass) {
          setUsers(prev => prev.filter(u => u.uid !== id));
        } else {
          await deleteDoc(doc(db, 'users', id));
        }
      } else if (type === 'reservation') {
        if (isBypass) {
          setReservations(prev => prev.filter(r => r.id !== id));
        } else {
          await deleteDoc(doc(db, 'reservations', id));
        }
      }
      setDeleteConfirm({ isOpen: false, type: null, id: null, title: '', message: '' });
    } catch (err) {
      console.error(`Erro ao excluir ${type}:`, err);
      handleFirestoreError(err, OperationType.DELETE, `${type}s/${id}`);
      setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
    }
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setNewVehicle({
      plate: vehicle.plate,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      color: vehicle.color,
      fuelType: vehicle.fuelType,
      currentKm: vehicle.currentKm,
      status: vehicle.status,
      type: vehicle.type,
      unit: vehicle.unit,
      hasGps: vehicle.hasGps,
      hasCamera: vehicle.hasCamera
    });
    setEditingVehicle(vehicle);
    setIsVehicleModalOpen(true);
  };

  const handleAddVehicle = async (vehicleData: any) => {
    if (isBypass) {
      if (editingVehicle) {
        setVehicles(prev => prev.map(v => v.id === editingVehicle.id ? { ...v, ...vehicleData } : v));
      } else {
        const mockId = Math.random().toString(36).substr(2, 9);
        setVehicles([...vehicles, { id: mockId, ...vehicleData }]);
      }
      setIsVehicleModalOpen(false);
      setEditingVehicle(null);
      return;
    }
    try {
      if (editingVehicle) {
        await updateDoc(doc(db, 'vehicles', editingVehicle.id), vehicleData);
      } else {
        await addDoc(collection(db, 'vehicles'), vehicleData);
      }
      setIsVehicleModalOpen(false);
      setEditingVehicle(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'vehicles');
    }
  };

  const handleSaveReservation = async (reservationData: any) => {
    console.log('Saving reservation:', reservationData);
    if (isBypass) {
      if (editingReservation) {
        setReservations(prev => prev.map(r => r.id === editingReservation.id ? { ...r, ...reservationData } : r));
      } else {
        const id = Math.random().toString(36).substr(2, 9);
        setReservations(prev => [...prev, { id, ...reservationData, driverId: user?.uid || 'mock-driver', status: 'pending' }]);
      }
      setIsReservationModalOpen(false);
      setEditingReservation(null);
      return;
    }
    try {
      if (editingReservation) {
        await updateDoc(doc(db, 'reservations', editingReservation.id), reservationData);
      } else {
        await addDoc(collection(db, 'reservations'), {
          ...reservationData,
          driverId: user?.uid,
          status: profile?.role === 'driver' ? 'pending' : 'approved',
          createdAt: new Date().toISOString()
        });
      }
      setIsReservationModalOpen(false);
      setEditingReservation(null);
    } catch (err) {
      console.error('Error saving reservation:', err);
      handleFirestoreError(err, OperationType.WRITE, 'reservations');
    }
  };

  const seedData = async () => {
    if (vehicles.length > 0) return;
    
    const initialVehicles = [
      { plate: 'ABC-1234', brand: 'Toyota', model: 'Corolla', year: 2023, color: 'Prata', fuelType: 'Flex', currentKm: 15400, status: 'active', type: 'Sedan', unit: 'Matriz', hasGps: true, hasCamera: false },
      { plate: 'XYZ-9876', brand: 'Ford', model: 'Ranger', year: 2022, color: 'Branco', fuelType: 'Diesel', currentKm: 42000, status: 'active', type: 'Pickup', unit: 'Filial Sul', hasGps: true, hasCamera: true },
      { plate: 'KJH-5544', brand: 'Fiat', model: 'Mobi', year: 2021, color: 'Preto', fuelType: 'Flex', currentKm: 28000, status: 'maintenance', type: 'Popular', unit: 'Matriz', hasGps: false, hasCamera: false },
      { plate: 'LMN-0011', brand: 'VW', model: 'Nivus', year: 2024, color: 'Cinza', fuelType: 'Flex', currentKm: 5200, status: 'active', type: 'SUV', unit: 'Matriz', hasGps: true, hasCamera: true },
    ];

    for (const v of initialVehicles) {
      try {
        const newDoc = doc(collection(db, 'vehicles'));
        await setDoc(newDoc, v);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'vehicles');
      }
    }
  };

  useEffect(() => {
    if (vehicles.length === 0 && profile?.role === 'admin' && !isBypass && user) {
      seedData();
    }
  }, [vehicles, profile, isBypass, user]);

  useEffect(() => {
    const savedBypass = localStorage.getItem('controlfrota_bypass');
    if (savedBypass) {
      const mockUser = JSON.parse(savedBypass);
      setUser(mockUser);
      setProfile({
        uid: mockUser.uid,
        name: mockUser.displayName,
        email: mockUser.email,
        cpf: '000.000.000-00',
        role: 'admin',
        unit: 'Matriz',
        status: 'active'
      });
      setIsBypass(true);
      setUsers([
        { uid: 'bypass-admin', name: 'Admin Teste', email: 'admin@teste.com', cpf: '000.000.000-00', role: 'admin', unit: 'Matriz', status: 'active' },
        { uid: 'user-1', name: 'João Silva', email: 'joao@teste.com', cpf: '111.111.111-11', role: 'driver', unit: 'Matriz', status: 'active' },
        { uid: 'user-2', name: 'Maria Oliveira', email: 'maria@teste.com', cpf: '222.222.222-22', role: 'manager', unit: 'Filial Sul', status: 'pending' }
      ]);
      setLoading(false);
    }

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (localStorage.getItem('controlfrota_bypass')) return;
      
      setUser(u);
      if (u) {
        setIsBypass(false);
        
        // Test connection to Firestore
        const testConnection = async () => {
          try {
            await getDocFromServer(doc(db, 'test', 'connection'));
          } catch (error) {
            if(error instanceof Error && error.message.includes('the client is offline')) {
              console.error("Please check your Firebase configuration. The client is offline.");
            }
          }
        };
        testConnection();

        try {
          const docRef = doc(db, 'users', u.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          } else {
            const newProfile: UserProfile = {
              uid: u.uid,
              name: u.displayName || 'Usuário',
              email: u.email || '',
              cpf: '', // Will be filled later or by admin
              role: u.email === 'pasimplicio@gmail.com' ? 'admin' : 'pending',
              unit: 'Matriz',
              status: u.email === 'pasimplicio@gmail.com' ? 'active' : 'pending'
            };
            try {
              await setDoc(docRef, newProfile);
              setProfile(newProfile);
            } catch (err) {
              handleFirestoreError(err, OperationType.WRITE, `users/${u.uid}`);
            }
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `users/${u.uid}`);
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

    if (isBypass) {
      // Mock data for bypass mode
      setVehicles([
        { id: '1', model: 'Corolla', brand: 'Toyota', plate: 'ABC-1234', type: 'sedan', status: 'active', fuelType: 'flex', currentKm: 15000, lastMaintenance: '2024-01-15', year: 2022, color: 'Prata', unit: 'Matriz', hasGps: true, hasCamera: false },
        { id: '2', model: 'Hilux', brand: 'Toyota', plate: 'XYZ-9876', type: 'pickup', status: 'reserved', fuelType: 'diesel', currentKm: 45000, lastMaintenance: '2024-02-10', year: 2023, color: 'Branco', unit: 'Matriz', hasGps: true, hasCamera: true },
        { id: '3', model: 'Onix', brand: 'Chevrolet', plate: 'KJH-4433', type: 'hatch', status: 'maintenance', fuelType: 'flex', currentKm: 22000, lastMaintenance: '2023-12-05', year: 2021, color: 'Preto', unit: 'Matriz', hasGps: false, hasCamera: false }
      ] as any);
      setStats({
        totalVehicles: 3,
        activeReservations: 1,
        maintenanceCount: 1,
        pendingApprovals: 0
      });
      return;
    }

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
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'vehicles'));

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
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'reservations'));

    return () => {
      unsubscribeV();
      unsubscribeR();
    };
  }, [profile, isBypass]);

  useEffect(() => {
    if (!profile || profile.role !== 'admin' || isBypass) return;

    const uQuery = query(collection(db, 'users'), orderBy('name', 'asc'));
    const unsubscribeU = onSnapshot(uQuery, (snapshot) => {
      const uList = snapshot.docs.map(d => ({ ...d.data() } as UserProfile));
      setUsers(uList);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));

    return () => unsubscribeU();
  }, [profile, isBypass]);

  const [loginError, setLoginError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoginError(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Login failed", error);
      if (error.code === 'auth/unauthorized-domain') {
        setLoginError("Este domínio não está autorizado no Firebase. Adicione '" + window.location.hostname + "' na lista de domínios autorizados no console do Firebase.");
      } else if (error.code === 'auth/operation-not-allowed') {
        setLoginError("O login com Google não está ativado no seu projeto Firebase.");
      } else {
        setLoginError("Erro ao autenticar: " + (error.message || "Verifique as chaves do Firebase no menu Settings."));
      }
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    
    if (isBypass) {
      if (email === 'admin@teste.com' && password === 'senha123') {
        const mockUser = {
          uid: 'bypass-admin',
          displayName: 'Admin Teste',
          email: 'admin@teste.com',
          photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin'
        };
        setUser(mockUser as any);
        setProfile({
          uid: mockUser.uid,
          name: mockUser.displayName,
          email: mockUser.email,
          cpf: '000.000.000-00',
          role: 'admin',
          unit: 'Matriz',
          status: 'active'
        });
        setIsBypass(true);
        setUsers([
          { uid: 'bypass-admin', name: 'Admin Teste', email: 'admin@teste.com', cpf: '000.000.000-00', role: 'admin', unit: 'Matriz', status: 'active' },
          { uid: 'user-1', name: 'João Silva', email: 'joao@teste.com', cpf: '111.111.111-11', role: 'driver', unit: 'Matriz', status: 'active' },
          { uid: 'user-2', name: 'Maria Oliveira', email: 'maria@teste.com', cpf: '222.222.222-22', role: 'manager', unit: 'Filial Sul', status: 'pending' }
        ]);
        localStorage.setItem('controlfrota_bypass', JSON.stringify(mockUser));
      } else {
        setLoginError("Credenciais de teste inválidas. Use admin@teste.com / senha123");
      }
      return;
    }

    try {
      if (isSignUp) {
        if (!userName || !userCpf) {
          setLoginError("Nome e CPF são obrigatórios para o cadastro.");
          return;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const u = userCredential.user;
        
        const newProfile: UserProfile = {
          uid: u.uid,
          name: userName,
          email: email,
          cpf: userCpf,
          role: 'pending',
          unit: 'Matriz',
          status: 'pending'
        };
        await setDoc(doc(db, 'users', u.uid), newProfile);
        setProfile(newProfile);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      console.error("Auth failed", error);
      setLoginError(error.message);
    }
  };

  const handleLogout = async () => {
    if (isBypass) {
      localStorage.removeItem('controlfrota_bypass');
      setUser(null);
      setProfile(null);
      setIsBypass(false);
    } else {
      try {
        await signOut(auth);
        setProfile(null);
      } catch (error) {
        console.error("Logout failed", error);
      }
    }
  };

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
            
            {loginError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs text-left">
                <p className="font-bold mb-1">Erro de Autenticação:</p>
                <p>{loginError}</p>
              </div>
            )}

            <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
              {isSignUp && (
                <>
                  <div className="text-left">
                    <label className="text-[10px] uppercase font-bold text-zinc-400 ml-1">Nome Completo</label>
                    <input 
                      type="text" 
                      required
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="Seu nome"
                      className="w-full mt-1 px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                    />
                  </div>
                  <div className="text-left">
                    <label className="text-[10px] uppercase font-bold text-zinc-400 ml-1">CPF</label>
                    <input 
                      type="text" 
                      required
                      value={userCpf}
                      onChange={(e) => setUserCpf(e.target.value)}
                      placeholder="000.000.000-00"
                      className="w-full mt-1 px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                    />
                  </div>
                </>
              )}
              <div className="text-left">
                <label className="text-[10px] uppercase font-bold text-zinc-400 ml-1">E-mail</label>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full mt-1 px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                />
              </div>
              <div className="text-left">
                <label className="text-[10px] uppercase font-bold text-zinc-400 ml-1">Senha</label>
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full mt-1 px-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-emerald-500 text-white py-3 rounded-xl font-bold hover:bg-emerald-600 transition-all shadow-lg active:scale-95 text-sm"
              >
                {isSignUp ? 'Criar Conta' : 'Entrar'}
              </button>
            </form>

            <button 
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-xs text-emerald-600 font-bold hover:underline mb-6 block mx-auto"
            >
              {isSignUp ? 'Já tem uma conta? Entre aqui' : 'Não tem conta? Cadastre-se'}
            </button>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-100"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-zinc-400">Ou use Google</span>
              </div>
            </div>

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

            <div className="mt-8 pt-6 border-t border-zinc-100">
              <p className="text-[10px] text-zinc-400 uppercase mb-2">Problemas com o login?</p>
              <p className="text-[10px] text-zinc-500 leading-relaxed">
                Se o login não funcionar, as chaves do Firebase podem não estar configuradas. 
                Vá em <b>Settings</b> e adicione as variáveis <code>VITE_FIREBASE_*</code> conforme o arquivo <code>.env.example</code>.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (profile?.status === 'pending') {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-6 text-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white p-10 rounded-3xl shadow-xl border border-zinc-100"
        >
          <div className="w-20 h-20 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 mb-8 mx-auto rotate-3">
            <Clock size={40} />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 mb-3">Aguardando Aprovação</h1>
          <p className="text-zinc-500 mb-10 leading-relaxed">
            Olá, <span className="font-bold text-zinc-800">{profile.name}</span>! Seu cadastro foi recebido e está em análise. 
            Um administrador revisará seu acesso e atribuirá seu papel no sistema em breve.
          </p>
          <div className="space-y-4">
            <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 text-left">
              <p className="text-[10px] uppercase font-bold text-zinc-400 mb-1">Seu E-mail</p>
              <p className="text-sm font-mono text-zinc-600">{profile.email}</p>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-4 text-sm font-bold text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 rounded-2xl transition-all"
            >
              <LogOut size={18} />
              Sair do Sistema
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-zinc-50 text-zinc-900 font-sans overflow-hidden">
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
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-zinc-200 flex flex-col transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 flex items-center justify-between border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-sm">
              <Car className="text-white" size={18} />
            </div>
            <span className="font-bold tracking-tight text-lg">ControlFrota</span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-2 hover:bg-zinc-100 rounded-lg text-zinc-500"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 py-6 overflow-y-auto">
          <SidebarItem 
            icon={LayoutDashboard} 
            label="Visão Geral" 
            active={activeTab === 'dashboard'} 
            onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }} 
          />
          <SidebarItem 
            icon={Car} 
            label="Veículos" 
            active={activeTab === 'vehicles'} 
            onClick={() => { setActiveTab('vehicles'); setIsSidebarOpen(false); }} 
          />
          <SidebarItem 
            icon={Calendar} 
            label="Reservas" 
            active={activeTab === 'reservations'} 
            onClick={() => { setActiveTab('reservations'); setIsSidebarOpen(false); }} 
          />
          <SidebarItem 
            icon={Wrench} 
            label="Manutenção" 
            active={activeTab === 'maintenance'} 
            onClick={() => { setActiveTab('maintenance'); setIsSidebarOpen(false); }} 
          />
          <SidebarItem 
            icon={Fuel} 
            label="Abastecimento" 
            active={activeTab === 'fuel'} 
            onClick={() => { setActiveTab('fuel'); setIsSidebarOpen(false); }} 
          />
          <SidebarItem 
            icon={AlertTriangle} 
            label="Multas" 
            active={activeTab === 'fines'} 
            onClick={() => { setActiveTab('fines'); setIsSidebarOpen(false); }} 
          />
          {(profile?.role === 'admin' || profile?.role === 'manager') && (
            <SidebarItem 
              icon={Users} 
              label="Usuários" 
              active={activeTab === 'users'} 
              onClick={() => { setActiveTab('users'); setIsSidebarOpen(false); }} 
            />
          )}
          <div className="mt-4 pt-4 border-t border-zinc-100">
            <SidebarItem 
              icon={LogOut} 
              label="Sair" 
              onClick={handleLogout} 
              danger
            />
          </div>
        </nav>

        <div className="p-4 border-t border-zinc-100">
          <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-lg mb-3">
            <div className="w-10 h-10 rounded-full bg-zinc-200 overflow-hidden border border-white shadow-sm">
              {user.photoURL ? <img src={user.photoURL} alt={user.displayName || ''} /> : <UserIcon className="p-2 text-zinc-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate">{profile?.name}</p>
              <p className="text-[10px] text-zinc-500 uppercase font-mono">{profile?.role ? (roleLabels[profile.role] || profile.role) : ''}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-zinc-200 px-6 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-zinc-100 rounded-lg text-zinc-500"
            >
              <Menu size={20} />
            </button>
            <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500">
              {activeTab === 'dashboard' ? 'Dashboard de Operações' : (tabLabels[activeTab] || activeTab).toUpperCase()}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex relative">
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

        <div className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full">
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
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Total da Frota</p>
                    <div className="bg-white p-6 border border-zinc-200 rounded-xl shadow-sm">
                      <div className="flex items-end justify-between">
                        <h3 className="text-3xl font-light">{stats.totalVehicles}</h3>
                        <Car className="text-emerald-500 mb-1" size={24} />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Em Uso Agora</p>
                    <div className="bg-white p-6 border border-zinc-200 rounded-xl shadow-sm">
                      <div className="flex items-end justify-between">
                        <h3 className="text-3xl font-light">{stats.activeReservations}</h3>
                        <MapPin className="text-blue-500 mb-1" size={24} />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Em Manutenção</p>
                    <div className="bg-white p-6 border border-zinc-200 rounded-xl shadow-sm">
                      <div className="flex items-end justify-between">
                        <h3 className="text-3xl font-light">{stats.maintenanceCount}</h3>
                        <Wrench className="text-amber-500 mb-1" size={24} />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Aprovações Pendentes</p>
                    <div className="bg-white p-6 border border-zinc-200 rounded-xl shadow-sm">
                      <div className="flex items-end justify-between">
                        <h3 className="text-3xl font-light">{stats.pendingApprovals}</h3>
                        <Clock className="text-red-500 mb-1" size={24} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Recent Activity */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="space-y-2">
                      <div className="flex justify-between items-end px-1">
                        <div>
                          <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Últimas Reservas</h3>
                          <p className="text-[10px] text-zinc-500 mt-0.5 italic serif">Monitoramento em tempo real de solicitações</p>
                        </div>
                        <button className="text-[10px] font-bold text-emerald-600 hover:underline uppercase tracking-widest">Ver Todas</button>
                      </div>
                      <Card>
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
                    </div>

                    <div className="space-y-2">
                      <div className="px-1">
                        <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Uso da Frota (Últimos 7 dias)</h3>
                        <p className="text-[10px] text-zinc-500 mt-0.5 italic serif">Quilometragem total percorrida</p>
                      </div>
                      <Card>
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
                  </div>

                  {/* Sidebar Widgets */}
                  <div className="space-y-8">
                    <div className="space-y-2">
                      <div className="px-1">
                        <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Status da Frota</h3>
                        <p className="text-[10px] text-zinc-500 mt-0.5 italic serif">Distribuição por situação</p>
                      </div>
                      <Card>
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
                    </div>

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
                className="space-y-6"
              >
                <div className="text-center">
                  <div className="mb-6">
                    <h1 className="text-2xl font-bold text-zinc-900">Gestão de Veículos</h1>
                    <p className="text-sm text-zinc-500">Controle total da frota ativa e inativa</p>
                  </div>
                  <div className="flex justify-center">
                    {(profile?.role === 'admin' || profile?.role === 'manager') && (
                      <button 
                        onClick={() => setIsVehicleModalOpen(true)}
                        className="flex items-center gap-2 bg-zinc-900 text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-lg hover:bg-zinc-800 transition-all active:scale-95"
                      >
                        <Plus size={18} />
                        Cadastrar Veículo
                      </button>
                    )}
                  </div>
                </div>

                {/* Vehicle Modal */}
                <VehicleModal 
                  isOpen={isVehicleModalOpen}
                  onClose={() => { setIsVehicleModalOpen(false); setEditingVehicle(null); }}
                  onSave={handleAddVehicle}
                  vehicle={editingVehicle}
                />


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
                              <td className="px-4 py-4 text-xs text-zinc-500">{vehicleTypeLabels[v.type.toLowerCase()] || v.type}</td>
                              <td className="px-4 py-4 text-xs font-mono text-zinc-500">{(v.currentKm || 0).toLocaleString()} km</td>
                              <td className="px-4 py-4">
                                <StatusBadge status={v.status} />
                              </td>
                              <td className="px-4 py-4 text-right">
                                <div className="flex justify-end gap-2">
                                  <button 
                                    onClick={() => handleEditVehicle(v)}
                                    className="text-zinc-400 hover:text-zinc-900 transition-colors p-1"
                                    title="Editar"
                                  >
                                    <Edit2 size={16} />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteVehicle(v.id)}
                                    className="text-zinc-400 hover:text-red-600 transition-colors p-1"
                                    title="Excluir"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
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

            {activeTab === 'users' && (
              <motion.div
                key="users"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-zinc-900">Gestão de Usuários</h2>
                    <p className="text-sm text-zinc-500">Administração de acessos e permissões</p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <div className="relative w-full sm:w-80">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                      <input 
                        type="text" 
                        placeholder="Buscar usuários..." 
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="pl-10 pr-4 py-2.5 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all w-full shadow-sm"
                      />
                    </div>
                    <button 
                      onClick={() => { setEditingUser(null); setIsUserModalOpen(true); }}
                      className="flex items-center gap-2 bg-emerald-500 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 active:scale-95 text-sm w-full sm:w-auto justify-center"
                    >
                      <Plus size={18} />
                      Novo Usuário
                    </button>
                  </div>
                </div>

                <Card>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-zinc-100">
                          <th className="px-4 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Usuário</th>
                          <th className="px-4 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">E-mail</th>
                          <th className="px-4 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Papel</th>
                          <th className="px-4 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Unidade</th>
                          <th className="px-4 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Status</th>
                          <th className="px-4 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.filter(u => 
                          u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
                          u.email.toLowerCase().includes(userSearch.toLowerCase())
                        ).length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-12 text-center text-zinc-400">Nenhum usuário encontrado.</td>
                          </tr>
                        ) : (
                          users.filter(u => 
                            u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
                            u.email.toLowerCase().includes(userSearch.toLowerCase())
                          ).map((u) => (
                            <tr key={u.uid} className="border-b border-zinc-50 hover:bg-zinc-50/50 transition-colors">
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 font-bold text-xs">
                                    {u.name.charAt(0)}
                                  </div>
                                  <p className="text-sm font-bold">{u.name}</p>
                                </div>
                              </td>
                              <td className="px-4 py-4 text-xs text-zinc-500">{u.email}</td>
                              <td className="px-4 py-4">
                                <select 
                                  value={u.role}
                                  onChange={(e) => handleUpdateUser(u.uid, { role: e.target.value as any })}
                                  className="text-xs bg-transparent border-none focus:ring-0 font-medium text-zinc-600 cursor-pointer hover:text-zinc-900"
                                >
                                  {Object.entries(roleLabels).map(([val, label]) => (
                                    <option key={val} value={val}>{label}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-4 py-4 text-xs text-zinc-500">{u.unit}</td>
                              <td className="px-4 py-4">
                                <select 
                                  value={u.status}
                                  onChange={(e) => handleUpdateUser(u.uid, { status: e.target.value as any })}
                                  className={`text-xs bg-transparent border-none focus:ring-0 font-bold cursor-pointer ${
                                    u.status === 'active' ? 'text-emerald-600' : 
                                    u.status === 'pending' ? 'text-amber-600' : 
                                    'text-zinc-400'
                                  }`}
                                >
                                  <option value="pending">Pendente</option>
                                  <option value="active">Ativo</option>
                                  <option value="inactive">Inativo</option>
                                  <option value="blocked">Bloqueado</option>
                                </select>
                              </td>
                              <td className="px-4 py-4 text-right">
                                <div className="flex justify-end gap-2">
                                  <button 
                                    onClick={() => { setEditingUser(u); setIsUserModalOpen(true); }}
                                    className="text-zinc-400 hover:text-zinc-900 transition-colors p-1"
                                    title="Editar"
                                  >
                                    <Edit2 size={16} />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteUser(u.uid)}
                                    className="text-zinc-400 hover:text-red-600 transition-colors p-1"
                                    title="Excluir"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
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

            {activeTab === 'reservations' && (
              <motion.div
                key="reservations"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-zinc-900">Reservas de Veículos</h2>
                    <p className="text-sm text-zinc-500">Solicite e gerencie o uso da frota</p>
                  </div>
                  <div className="flex justify-center">
                    <button 
                      onClick={() => { setEditingReservation(null); setIsReservationModalOpen(true); }}
                      className="flex items-center gap-2 bg-zinc-900 text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-lg hover:bg-zinc-800 transition-all active:scale-95"
                    >
                      <Plus size={18} />
                      Nova Reserva
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {reservations.length === 0 ? (
                    <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-zinc-100">
                      <Calendar className="mx-auto text-zinc-300 mb-4" size={48} />
                      <p className="text-zinc-500">Nenhuma reserva encontrada.</p>
                    </div>
                  ) : (
                    reservations.map((res) => {
                      const vehicle = vehicles.find(v => v.id === res.vehicleId);
                      const driver = users.find(u => u.uid === res.driverId);
                      return (
                        <Card key={res.id} className="hover:shadow-xl transition-all border-l-4 border-l-emerald-500">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="font-bold text-zinc-900">{vehicle?.model || 'Veículo'}</h3>
                              <p className="text-xs text-zinc-500">{vehicle?.plate || '---'}</p>
                            </div>
                            <StatusBadge status={res.status} />
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-xs text-zinc-600">
                              <UserIcon size={14} className="text-zinc-400" />
                              <span>{driver?.name || 'Motorista'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-zinc-600">
                              <Calendar size={14} className="text-zinc-400" />
                              <span>{new Date(res.startDate).toLocaleString('pt-BR')}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-zinc-600">
                              <MapPin size={14} className="text-zinc-400" />
                              <span>{res.destination || 'Não informado'}</span>
                            </div>
                          </div>
                          <div className="mt-4 pt-4 border-t border-zinc-50 flex justify-end gap-2">
                            <button 
                              onClick={() => handleDeleteReservation(res.id)}
                              className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Excluir"
                            >
                              <Trash2 size={16} />
                            </button>
                            {(profile?.role === 'admin' || profile?.role === 'manager') && res.status === 'pending' && (
                              <>
                                <button 
                                  onClick={() => handleSaveReservation({ ...res, status: 'approved', approvedBy: user?.uid })}
                                  className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                  title="Aprovar"
                                >
                                  <Check size={16} />
                                </button>
                                <button 
                                  onClick={() => handleSaveReservation({ ...res, status: 'rejected' })}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Rejeitar"
                                >
                                  <X size={16} />
                                </button>
                              </>
                            )}
                            <button 
                              onClick={() => { setEditingReservation(res); setIsReservationModalOpen(true); }}
                              className="p-2 text-zinc-400 hover:bg-zinc-100 rounded-lg transition-colors"
                            >
                              <Edit2 size={16} />
                            </button>
                          </div>
                        </Card>
                      );
                    })
                  )}
                </div>
              </motion.div>
            )}

            {/* Placeholder for other tabs */}
            {['maintenance', 'fuel', 'fines'].includes(activeTab) && (
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
      <UserModal 
        isOpen={isUserModalOpen} 
        onClose={() => { setIsUserModalOpen(false); setEditingUser(null); }}
        onSave={(data: any) => editingUser ? handleUpdateUser(editingUser.uid, data) : handleCreateUser(data)}
        user={editingUser}
      />
      <ReservationModal
        isOpen={isReservationModalOpen}
        onClose={() => { setIsReservationModalOpen(false); setEditingReservation(null); }}
        onSave={handleSaveReservation}
        reservation={editingReservation}
        vehicles={vehicles}
      />
      <DeleteConfirmModal 
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm(prev => ({ ...prev, isOpen: false }))}
        onConfirm={executeDelete}
        title={deleteConfirm.title}
        message={deleteConfirm.message}
        isAlert={deleteConfirm.isAlert}
      />
    </div>
  );
}
