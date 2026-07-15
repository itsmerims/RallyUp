import { useEffect, useState } from 'react';
import { ChevronDown, Clock } from 'lucide-react';
import { useAppStore } from '../store';
import { useAuth } from '../contexts/AuthContext';
import type { SkillTier } from '../types';
import { getTierFromShortcut } from '../utils/tiers';

interface AddPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const tiers: { value: SkillTier; label: string }[] = [
  { value: 'BEG', label: 'Beg' },
  { value: 'ADV_BEG', label: 'Adv Beg' },
  { value: 'LOW_INT', label: 'Low Int' },
  { value: 'INT', label: 'Int' },
  { value: 'MID_INT', label: 'Mid Int' },
  { value: 'UP_INT', label: 'Up Int' },
  { value: 'ADV', label: 'Adv' },
  { value: 'EXP', label: 'Expert' },
  { value: 'PRO', label: 'Pro' },
];

const currentTime = () => new Date().toTimeString().slice(0, 5);

export default function AddPlayerModal({ isOpen, onClose }: AddPlayerModalProps) {
  const { user } = useAuth();
  const addPlayer = useAppStore(state => state.addPlayer);
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [playerNames, setPlayerNames] = useState('');
  const [tier, setTier] = useState<SkillTier>('BEG');
  const [timeIn, setTimeIn] = useState(currentTime);
  const [timeOut, setTimeOut] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setPlayerNames('');
    setTimeIn(currentTime());
    setTimeOut('');
    setIsActive(true);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const parsePlayer = (input: string) => {
    const match = input.trim().match(/^(.+?)\s*[-–]\s*(\d)$/);
    const shortcutTier = match ? getTierFromShortcut(match[2]) : null;
    const fullName = (match?.[1] || input).trim();
    return { name: fullName.split(/\s+/)[0] || '', tier: shortcutTier || tier };
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !playerNames.trim()) return;
    const entries = mode === 'bulk'
      ? playerNames.split(/\r?\n|,/).map(value => value.trim()).filter(Boolean)
      : [playerNames.trim()];
    setSubmitting(true);
    try {
      for (const entry of entries) {
        const parsed = parsePlayer(entry);
        if (!parsed.name) continue;
        await addPlayer(user.uid, {
          name: parsed.name,
          tier: parsed.tier,
          timeIn,
          timeOut: timeOut || undefined,
          status: isActive ? 'waiting' : 'timeout',
        });
      }
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = 'w-full h-11 rounded-xl bg-slate-950/70 border border-slate-700 text-sm text-white px-3 outline-none transition-colors focus:border-violet-500 placeholder:text-slate-600';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button aria-label="Close add player modal" className="absolute inset-0 bg-slate-950/75 backdrop-blur-md" onClick={onClose} />
      <section role="dialog" aria-modal="true" aria-labelledby="add-player-title" className="relative z-10 w-full max-w-[400px] overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/50">
        <div className="px-6 pt-6 pb-2">
          <h2 id="add-player-title" className="text-xl font-bold text-white">Add Player</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 pb-6 pt-4">
          <div className="grid grid-cols-2 rounded-xl bg-slate-950/60 p-1">
            {(['single', 'bulk'] as const).map(option => (
              <button key={option} type="button" onClick={() => setMode(option)} className={`h-9 rounded-lg text-sm font-semibold capitalize transition-colors ${mode === option ? 'bg-violet-600 text-white shadow' : 'text-white hover:bg-slate-800'}`}>
                {option}
              </button>
            ))}
          </div>

          {mode === 'bulk' ? (
            <textarea autoFocus value={playerNames} onChange={event => setPlayerNames(event.target.value)} placeholder={'Full name (or Full Name - 3)\nFirst name will be used · One per line'} className="min-h-24 w-full resize-none rounded-xl bg-slate-950/70 border border-slate-700 text-sm text-white p-3 outline-none focus:border-violet-500 placeholder:text-slate-600" />
          ) : (
            <input autoFocus value={playerNames} onChange={event => setPlayerNames(event.target.value)} placeholder="Full name — first name will be used" className={inputClass} />
          )}

          <div className="relative">
            <select value={tier} onChange={event => setTier(event.target.value as SkillTier)} className={`${inputClass} appearance-none cursor-pointer pr-10`}>
              {tiers.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1.5 text-xs font-medium text-slate-400">
              <span>Time In</span>
              <span className="relative block">
                <Clock className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                <input type="time" value={timeIn} onChange={event => setTimeIn(event.target.value)} className={`${inputClass} pl-9`} />
              </span>
            </label>
            <label className="space-y-1.5 text-xs font-medium text-slate-400">
              <span>Time Out</span>
              <span className="relative block">
                <Clock className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                <input type="time" value={timeOut} onChange={event => setTimeOut(event.target.value)} className={`${inputClass} pl-9`} />
              </span>
            </label>
          </div>

          <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-white">
            <input type="checkbox" checked={isActive} onChange={event => setIsActive(event.target.checked)} className="h-4 w-4 rounded border-slate-600 accent-blue-500" />
            Active Player
          </label>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button type="submit" disabled={submitting || !playerNames.trim()} className="h-11 rounded-xl bg-violet-600 font-bold text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50">
              {submitting ? 'Adding…' : 'Add'}
            </button>
            <button type="button" onClick={onClose} className="h-11 rounded-xl bg-slate-700 font-semibold text-white transition-colors hover:bg-slate-600">Cancel</button>
          </div>
        </form>
      </section>
    </div>
  );
}
