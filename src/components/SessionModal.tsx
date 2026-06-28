import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Copy, QrCode, Key, Monitor, MonitorOff, Check, Loader2, Shield, Users } from 'lucide-react';
import gsap from 'gsap';
import * as firestoreService from '../services/firestore';

interface SessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  currentSessionId: string;
  setCurrentSessionId: (id: string) => void;
}

export default function SessionModal({ isOpen, onClose, user, currentSessionId, setCurrentSessionId }: SessionModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<'start' | 'done'>(currentSessionId ? 'done' : 'start');
  const [loading, setLoading] = useState(false);
  const [sessionCode, setSessionCode] = useState<string>(() => {
    if (!user) return '';
    return localStorage.getItem(`rallyup_session_${user.uid}`) || '';
  });
  const [copySuccess, setCopySuccess] = useState(false);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    if (isOpen && cardRef.current) {
      gsap.fromTo(cardRef.current,
        { y: 40, opacity: 0, scale: 0.92 },
        { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.7)' }
      );
    }
  }, [isOpen]);

  const handleClose = () => {
    if (cardRef.current) {
      gsap.to(cardRef.current, {
        y: 40, opacity: 0, scale: 0.92, duration: 0.25, ease: 'power2.in',
        onComplete: onClose,
      });
    } else {
      onClose();
    }
  };

  const handleStartSession = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const matchSessionId = currentSessionId || 'sess_' + Math.random().toString(36).substring(2, 10);
      if (!currentSessionId) setCurrentSessionId(matchSessionId);
      await firestoreService.saveSessionMapping(code, user.uid, true, matchSessionId);
      localStorage.setItem(`rallyup_session_${user.uid}`, code);
      setSessionCode(code);
      setStep('done');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEndSession = async () => {
    if (!user || !sessionCode) return;
    setLoading(true);
    try {
      await firestoreService.saveSessionMapping(sessionCode, user.uid, false);
      localStorage.removeItem(`rallyup_session_${user.uid}`);
      localStorage.removeItem('rallyup_current_session_id');
      setCurrentSessionId('');
      setSessionCode('');
      setShowQR(false);
      handleClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const shareUrl = sessionCode ? `${window.location.origin}?join=${sessionCode}` : '';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={overlayRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <div
            ref={cardRef}
            className="relative bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500" />

            <button onClick={handleClose} className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
              <X className="w-5 h-5" />
            </button>

            <div className="p-6 pt-10 flex flex-col items-center text-center">
              {step === 'start' ? (
                <>
                  <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20 mb-4">
                    <MonitorOff className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h2 className="text-xl font-black text-white mb-2">Start a Session</h2>
                  <p className="text-sm text-slate-400 leading-relaxed mb-6 max-w-xs">
                    Generate a secure 6-digit code so players can join, view live courts, and see match stats in real time.
                  </p>
                  <button
                    onClick={handleStartSession}
                    disabled={loading}
                    className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                    {loading ? 'Generating...' : 'Generate Session Code'}
                  </button>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20 mb-4">
                    <Shield className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h2 className="text-xl font-black text-white mb-1">Session Active</h2>
                  <p className="text-xs text-slate-500 mb-5">Share this code with your players</p>

                  <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl w-full flex flex-col items-center gap-3">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Session Code</span>
                    <span className="text-5xl font-black text-white font-mono tracking-[0.15em] bg-slate-900 px-6 py-3 rounded-xl border border-slate-800 select-all">
                      {sessionCode}
                    </span>

                    {currentSessionId && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <Monitor className="w-3 h-3 text-emerald-500" />
                        <span className="text-[9px] font-mono text-slate-500">Match Session: {currentSessionId}</span>
                      </div>
                    )}

                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(shareUrl).then(() => {
                            setCopySuccess(true);
                            setTimeout(() => setCopySuccess(false), 2000);
                          });
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-bold rounded-lg uppercase tracking-wider transition-colors"
                      >
                        {copySuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copySuccess ? 'Copied!' : 'Copy Link'}
                      </button>
                      <button
                        onClick={() => setShowQR(!showQR)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-bold rounded-lg uppercase tracking-wider transition-colors"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        QR
                      </button>
                    </div>

                    {showQR && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="bg-white p-3 rounded-xl overflow-hidden"
                      >
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(shareUrl)}`}
                          alt="QR Code"
                          className="w-30 h-30"
                        />
                        <span className="text-[9px] text-slate-500 block mt-1">Scan to join session</span>
                      </motion.div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-4 text-xs text-slate-500 bg-slate-950/30 p-3 rounded-2xl border border-slate-850 w-full">
                    <Users className="w-4 h-4 shrink-0 text-slate-400" />
                    <span>Players enter this code in Settings &gt; Connect to Host Session</span>
                  </div>

                  <button
                    onClick={handleEndSession}
                    disabled={loading}
                    className="w-full h-11 mt-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MonitorOff className="w-4 h-4" />}
                    {loading ? 'Ending...' : 'End Session'}
                  </button>
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}