import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Monitor, MonitorOff, X } from 'lucide-react';
import gsap from 'gsap';
import * as firestoreService from '../services/firestore';

interface SessionChoiceModalProps {
  isOpen: boolean;
  onStartSession: () => Promise<void>;
  onTemporarySession: () => void;
}

export default function SessionChoiceModal({ isOpen, onStartSession, onTemporarySession }: SessionChoiceModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && cardRef.current) {
      gsap.fromTo(cardRef.current,
        { y: 50, opacity: 0, scale: 0.9 },
        { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.7)' }
      );
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div ref={cardRef} className="relative bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500" />

            <div className="p-6 pt-10 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20 mb-4">
                <Monitor className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-xl font-black text-white mb-2">Welcome, Queue Master</h2>
              <p className="text-sm text-slate-400 leading-relaxed mb-6 max-w-xs">
                Choose how you want to manage today's session. You can change this anytime from the top menu.
              </p>

              <button
                onClick={onStartSession}
                className="w-full h-14 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-3 mb-3 shadow-lg shadow-emerald-500/15"
              >
                <Monitor className="w-5 h-5" />
                <div className="text-left">
                  <div>Start a Session</div>
                  <div className="text-[10px] font-bold opacity-70">Isolated matches &amp; player data</div>
                </div>
              </button>

              <button
                onClick={onTemporarySession}
                className="w-full h-14 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-3 border border-slate-700"
              >
                <MonitorOff className="w-5 h-5 text-slate-400" />
                <div className="text-left">
                  <div>Temporary Session</div>
                  <div className="text-[10px] font-bold opacity-70 text-slate-400">No data isolation</div>
                </div>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}