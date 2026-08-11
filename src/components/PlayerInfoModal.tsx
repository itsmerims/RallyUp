import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { X, Trophy, TrendingUp, Activity, Award, Check, Loader2 } from 'lucide-react';
import gsap from 'gsap';
import { Player, Match, SkillTier, PlayerStatus } from '../types';

interface PlayerInfoModalProps {
  isOpen: boolean;
  playerId: string | null;
  players: Player[];
  matches: Match[];
  onSave: (playerId: string, updates: Partial<Player>) => Promise<void>;
  onClose: () => void;
}

const tierColors: Record<SkillTier, string> = {
  BEG: 'text-slate-400',
  ADV_BEG: 'text-blue-300',
  LOW_INT: 'text-blue-400',
  INT: 'text-emerald-400',
  MID_INT: 'text-emerald-500',
  UP_INT: 'text-teal-400',
  ADV: 'text-purple-400',
  EXP: 'text-purple-500',
  PRO: 'text-amber-400',
};

const tierBg: Record<SkillTier, string> = {
  BEG: 'bg-slate-500/10 border-slate-500/20',
  ADV_BEG: 'bg-blue-500/10 border-blue-500/20',
  LOW_INT: 'bg-blue-500/10 border-blue-500/20',
  INT: 'bg-emerald-500/10 border-emerald-500/20',
  MID_INT: 'bg-emerald-500/10 border-emerald-500/20',
  UP_INT: 'bg-teal-500/10 border-teal-500/20',
  ADV: 'bg-purple-500/10 border-purple-500/20',
  EXP: 'bg-purple-500/10 border-purple-500/20',
  PRO: 'bg-amber-500/10 border-amber-500/20',
};

const tierList = Object.keys(tierColors) as SkillTier[];
const statusList: PlayerStatus[] = ['waiting', 'reserved', 'active', 'resting', 'timeout'];

