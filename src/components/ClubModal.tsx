import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { X, Users, Loader2, Search, Check, ShieldPlus } from 'lucide-react';
import * as firestoreService from '../services/firestore';
import gsap from 'gsap';

interface ClubModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ClubModal({ isOpen, onClose }: ClubModalProps) {
  const { userProfile, user } = useAuth();
  const overlayRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<'create' | 'join'>('join');
  const [clubName, setClubName] = useState('');
  const [clubDesc, setClubDesc] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setMode('join');
    setClubName('');
    setClubDesc('');
    setJoinCode('');
    setError('');
    setSuccess('');

    if (modalRef.current && overlayRef.current) {
      gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'power2.out' });
      gsap.fromTo(modalRef.current,
        { y: -40, opacity: 0, scale: 0.95 },
        { y: 0, opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(1.7)' }
      );
    }
  }, [isOpen]);

  const handleClose = () => {
    if (modalRef.current && overlayRef.current) {
      gsap.to(modalRef.current, { y: -40, opacity: 0, scale: 0.95, duration: 0.2, ease: 'power2.in' });
      gsap.to(overlayRef.current, { opacity: 0, duration: 0.2, ease: 'power2.in', onComplete: onClose });
    } else {
      onClose();
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userProfile) return;
    if (!clubName.trim()) { setError('Club name is required.'); return; }
    setLoading(true);
    setError('');
    try {
      const clubId = await firestoreService.createClub(user.uid, clubName.trim(), clubDesc.trim(), userProfile.name || 'QM');
      if (clubId) {
        setSuccess('Club created successfully! Share the code with players.');
      } else {
        setError('Failed to create club. Please try again.');
      }
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userProfile) return;
    if (joinCode.trim().length < 4) { setError('Enter a valid club code.'); return; }
    setLoading(true);
    setError('');
    try {
      const club = await firestoreService.getClubByJoinCode(joinCode.trim());
      if (!club) {
        setError('Club not found. Check the code and try again.');
        setLoading(false);
        return;
      }
      const ok = await firestoreService.joinClub(club.id, user.uid, userProfile.name || 'Player');
      if (ok) {
        setSuccess(`Joined "${club.name}"!`);
      } else {
        setError('Failed to join club.');
      }
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const isQM = userProfile?.role === 'QUEUE_MASTER';

  return (
    <div ref={overlayRef} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4" onClick={handleClose}>
      <div ref={modalRef} className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <Users className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white uppercase tracking-tight">Clubs</h2>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">{mode === 'create' ? 'Create a new club' : 'Join an existing club'}</p>
            </div>
          </div>
          <button onClick={handleClose} className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Mode toggle */}
        {isQM && (
          <div className="flex gap-2 mb-6 bg-slate-950/60 rounded-xl p-1 border border-slate-800">
            <button
              onClick={() => { setMode('join'); setError(''); setSuccess(''); }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${mode === 'join' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-white'}`}
            >
              <Search className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
              Join
            </button>
            <button
              onClick={() => { setMode('create'); setError(''); setSuccess(''); }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${mode === 'create' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-white'}`}
            >
              <ShieldPlus className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
              Create
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="text-red-400 text-xs font-bold">{error}</p>
          </div>
        )}

        {success ? (
          <div className="flex flex-col items-center py-8 gap-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <Check className="w-8 h-8 text-emerald-400" />
            </div>
            <p className="text-white font-bold text-sm">{success}</p>
            {mode === 'create' && (
              <p className="text-slate-400 text-xs text-center">Share this code with players to join your club.</p>
            )}
            <button onClick={handleClose} className="px-6 py-2.5 bg-emerald-500 text-[#ffffff] rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-emerald-400 transition-colors">
              Done
            </button>
          </div>
        ) : mode === 'create' ? (
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1.5 block">Club Name</label>
              <input
                value={clubName}
                onChange={(e) => setClubName(e.target.value)}
                placeholder="e.g. Sunday Smash Club"
                maxLength={60}
                className="w-full h-12 bg-slate-950 border border-slate-800 text-white text-sm font-bold rounded-xl px-4 outline-none focus:border-emerald-500 placeholder:text-slate-600"
                required
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1.5 block">Description (optional)</label>
              <textarea
                value={clubDesc}
                onChange={(e) => setClubDesc(e.target.value)}
                placeholder="A short description for your club..."
                maxLength={200}
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 text-white text-sm font-bold rounded-xl px-4 py-3 outline-none focus:border-emerald-500 placeholder:text-slate-600 resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-emerald-500 text-[#ffffff] rounded-xl text-xs font-black uppercase tracking-wider hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldPlus className="w-4 h-4" />}
              {loading ? 'Creating...' : 'Create Club'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoin} className="flex flex-col gap-4">
            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1.5 block">Club Code</label>
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.slice(0, 8).toUpperCase())}
                placeholder="Enter club code"
                className="w-full h-14 bg-slate-950 border border-slate-800 text-white font-mono tracking-widest text-lg font-black text-center rounded-2xl outline-none focus:border-emerald-500 placeholder:text-sm placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-600 placeholder:font-normal uppercase"
                required
              />
              <p className="text-[9px] text-slate-600 mt-1.5 font-bold uppercase tracking-wider">Ask the QM for the club code</p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-emerald-500 text-[#ffffff] rounded-xl text-xs font-black uppercase tracking-wider hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {loading ? 'Joining...' : 'Join Club'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
