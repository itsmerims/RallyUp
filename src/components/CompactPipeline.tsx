import { useMemo } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAppStore } from '../store';
import type { Player, SkillTier } from '../types';
import { formatWaitTime } from '../utils/time';

interface CompactPipelineProps {
  onAddPlayer: () => void;
  onEditPlayer: (player: Player) => void;
  onAutoQueue: () => void;
  onManualQueue: () => void;
  onFinish: (matchId: string) => void;
}

const tierColors: Record<SkillTier, string> = {
  BEG: 'bg-slate-600 text-slate-100', ADV_BEG: 'bg-sky-600 text-white', LOW_INT: 'bg-blue-600 text-white',
  INT: 'bg-emerald-600 text-white', MID_INT: 'bg-teal-600 text-white', UP_INT: 'bg-cyan-600 text-white',
  ADV: 'bg-violet-600 text-white', EXP: 'bg-fuchsia-600 text-white', PRO: 'bg-amber-500 text-slate-950',
};

const tierLabel = (tier: SkillTier) => tier.replace('_', ' ');

export default function CompactPipeline({ onAddPlayer, onEditPlayer, onAutoQueue, onManualQueue, onFinish }: CompactPipelineProps) {
  const { user } = useAuth();
  const { players, matches, courts, deletePlayer, startMatch, cancelMatch } = useAppStore();
  const waitingPlayers = useMemo(() => players
    .filter(player => player.status === 'waiting')
    .sort((a, b) => (a.waitingSince || a.joinedAt) - (b.waitingSince || b.joinedAt)), [players]);
  const queuedMatches = matches.filter(match => match.status === 'Waiting');

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-slate-950">
      <section className="flex w-1/4 min-w-0 flex-col border-r border-slate-800">
        <header className="flex h-11 shrink-0 items-center justify-between border-b border-slate-800 px-3">
          <h2 className="text-xs font-black tracking-[0.18em] text-white">PLAYERS</h2>
          <button onClick={onAddPlayer} className="flex h-7 items-center gap-1 rounded-md bg-blue-600 px-2.5 text-[11px] font-bold text-white hover:bg-blue-500"><Plus className="h-3 w-3" /> Add</button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
          {waitingPlayers.map(player => (
            <div key={player.id} className="mb-1 flex h-9 items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-2">
              <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-100">{player.name}</span>
              <span className={`shrink-0 rounded px-1.5 py-0.5 text-[8px] font-black ${tierColors[player.tier]}`}>{tierLabel(player.tier)}</span>
              <span className="w-8 shrink-0 text-right font-mono text-[9px] text-slate-500">{formatWaitTime(player.waitingSince || player.joinedAt)}</span>
              <button onClick={() => onEditPlayer(player)} className="p-0.5 text-slate-500 hover:text-blue-400" title="Edit player"><Pencil className="h-3 w-3" /></button>
              <button onClick={() => user && deletePlayer(user.uid, player.id)} className="p-0.5 text-slate-500 hover:text-red-400" title="Delete player"><Trash2 className="h-3 w-3" /></button>
            </div>
          ))}
          {waitingPlayers.length === 0 && <p className="p-4 text-center text-xs text-slate-600">No waiting players</p>}
        </div>
      </section>

      <section className="flex w-[35%] min-w-0 flex-col border-r border-slate-800">
        <header className="flex h-11 shrink-0 items-center justify-between border-b border-slate-800 px-3">
          <h2 className="text-xs font-black tracking-[0.18em] text-white">QUEUE</h2>
          <button onClick={onManualQueue} className="text-[10px] font-bold text-blue-400 hover:text-blue-300">Manual</button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {queuedMatches.map((match, index) => (
            <article key={match.id} className="mb-2 rounded-xl border border-slate-700 bg-slate-900 p-2.5">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-bold text-white">Queue {index + 1}</h3>
                <span className="text-[9px] text-slate-500">{courts.find(court => court.id === match.courtId)?.name}</span>
              </div>
              {[match.teamA, match.teamB].map((team, pairIndex) => (
                <div key={pairIndex} className="mb-1.5 rounded-lg bg-slate-950/70 p-1.5">
                  <div className="mb-1 text-[8px] font-black tracking-widest text-slate-500">PAIR {pairIndex + 1}</div>
                  <div className="grid grid-cols-2 gap-1">
                    {team.map(id => {
                      const player = players.find(item => item.id === id);
                      return <div key={id} className="min-w-0 rounded-md bg-slate-800 px-1.5 py-1">
                        <div className="truncate text-[10px] font-bold text-white">{player?.name || 'Unknown'}</div>
                        {player && <span className={`inline-block rounded px-1 py-px text-[7px] font-black ${tierColors[player.tier]}`}>{tierLabel(player.tier)}</span>}
                      </div>;
                    })}
                  </div>
                </div>
              ))}
              <button onClick={() => user && cancelMatch(user.uid, match.id)} className="mt-1 text-[9px] font-semibold text-red-400 hover:text-red-300">Remove</button>
            </article>
          ))}
          {queuedMatches.length === 0 && <p className="p-4 text-center text-xs text-slate-600">Queue is empty</p>}
        </div>
        <div className="shrink-0 border-t border-slate-800 p-2">
          <button onClick={onAutoQueue} disabled={waitingPlayers.length < 4} className="h-9 w-full rounded-lg bg-blue-600 text-xs font-bold text-white hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500">Queue ({Math.min(waitingPlayers.length, 4)}/4)</button>
        </div>
      </section>

      <section className="flex w-[40%] min-w-0 flex-col">
        <header className="flex h-11 shrink-0 items-center border-b border-slate-800 px-3"><h2 className="text-xs font-black tracking-[0.18em] text-white">COURTS</h2></header>
        <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-2 overflow-y-auto p-2">
          {courts.map(court => {
            const active = matches.find(match => match.id === court.activeMatchId);
            const nextQueued = court.queue.length > 0;
            return <article key={court.id} className="rounded-xl border border-slate-800 bg-slate-900 p-2">
              <div className="mb-1.5 flex items-center justify-between"><h3 className="text-[11px] font-bold text-white">{court.name}</h3><span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-red-400' : 'bg-emerald-400'}`} /></div>
              {active ? <>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1 rounded-lg bg-slate-950/60 p-1.5">
                  <div><div className="text-[7px] font-black text-slate-500">TEAM A</div>{active.teamA.map(id => <div key={id} className="truncate text-[9px] font-semibold text-white">{players.find(p => p.id === id)?.name}</div>)}</div>
                  <span className="text-[8px] font-black text-red-400">VS</span>
                  <div className="text-right"><div className="text-[7px] font-black text-slate-500">TEAM B</div>{active.teamB.map(id => <div key={id} className="truncate text-[9px] font-semibold text-white">{players.find(p => p.id === id)?.name}</div>)}</div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  <button onClick={() => onFinish(active.id)} className="h-7 rounded-md bg-slate-700 text-[10px] font-bold text-white hover:bg-slate-600">✓ Finish</button>
                  <button onClick={() => user && cancelMatch(user.uid, active.id)} className="h-7 rounded-md bg-red-500/15 text-[10px] font-bold text-red-300 hover:bg-red-500/25">✕ Cancel</button>
                </div>
              </> : <>
                <div className="flex h-12 items-center justify-center rounded-lg border border-dashed border-slate-800 text-[9px] text-slate-600">Available</div>
                <button onClick={() => user && startMatch(user.uid, court.id)} disabled={!nextQueued} className="mt-2 h-7 w-full rounded-md bg-blue-600 text-[10px] font-bold text-white disabled:bg-slate-800 disabled:text-slate-600">Start Next</button>
              </>}
            </article>;
          })}
        </div>
      </section>
    </div>
  );
}
