import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  orderBy, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  Wrench, 
  Plus, 
  Search, 
  Phone, 
  Mail, 
  MapPin, 
  MoreVertical, 
  Trash2, 
  Edit2,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Workshop } from '../types';
import { Button, Card, StatusBadge } from '../components/UI';
import { useAuth } from '../context/AuthContext';

export function WorkshopsPage() {
  const { profile } = useAuth();
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorkshop, setEditingWorkshop] = useState<Workshop | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'workshops'), orderBy('name', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setWorkshops(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Workshop)));
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      cnpj: formData.get('cnpj') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      address: formData.get('address') as string,
      city: formData.get('city') as string,
      state: formData.get('state') as string,
      specialties: (formData.get('specialties') as string).split(',').map(s => s.trim()),
      status: formData.get('status') as 'active' | 'inactive',
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingWorkshop) {
        await updateDoc(doc(db, 'workshops', editingWorkshop.id), data);
      } else {
        await addDoc(collection(db, 'workshops'), {
          ...data,
          createdAt: serverTimestamp(),
        });
      }
      setIsModalOpen(false);
      setEditingWorkshop(null);
    } catch (error) {
      console.error('Error saving workshop:', error);
    }
  };

  const filteredWorkshops = workshops.filter(w => 
    w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.specialties.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Oficinas e Prestadores</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Gerencie a rede de oficinas credenciadas.</p>
        </div>
        {(profile?.role === 'admin' || profile?.role === 'manager' || profile?.role === 'maintenance') && (
          <Button variant="primary" onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
            <Plus size={18} />
            Nova Oficina
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por nome ou especialidade..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredWorkshops.map((workshop) => (
          <Card key={workshop.id} className="group relative overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl flex items-center justify-center">
                    <Wrench className="text-emerald-500" size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold dark:text-white">{workshop.name}</h3>
                    <StatusBadge status={workshop.status} />
                  </div>
                </div>
                {(profile?.role === 'admin' || profile?.role === 'manager' || profile?.role === 'maintenance') && (
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => {
                        setEditingWorkshop(workshop);
                        setIsModalOpen(true);
                      }}
                      className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-zinc-500"
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-2 text-sm text-zinc-500 dark:text-zinc-400">
                <div className="flex items-center gap-2">
                  <Phone size={14} />
                  <span>{workshop.phone}</span>
                </div>
                {workshop.email && (
                  <div className="flex items-center gap-2">
                    <Mail size={14} />
                    <span>{workshop.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <MapPin size={14} />
                  <span className="line-clamp-1">{workshop.address}, {workshop.city} - {workshop.state}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {workshop.specialties.map((spec, i) => (
                  <span 
                    key={i}
                    className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] font-bold uppercase rounded-md"
                  >
                    {spec}
                  </span>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <h2 className="text-xl font-bold dark:text-white">
                  {editingWorkshop ? 'Editar Oficina' : 'Nova Oficina'}
                </h2>
                <button onClick={() => { setIsModalOpen(false); setEditingWorkshop(null); }} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors">
                  <Plus className="rotate-45 text-zinc-500" size={24} />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Nome da Oficina</label>
                    <input
                      name="name"
                      required
                      defaultValue={editingWorkshop?.name}
                      className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">CNPJ</label>
                    <input
                      name="cnpj"
                      defaultValue={editingWorkshop?.cnpj}
                      className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Telefone</label>
                    <input
                      name="phone"
                      required
                      defaultValue={editingWorkshop?.phone}
                      className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">E-mail</label>
                    <input
                      name="email"
                      type="email"
                      defaultValue={editingWorkshop?.email}
                      className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-white"
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Endereço</label>
                    <input
                      name="address"
                      required
                      defaultValue={editingWorkshop?.address}
                      className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Cidade</label>
                    <input
                      name="city"
                      required
                      defaultValue={editingWorkshop?.city}
                      className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Estado</label>
                    <input
                      name="state"
                      required
                      defaultValue={editingWorkshop?.state}
                      className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-white"
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Especialidades (separadas por vírgula)</label>
                    <input
                      name="specialties"
                      required
                      defaultValue={editingWorkshop?.specialties.join(', ')}
                      placeholder="Mecânica, Elétrica, Lanternagem..."
                      className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-white"
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Status</label>
                    <select
                      name="status"
                      defaultValue={editingWorkshop?.status || 'active'}
                      className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all dark:text-white"
                    >
                      <option value="active">Ativa</option>
                      <option value="inactive">Inativa</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <Button variant="secondary" className="flex-1" onClick={() => { setIsModalOpen(false); setEditingWorkshop(null); }}>
                    Cancelar
                  </Button>
                  <Button variant="primary" className="flex-1" type="submit">
                    Salvar
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
