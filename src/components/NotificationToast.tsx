import { useEffect, useRef } from 'react';
import { X, Bell, ArrowRight, Users } from 'lucide-react';
import gsap from 'gsap';
import type { FcmNotificationPayload, NotificationType } from '../types';

interface ToastItem extends FcmNotificationPayload {
  id: string;
  timestamp: number;
}

interface NotificationToastProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

function ToastIcon({ type }: { type?: NotificationType }) {
  if (type === 'NEXT_UP') return <Users className="w-4 h-4" />;
  if (type === 'COURT_READY') return <ArrowRight className="w-4 h-4" />;
  return <Bell className="w-4 h-4" />;
}

function ToastColors({ type }: { type?: NotificationType }) {
  if (type === 'NEXT_UP') return 'border-l-amber-500 bg-amber-500/10';
  if (type === 'COURT_READY') return 'border-l-emerald-500 bg-emerald-500/10';
  return 'border-l-red-500 bg-red-500/10';
}

function SingleToast({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    gsap.fromTo(el,
      { x: 120, opacity: 0, scale: 0.9 },
      {
        x: 0, opacity: 1, scale: 1,
        duration: 0.4,
        ease: 'back.out(1.7)',
      }
    );
  }, []);

  const handleDismiss = () => {
    const el = ref.current;
    if (!el) { onDismiss(toast.id); return; }
    gsap.to(el, {
      x: 120, opacity: 0, scale: 0.9,
      duration: 0.25,
      ease: 'power2.in',
      onComplete: () => onDismiss(toast.id),
    });
  };

  return (
    <div
      ref={ref}
      className={`flex items-start gap-3 p-3.5 rounded-xl border border-slate-800/50 shadow-xl backdrop-blur-md ${ToastColors({ type: toast.type })} bg-slate-900/95 min-w-[300px] max-w-sm`}
    >
      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 shrink-0">
        <ToastIcon type={toast.type} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-white truncate">{toast.title}</p>
        <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">{toast.body}</p>
      </div>
      <button
        onClick={handleDismiss}
        className="w-6 h-6 rounded-md flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-800 shrink-0 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function NotificationToast({ toasts, onDismiss }: NotificationToastProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 right-4 md:right-6 z-[150] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <SingleToast toast={toast} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}

export type { ToastItem };
export function createToast(payload: FcmNotificationPayload): ToastItem {
  return {
    ...payload,
    id: Math.random().toString(36).substring(7),
    timestamp: Date.now(),
  };
}
