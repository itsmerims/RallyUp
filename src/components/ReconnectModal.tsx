import React, { useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import * as firestoreService from '../services/firestore';
import gsap from 'gsap';
import { Loader2 } from 'lucide-react';

interface ReconnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ReconnectModal({ isOpen, onClose }: ReconnectModalProps) {
  const { userProfile } = useAuth();
  const overlayRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = React.useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (modalRef.current && overlayRef.current) {
      gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.2 });
      gsap.fromTo(modalRef.current,
        { y: -40, opacity: 0, scale: 0.95 },
        { y: 0, opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(1.7)' }
      );
    }
  }, [isOpen]);

  const handleChoice = async (status: 'waiting' | 'timeout') => {
    const qmUserId = localStorage.getItem('rallyup_joined_qm');
    if (!qmUserId || !userProfile) return;
    setLoading(true);
    try {
      await firestoreService.updatePlayer(qmUserId, userProfile.id, { status, waitingSince: Date.now() });
      localStorage.removeItem('rallyup_reconnected');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div ref={overlayRef} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div ref={modalRef} className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-center">
        <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">👋</span>
        </div>
        <h2 className="text-lg font-black text-white uppercase tracking-tight mb-2">Welcome Back!</h2>
        <p className="text-slate-400 text-sm mb-6">
          You were previously in this session. Would you like to play now or take a timeout?
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => handleChoice('waiting')}
            disabled={loading}
            className="w-full h-12 bg-emerald-500 text-[#ffffff] rounded-xl text-xs font-black uppercase tracking-wider hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Play Now
          </button>
          <button
            onClick={() => handleChoice('timeout')}
            disabled={loading}
            className="w-full h-12 bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Timeout
          </button>
        </div>
      </div>
    </div>
  );
}
