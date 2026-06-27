import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Sparkles, User, Timer } from 'lucide-react';
import gsap from 'gsap';

export default function WelcomeModal() {
  const { userProfile, updateProfile } = useAuth();
  const [countdown, setCountdown] = useState(10);
  const [isOpen, setIsOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (userProfile && !userProfile.hasSeenWelcomeModal) {
      setIsOpen(true);
      setVisible(true);
    }
  }, [userProfile]);

  useEffect(() => {
    if (isOpen && cardRef.current && overlayRef.current) {
      gsap.fromTo(cardRef.current, 
        { y: 40, opacity: 0, scale: 0.95 },
        { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.7)' }
      );
      gsap.fromTo(overlayRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3 }
      );
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (countdown <= 0) return;

    const interval = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, countdown]);

  if (!visible || !userProfile) return null;

  const handleAcknowledge = async () => {
    if (countdown > 0) return;
    try {
      await updateProfile({ hasSeenWelcomeModal: true });
      if (cardRef.current) {
        gsap.to(cardRef.current, {
          y: 40, opacity: 0, scale: 0.95, duration: 0.25, ease: 'power2.in',
        });
      }
      if (overlayRef.current) {
        gsap.to(overlayRef.current, {
          opacity: 0, duration: 0.2,
          onComplete: () => setVisible(false),
        });
      }
    } catch (err) {
      console.error('Failed to update welcome modal status', err);
    }
  };

  const isQM = userProfile.role === 'QUEUE_MASTER';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      {/* Dark backdrop */}
      <div ref={overlayRef} className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />
      
      {/* Modal card */}
      <div ref={cardRef} className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 md:p-8 relative z-10 shadow-2xl text-center text-slate-100 flex flex-col items-center">
        {/* Animated Accent glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-red-500 via-teal-500 to-red-500 rounded-full blur-sm" />
        
        {/* Large visual icon */}
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-lg ${
          isQM ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
        }`}>
          {isQM ? <Shield className="w-8 h-8" /> : <User className="w-8 h-8" />}
        </div>
        
        <h2 className="text-2xl font-black italic tracking-tight uppercase text-white mb-2">
          {isQM ? 'Queue Master Dashboard' : 'Player Dashboard'}
        </h2>
        
        <div className="bg-slate-950/50 border border-slate-800/80 px-3 py-1 rounded-full text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-4 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
          Role Assigned: {isQM ? 'QM / ADMIN' : 'PLAYER'}
        </div>
        
        <p className="text-slate-400 text-sm leading-relaxed mb-6">
          {isQM ? (
            'As a Queue Master, you have full administrative control over this badminton session. You can manage players, customize court allocations, set pricing modes, track payments, and generate Session IDs for other players to connect in real-time.'
          ) : (
            'Welcome to the session! As a Player, you can view live court allocations, check real-time queue priority, look at your stats, and monitor both local and global rankings directly from your personal dashboard.'
          )}
        </p>

        {/* Countdown warning indicator */}
        {countdown > 0 && (
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider mb-6 bg-slate-950/30 px-4 py-2.5 rounded-xl border border-slate-800/50 w-full justify-center">
            <Timer className="w-4 h-4 text-slate-400 animate-pulse" />
            <span>Please review your role details ({countdown}s)</span>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleAcknowledge}
          disabled={countdown > 0}
          className={`w-full h-14 rounded-2xl font-black tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-2 text-sm ${
            countdown > 0
              ? 'bg-slate-800 border border-slate-700 text-slate-500 cursor-not-allowed'
              : isQM
                ? 'bg-red-500 hover:bg-red-400 text-white shadow-lg shadow-red-500/20 hover:scale-[1.02] active:scale-95'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-95'
          }`}
        >
          {countdown > 0 ? (
            `Let's Play! (${countdown})`
          ) : (
            "Acknowledge & Continue"
          )}
        </button>
      </div>
    </div>
  );
}
