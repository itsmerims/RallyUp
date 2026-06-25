import { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { useAppStore } from '../store';
import { useAuth } from '../contexts/AuthContext';
import { SkillTier } from '../types';
import gsap from 'gsap';

interface AddPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddPlayerModal({ isOpen, onClose }: AddPlayerModalProps) {
  const { user } = useAuth();
  const { addPlayer } = useAppStore();
  const [newPlayerName, setNewPlayerName] = useState('');
  const [selectedTier, setSelectedTier] = useState<SkillTier>('LOW_INTERMEDIATE');

  useEffect(() => {
    if (isOpen) {
      gsap.fromTo('.add-player-modal', 
        { y: 50, opacity: 0, scale: 0.95 },
        { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.5)' }
      );
      gsap.fromTo('.modal-overlay',
        { opacity: 0 },
        { opacity: 1, duration: 0.3 }
      );
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim() || !user) return;
    addPlayer(user.uid, {
      name: newPlayerName.trim(),
      tier: selectedTier,
    });
    setNewPlayerName('');
    onClose();
  };

  const getTierColor = (tier: SkillTier) => {
    switch (tier) {
      case 'BEGINNER': return 'border-slate-500 text-slate-400 hover:bg-slate-500/10 data-[active=true]:bg-slate-500/20 data-[active=true]:border-slate-400 data-[active=true]:text-white';
      case 'LOW_INTERMEDIATE': return 'border-blue-500 text-blue-400 hover:bg-blue-500/10 data-[active=true]:bg-blue-500/20 data-[active=true]:border-blue-400 data-[active=true]:text-white';
      case 'INTERMEDIATE': return 'border-emerald-500 text-emerald-400 hover:bg-emerald-500/10 data-[active=true]:bg-emerald-500/20 data-[active=true]:border-emerald-400 data-[active=true]:text-white';
      case 'ADVANCED': return 'border-purple-500 text-purple-400 hover:bg-purple-500/10 data-[active=true]:bg-purple-500/20 data-[active=true]:border-purple-400 data-[active=true]:text-white';
      default: return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm modal-overlay" onClick={onClose} />
      
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-6 relative z-10 shadow-2xl add-player-modal">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
          <X className="w-6 h-6" />
        </button>
        
        <h2 className="text-xl font-black uppercase italic tracking-tight text-white mb-6">Add Player</h2>
        
        <form onSubmit={handleAddPlayer} className="flex flex-col gap-6">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Player Name</label>
            <input 
              type="text" 
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              placeholder="Enter name..."
              className="w-full h-14 bg-slate-950 border border-slate-700 text-white text-lg rounded-xl focus:ring-emerald-500 focus:border-emerald-500 block px-4 outline-none transition-colors placeholder:text-slate-600"
              autoFocus
            />
          </div>
          
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Skill Tier</label>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" data-active={selectedTier === 'BEGINNER'} onClick={() => setSelectedTier('BEGINNER')} className={`h-14 rounded-xl border-2 flex items-center justify-center text-sm font-bold transition-all data-[active=true]:scale-[1.02] ${getTierColor('BEGINNER')}`}>
                Beginner
              </button>
              <button type="button" data-active={selectedTier === 'LOW_INTERMEDIATE'} onClick={() => setSelectedTier('LOW_INTERMEDIATE')} className={`h-14 rounded-xl border-2 flex items-center justify-center text-sm font-bold transition-all data-[active=true]:scale-[1.02] ${getTierColor('LOW_INTERMEDIATE')}`}>
                Low Inter
              </button>
              <button type="button" data-active={selectedTier === 'INTERMEDIATE'} onClick={() => setSelectedTier('INTERMEDIATE')} className={`h-14 rounded-xl border-2 flex items-center justify-center text-sm font-bold transition-all data-[active=true]:scale-[1.02] ${getTierColor('INTERMEDIATE')}`}>
                Intermediate
              </button>
              <button type="button" data-active={selectedTier === 'ADVANCED'} onClick={() => setSelectedTier('ADVANCED')} className={`h-14 rounded-xl border-2 flex items-center justify-center text-sm font-bold transition-all data-[active=true]:scale-[1.02] ${getTierColor('ADVANCED')}`}>
                Advanced
              </button>
            </div>
          </div>

          <button type="submit" className="h-14 w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] active:scale-[0.98] mt-2 flex items-center justify-center gap-2">
            <Plus className="w-5 h-5" />
            ADD TO QUEUE
          </button>
        </form>
      </div>
    </div>
  );
}
