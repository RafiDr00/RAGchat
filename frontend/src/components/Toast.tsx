'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

export type ToastType = 'error' | 'success' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (message: string, type: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const addToast = React.useCallback(
    (message: string, type: ToastType, duration: number = 4000) => {
      const id = Math.random().toString(36).substring(7);
      const toast: Toast = { id, message, type, duration };

      setToasts((prev) => [...prev, toast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    []
  );

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

interface ToastContainerProps {
  toasts: Toast[];
  removeToast: (id: string) => void;
}

function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
  return (
    <div className="fixed bottom-8 right-8 z-50 flex flex-col gap-3">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onRemove={() => removeToast(toast.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

interface ToastItemProps {
  toast: Toast;
  onRemove: () => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const bgColor =
    toast.type === 'error'
      ? 'bg-rose-500/20 border-rose-500/50'
      : toast.type === 'success'
        ? 'bg-emerald-500/20 border-emerald-500/50'
        : 'bg-cyan-500/20 border-cyan-500/50';

  const textColor =
    toast.type === 'error'
      ? 'text-rose-200'
      : toast.type === 'success'
        ? 'text-emerald-200'
        : 'text-cyan-200';

  const IconComponent =
    toast.type === 'error'
      ? AlertCircle
      : toast.type === 'success'
        ? CheckCircle2
        : AlertCircle;

  const iconColor =
    toast.type === 'error'
      ? 'text-rose-400'
      : toast.type === 'success'
        ? 'text-emerald-400'
        : 'text-cyan-400';

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, y: -20 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, x: 100 }}
      className={`glass-premium border ${bgColor} ${textColor} px-4 py-3 rounded-lg flex items-center gap-3 max-w-sm backdrop-blur-xl`}
    >
      <IconComponent className={`w-5 h-5 flex-shrink-0 ${iconColor}`} />
      <p className="text-sm font-medium flex-1">{toast.message}</p>
      <button
        onClick={onRemove}
        className="flex-shrink-0 text-white/40 hover:text-white/60 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}
