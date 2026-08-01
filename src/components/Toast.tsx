import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

export type ToastVariant = 'error' | 'warning' | 'success' | 'info';

export interface ToastMessage {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  duration?: number; // ms, default 5000
}

// ─── Singleton Toast State ────────────────────────────────────────────────────
type Listener = (toasts: ToastMessage[]) => void;
let toasts: ToastMessage[] = [];
const listeners: Set<Listener> = new Set();

const notify = () => listeners.forEach(l => l([...toasts]));

export const toast = {
  show: (msg: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    toasts = [{ ...msg, id }, ...toasts].slice(0, 5); // max 5 toasts
    notify();
    return id;
  },
  error: (title: string, description?: string) =>
    toast.show({ variant: 'error', title, description, duration: 6000 }),
  warning: (title: string, description?: string) =>
    toast.show({ variant: 'warning', title, description, duration: 5000 }),
  success: (title: string, description?: string) =>
    toast.show({ variant: 'success', title, description, duration: 4000 }),
  info: (title: string, description?: string) =>
    toast.show({ variant: 'info', title, description, duration: 4000 }),
  dismiss: (id: string) => {
    toasts = toasts.filter(t => t.id !== id);
    notify();
  },
  dismissAll: () => {
    toasts = [];
    notify();
  },
};

// ─── Individual Toast Item ────────────────────────────────────────────────────
const VARIANT_STYLES: Record<ToastVariant, { border: string; bg: string; icon: string; IconComp: React.ElementType }> = {
  error:   { border: 'border-red-500/40',    bg: 'bg-red-950/70',    icon: 'text-red-400',    IconComp: AlertCircle },
  warning: { border: 'border-amber-500/40',  bg: 'bg-amber-950/70',  icon: 'text-amber-400',  IconComp: AlertTriangle },
  success: { border: 'border-emerald-500/40',bg: 'bg-emerald-950/70',icon: 'text-emerald-400',IconComp: CheckCircle2 },
  info:    { border: 'border-blue-500/40',   bg: 'bg-blue-950/70',   icon: 'text-blue-400',   IconComp: Info },
};

interface ToastItemProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast: t, onDismiss }) => {
  const [progress, setProgress] = useState(100);
  const duration = t.duration ?? 5000;
  const styles = VARIANT_STYLES[t.variant];
  const { IconComp } = styles;

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining === 0) {
        clearInterval(interval);
        onDismiss(t.id);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [t.id, duration, onDismiss]);

  const progressColor: Record<ToastVariant, string> = {
    error:   'bg-red-500',
    warning: 'bg-amber-400',
    success: 'bg-emerald-400',
    info:    'bg-blue-400',
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 60, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className={`
        relative w-full max-w-sm rounded-2xl border shadow-2xl shadow-black/40 backdrop-blur-xl overflow-hidden
        ${styles.bg} ${styles.border}
      `}
    >
      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gray-800/40">
        <div
          className={`h-full transition-all duration-50 ${progressColor[t.variant]}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-start gap-3 p-4 pr-10">
        <div className={`flex-shrink-0 mt-0.5 ${styles.icon}`}>
          <IconComp className="w-4.5 h-4.5" />
        </div>
        <div className="flex-grow min-w-0">
          <p className="text-sm font-semibold text-white leading-snug">{t.title}</p>
          {t.description && (
            <p className="text-xs text-gray-300 mt-0.5 leading-relaxed">{t.description}</p>
          )}
        </div>
      </div>

      <button
        onClick={() => onDismiss(t.id)}
        className="absolute top-3 right-3 p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        aria-label="Dismiss notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
};

// ─── Toast Container (place once in App root) ─────────────────────────────────
export const ToastContainer: React.FC = () => {
  const [activeToasts, setActiveToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    listeners.add(setActiveToasts);
    return () => { listeners.delete(setActiveToasts); };
  }, []);

  const handleDismiss = (id: string) => toast.dismiss(id);

  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
      style={{ maxWidth: '24rem', width: 'calc(100vw - 2rem)' }}
    >
      <AnimatePresence mode="popLayout">
        {activeToasts.map(t => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onDismiss={handleDismiss} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default ToastContainer;
