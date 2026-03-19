import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Save, 
  Clock, 
  Calendar, 
  ShieldCheck, 
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { motion } from 'motion/react';
import { Card, Button } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { Settings } from '../types';
import { subscribeToSettings, updateSettings, DEFAULT_SETTINGS } from '../services/settingsService';

export function SettingsPage() {
  const { profile } = useAuth();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToSettings(setSettings);
    return () => unsub();
  }, []);

  const handleSave = async () => {
    if (profile?.role !== 'admin') return;
    
    setIsSaving(true);
    setSuccess(false);
    setError(null);
    
    try {
      await updateSettings(settings);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error updating settings:', err);
      setError('Erro ao salvar configurações. Verifique suas permissões.');
    } finally {
      setIsSaving(false);
    }
  };

  if (profile?.role !== 'admin' && profile?.role !== 'manager') {
    return (
      <div className="h-[calc(100vh-160px)] flex flex-col items-center justify-center text-center p-8">
        <ShieldCheck size={48} className="text-zinc-300 mb-4" />
        <h1 className="text-xl font-bold dark:text-white">Acesso Restrito</h1>
        <p className="text-zinc-500">Apenas administradores podem acessar esta página.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">Configurações do Sistema</h1>
          <p className="text-zinc-500 dark:text-zinc-400">Gerencie as regras e parâmetros globais da frota.</p>
        </div>
        {profile?.role === 'admin' && (
          <Button 
            variant="primary" 
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Salvando...' : (
              <>
                <Save size={18} />
                Salvar Alterações
              </>
            )}
          </Button>
        )}
      </div>

      {success && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl flex items-center gap-3 text-emerald-600 dark:text-emerald-400"
        >
          <CheckCircle2 size={20} />
          <p className="text-sm font-bold">Configurações salvas com sucesso!</p>
        </motion.div>
      )}

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400"
        >
          <AlertCircle size={20} />
          <p className="text-sm font-bold">{error}</p>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Regras de Reserva */}
        <Card className="p-8 space-y-6">
          <div className="flex items-center gap-3 text-emerald-500 mb-2">
            <Calendar size={24} />
            <h3 className="text-lg font-bold dark:text-white">Regras de Reserva</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-bold dark:text-white flex items-center justify-between">
                Antecedência Mínima (Horas)
                <span className="text-emerald-500">{settings.minAdvanceHours}h</span>
              </label>
              <input 
                type="range"
                min="0"
                max="48"
                step="1"
                value={settings.minAdvanceHours}
                onChange={e => setSettings({...settings, minAdvanceHours: parseInt(e.target.value)})}
                className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Tempo mínimo entre a solicitação e o início do uso.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold dark:text-white flex items-center justify-between">
                Antecedência Máxima (Dias)
                <span className="text-emerald-500">{settings.maxAdvanceDays} dias</span>
              </label>
              <input 
                type="range"
                min="1"
                max="90"
                step="1"
                value={settings.maxAdvanceDays}
                onChange={e => setSettings({...settings, maxAdvanceDays: parseInt(e.target.value)})}
                className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Limite de tempo para agendamentos futuros.</p>
            </div>
          </div>
        </Card>

        {/* Restrições e Hierarquia */}
        <Card className="p-8 space-y-6">
          <div className="flex items-center gap-3 text-emerald-500 mb-2">
            <ShieldCheck size={24} />
            <h3 className="text-lg font-bold dark:text-white">Restrições</h3>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold dark:text-white">Reservas no Fim de Semana</p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Permitir solicitações para Sáb/Dom</p>
              </div>
              <button 
                onClick={() => setSettings({...settings, allowWeekendReservations: !settings.allowWeekendReservations})}
                className={`w-12 h-6 rounded-full transition-colors relative ${settings.allowWeekendReservations ? 'bg-emerald-500' : 'bg-zinc-200 dark:bg-zinc-800'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.allowWeekendReservations ? 'left-7' : 'left-1'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold dark:text-white">Justificativa por Hierarquia</p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Exigir motivo se veículo {'>'} nível do usuário</p>
              </div>
              <button 
                onClick={() => setSettings({...settings, requireJustificationAboveHierarchy: !settings.requireJustificationAboveHierarchy})}
                className={`w-12 h-6 rounded-full transition-colors relative ${settings.requireJustificationAboveHierarchy ? 'bg-emerald-500' : 'bg-zinc-200 dark:bg-zinc-800'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.requireJustificationAboveHierarchy ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* Informações Adicionais */}
      <div className="bg-zinc-100 dark:bg-zinc-800/50 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 flex items-start gap-4">
        <AlertCircle className="text-zinc-400 shrink-0" size={20} />
        <div>
          <p className="text-sm font-bold dark:text-white mb-1">Nota sobre permissões</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Administradores ignoram as regras de antecedência e restrições de fim de semana ao criar ou editar reservas. 
            As alterações feitas nesta página entram em vigor imediatamente para todos os usuários.
          </p>
        </div>
      </div>
    </div>
  );
}