export default function PlayerInfoModal({ isOpen, playerId, players, matches, onSave, onClose }: PlayerInfoModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<{ name: string; tier: SkillTier; ratingScore: string; hasPaid: boolean; status: PlayerStatus; timeIn: string; timeOut: string } | null>(null);

  const player = players.find(p => p.id === playerId) || null;

  useEffect(() => {
    if (isOpen && cardRef.current) {
      gsap.fromTo(cardRef.current,
        { y: 40, opacity: 0, scale: 0.96 },
        { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.7)' }
      );
    }
  }, [isOpen]);

  useEffect(() => {
    if (player && isEditing) {
      setForm({
        name: player.name,
        tier: player.tier,
        ratingScore: String(player.ratingScore ?? 1000),
        hasPaid: player.hasPaid,
        status: player.status,
        timeIn: player.timeIn || '',
        timeOut: player.timeOut || '',
      });
    }
  }, [player?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isOpen) setIsEditing(false);
  }, [isOpen]);

  const handleSave = async () => {
    if (!player || !form) return;
    setSaving(true);
    try {
      await onSave(player.id, {
        name: form.name.trim() || player.name,
        tier: form.tier,
        ratingScore: parseInt(form.ratingScore) || (player.ratingScore ?? 1000),
        hasPaid: form.hasPaid,
        status: form.status,
        timeIn: form.timeIn.trim() || undefined,
        timeOut: form.timeOut.trim() || undefined,
      });
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (cardRef.current) {
      gsap.to(cardRef.current, {
        y: 40, opacity: 0, scale: 0.96, duration: 0.25, ease: 'power2.in',
        onComplete: onClose,
      });
    } else {
      onClose();
    }
  };

  if (!isOpen || !player) return null;

  const playerMatches = matches.filter(
    (m) => m.teamA.includes(player.id) || m.teamB.includes(player.id)
  ).reverse();

  const wins = playerMatches.filter((m) => {
    const onA = m.teamA.includes(player.id);
    return m.status === 'Completed' && ((onA && (m.scoreA || 0) > (m.scoreB || 0)) || (!onA && (m.scoreB || 0) > (m.scoreA || 0)));
  }).length;

  const inputClass = "w-full bg-slate-950 border border-slate-800 text-white text-xs font-bold rounded-lg px-2.5 py-2 outline-none focus:border-indigo-500";
  const labelClass = "text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1";

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" onClick={handleClose}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
      />
      <div
        ref={cardRef}
        className="relative bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500" />

        <button onClick={handleClose} className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 pt-10 flex flex-col items-center text-center">
          <div className={`w-16 h-16 rounded-full border-2 flex items-center justify-center text-xl font-black uppercase mb-3 ${tierBg[player.tier] || 'bg-slate-800 border-slate-700'}`}>
            <span className={tierColors[player.tier] || 'text-slate-300'}>{player.name.substring(0, 2)}</span>
          </div>
          <h2 className="text-xl font-black text-white mb-1">{player.name}</h2>
          <span className={`text-xs font-bold uppercase tracking-wider ${tierColors[player.tier] || 'text-slate-400'}`}>
            {player.tier?.replace('_', ' ')} · <span className="text-slate-500 capitalize">{player.status}</span>
          </span>

          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              disabled={saving}
              className="mt-3 text-[11px] font-bold uppercase tracking-wider text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 bg-indigo-500/10 rounded-lg px-4 py-1.5 transition-colors"
            >
              Edit Player
            </button>
          )}

          {isEditing && form ? (
            <div className="w-full mt-5 space-y-3 text-left">
              <div>
                <label className={labelClass}>Name</label>
                <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Tier</label>
                  <select className={inputClass} value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value as SkillTier })}>
                    {tierList.map(tier => <option key={tier} value={tier}>{tier.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Rating</label>
                  <input type="number" className={inputClass} value={form.ratingScore} onChange={(e) => setForm({ ...form, ratingScore: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Status</label>
                  <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as PlayerStatus })}>
                    {statusList.map(status => <option key={status} value={status}>{status}</option>)}
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => setForm({ ...form, hasPaid: !form.hasPaid })}
                    className={`w-full h-[34px] rounded-lg border text-[11px] font-bold uppercase tracking-wider transition-colors ${
                      form.hasPaid ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400' : 'border-slate-800 bg-slate-950 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {form.hasPaid ? 'Paid ✓' : 'Not Paid'}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Time In</label>
                  <input className={inputClass} value={form.timeIn} placeholder="e.g. 18:00" onChange={(e) => setForm({ ...form, timeIn: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>Time Out</label>
                  <input className={inputClass} value={form.timeOut} placeholder="e.g. 20:00" onChange={(e) => setForm({ ...form, timeOut: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setIsEditing(false)}
                  disabled={saving}
                  className="flex-1 h-10 rounded-xl border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-bold uppercase tracking-wider transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 h-10 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black uppercase tracking-wider transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Save
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3 w-full mt-6">
                <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-3 flex flex-col items-center">
                  <Trophy className="w-4 h-4 text-emerald-400 mb-1" />
                  <span className="text-lg font-black text-white">{wins}</span>
                  <span className="text-[9px] text-slate-500 uppercase font-bold">Wins</span>
                </div>
                <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-3 flex flex-col items-center">
                  <Activity className="w-4 h-4 text-amber-400 mb-1" />
                  <span className="text-lg font-black text-white">{playerMatches.length}</span>
                  <span className="text-[9px] text-slate-500 uppercase font-bold">Matches</span>
                </div>
                <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-3 flex flex-col items-center">
                  <Award className="w-4 h-4 text-purple-400 mb-1" />
                  <span className="text-lg font-black text-white">{player.ratingScore || 1000}</span>
                  <span className="text-[9px] text-slate-500 uppercase font-bold">Rating</span>
                </div>
              </div>

              <div className="flex gap-4 mt-3 w-full">
                <div className="flex-1 bg-slate-950/30 border border-slate-800 rounded-xl p-2.5 flex items-center gap-2">
                  <TrendingUp className={`w-4 h-4 ${(player.stats?.currentStreak || 0) > 0 ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <div className="text-left">
                    <div className="text-[9px] text-slate-500 uppercase font-bold">Streak</div>
                    <div className={`text-xs font-black ${(player.stats?.currentStreak || 0) > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {(player.stats?.currentStreak || 0) > 0 ? `+${player.stats?.currentStreak}` : player.stats?.currentStreak || '0'}
                    </div>
                  </div>
                </div>
                <div className="flex-1 bg-slate-950/30 border border-slate-800 rounded-xl p-2.5 flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-400" />
                  <div className="text-left">
                    <div className="text-[9px] text-slate-500 uppercase font-bold">Win Rate</div>
                    <div className="text-xs font-black text-white">
                      {playerMatches.length > 0 ? `${Math.round((wins / playerMatches.length) * 100)}%` : '0%'}
                    </div>
                  </div>
                </div>
              </div>

              {(player.timeIn || form?.timeIn || player.timeOut || form?.timeOut) && (
                <div className="flex gap-4 mt-3 w-full">
                  <div className="flex-1 bg-slate-950/30 border border-slate-800 rounded-xl p-2.5 text-left">
                    <div className="text-[9px] text-slate-500 uppercase font-bold">Time In</div>
                    <div className="text-xs font-black text-white">{player.timeIn || '—'}</div>
                  </div>
                  <div className="flex-1 bg-slate-950/30 border border-slate-800 rounded-xl p-2.5 text-left">
                    <div className="text-[9px] text-slate-500 uppercase font-bold">Time Out</div>
                    <div className="text-xs font-black text-white">{player.timeOut || '—'}</div>
                  </div>
                </div>
              )}

              <div className="w-full mt-4">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left mb-2">Recent Matches</h3>
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                  {playerMatches.slice(0, 10).map((m) => {
                    const onA = m.teamA.includes(player.id);
                    const won = m.status === 'Completed' && ((onA && (m.scoreA || 0) > (m.scoreB || 0)) || (!onA && (m.scoreB || 0) > (m.scoreA || 0)));
                    return (
                      <div key={m.id} className="flex items-center justify-between bg-slate-950/40 border border-slate-800 rounded-xl p-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${m.status === 'Completed' ? (won ? 'bg-emerald-500' : 'bg-red-500') : 'bg-amber-500'}`} />
                          <span className="text-[10px] text-slate-400 truncate">
                            {m.teamA.map(id => players.find(p => p.id === id)?.name || '?').join('/')} vs {m.teamB.map(id => players.find(p => p.id === id)?.name || '?').join('/')}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 shrink-0 ml-2">
                          {m.status === 'Completed' ? `${m.scoreA}-${m.scoreB}` : m.status}
                        </span>
                      </div>
                    );
                  })}
                  {playerMatches.length === 0 && (
                    <p className="text-xs text-slate-600 text-center py-4">No match history yet.</p>
                  )}
                </div>
              </div>

              <button onClick={handleClose} className="mt-5 text-sm text-slate-500 hover:text-slate-300 font-medium transition-colors">Close</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}