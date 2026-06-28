import React, { useRef, useEffect, useState } from 'react';
import { useAppStore } from '../store';
import { useAuth } from '../contexts/AuthContext';
import { Users, Copy, Check, Clock, Crown, LogOut, Loader2, ShieldPlus } from 'lucide-react';
import * as firestoreService from '../services/firestore';
import gsap from 'gsap';
import ClubModal from './ClubModal';

export default function ClubDashboard() {
  const { userProfile } = useAuth();
  const { clubs, clubMembers, setClubs, setClubMembers } = useAppStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [showClubModal, setShowClubModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [leavingId, setLeavingId] = useState<string | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(containerRef.current,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' }
      );
    }
  }, []);

  const isQM = userProfile?.role === 'QUEUE_MASTER';

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(code);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleLeaveClub = async (clubId: string) => {
    if (!userProfile) return;
    setLeavingId(clubId);
    try {
      await firestoreService.leaveClub(clubId, userProfile.id);
      setClubs(clubs.filter(c => c.id !== clubId));
    } finally {
      setLeavingId(null);
    }
  };

  const isOwner = (clubId: string) => userProfile?.id === clubs.find(c => c.id === clubId)?.ownerId;

  if (clubs.length === 0) {
    return (
      <section ref={containerRef} className="h-full flex flex-col items-center justify-center p-8">
        <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4">
          <Users className="w-8 h-8 text-slate-600" />
        </div>
        <h3 className="text-white font-black text-lg uppercase tracking-tight mb-1">No Clubs Yet</h3>
        <p className="text-slate-500 text-xs text-center max-w-xs mb-6">
          {isQM ? 'Create a club for your players to join and stay connected.' : 'Join a club to see its members and activities.'}
        </p>
        <button
          onClick={() => setShowClubModal(true)}
          className="px-6 py-2.5 bg-emerald-500 text-[#ffffff] rounded-xl text-xs font-black uppercase tracking-wider hover:bg-emerald-400 transition-colors flex items-center gap-2"
        >
          <ShieldPlus className="w-4 h-4" />
          {isQM ? 'Create Club' : 'Join Club'}
        </button>
        <ClubModal isOpen={showClubModal} onClose={() => setShowClubModal(false)} />
      </section>
    );
  }

  return (
    <section ref={containerRef} className="h-full overflow-y-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg font-black text-white uppercase tracking-tight">My Clubs</h2>
        </div>
        <button
          onClick={() => setShowClubModal(true)}
          className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-slate-300 hover:text-white transition-colors flex items-center gap-1.5"
        >
          <ShieldPlus className="w-3.5 h-3.5" />
          {isQM ? 'New Club' : 'Join Club'}
        </button>
      </div>

      {clubs.map((club) => {
        const own = club.ownerId === userProfile?.id;
        const members = clubMembers.filter(m => clubs.some(c => c.id === club.id));
        const clubSpecificMembers = clubMembers.filter((_, idx) => clubs[idx]?.id === club.id);
        // Actually use proper filtering - we need per-club members
        // Since clubMembers contains ALL members across all clubs, filter by club
        // But we don't have clubId on ClubMember... We need to restructure
        // For now, just show count from club.memberCount

        return (
          <div key={club.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
            {/* Club header */}
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 mb-1">
                  <h3 className="text-base font-black text-white truncate">{club.name}</h3>
                  {own && (
                    <span className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[8px] px-2 py-0.5 rounded-full uppercase font-black tracking-wider shrink-0">Owner</span>
                  )}
                </div>
                {club.description && (
                  <p className="text-xs text-slate-500 line-clamp-2">{club.description}</p>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Clock className="w-3 h-3 text-slate-600" />
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  {new Date(club.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Club code + member count */}
            <div className="flex items-center justify-between bg-slate-950/60 rounded-2xl p-3 border border-slate-800/80">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-bold text-slate-300">{club.memberCount} member{club.memberCount !== 1 ? 's' : ''}</span>
              </div>
              {own && (
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-black tracking-widest text-emerald-400">{club.joinCode}</span>
                  <button
                    onClick={() => handleCopyCode(club.joinCode)}
                    className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                  >
                    {copiedId === club.joinCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}
            </div>

            {/* Action buttons */}
            {!own && (
              <button
                onClick={() => handleLeaveClub(club.id)}
                disabled={leavingId === club.id}
                className="w-full py-2.5 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-xs font-bold uppercase tracking-wider hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {leavingId === club.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
                Leave Club
              </button>
            )}
          </div>
        );
      })}

      <ClubModal isOpen={showClubModal} onClose={() => setShowClubModal(false)} />
    </section>
  );
}
