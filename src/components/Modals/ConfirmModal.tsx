import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '../UI';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
  isAlert?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  isAlert = false
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className={`p-3 rounded-2xl ${variant === 'danger' ? 'bg-red-50 dark:bg-red-500/10 text-red-500' : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500'}`}>
                  <AlertTriangle size={24} />
                </div>
                <button 
                  type="button"
                  onClick={onClose}
                  className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors text-zinc-400"
                >
                  <X size={20} />
                </button>
              </div>
              
              <h3 className="text-xl font-bold dark:text-white mb-2">{title}</h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-8">
                {message}
              </p>
              
              <div className="flex gap-3">
                {!isAlert && (
                  <Button 
                    variant="secondary" 
                    onClick={onClose}
                    className="flex-1"
                  >
                    {cancelText}
                  </Button>
                )}
                <Button 
                  variant={variant} 
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className="flex-1"
                >
                  {isAlert ? 'Entendi' : confirmText}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
