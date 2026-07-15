import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Pencil, Plus, Sparkles, Trash2, X } from 'lucide-react';
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
  BEG: 'bg-emerald-600 text-white', ADV_BEG: 'bg-green-600 text-white', LOW_INT: 'bg-teal-600 text-white',
  INT: 'bg-emerald-500 text-slate-950', MID_INT: 'bg-orange-500 text-slate-950', UP_INT: 'bg-amber-500 text-slate-950',
  ADV: 'bg-red-600 text-white', EXP: 'bg-rose-600 text-white', PRO: 'bg-orange-600 text-white',
};

const tierLabel = (tier: SkillTier) => tier.replace('_', ' ');

export default function CompactPipeline({ onAddPlayer, onEditPlayer, onAutoQueue, onManualQueue, onFinish }: CompactPipelineProps) {
  const { user } = useAuth();
  const { players, matches, courts, deletePlayer, startMatch, cancelMatch, addCourt, deleteCourt } = useAppStore();
  const [playerSearch, setPlayerSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<SkillTier | 'ALL'>('ALL');
  const [playerSort, setPlayerSort] = useState<'waiting' | 'name' | 'games'>('waiting');
  const [sortAsc, setSortAsc] = useState(true);
  const waitingPlayers = useMemo(() => players.filter(player => player.status === 'waiting'), [players]);
  const filteredPlayers = useMemo(() => {
    const search = playerSearch.trim().toLowerCase();
    return waitingPlayers
      .filter(player => (!search || player.name.toLowerCase().includes(search)) && (tierFilter === 'ALL' || player.tier === tierFilter))
      .sort((a, b) => {
        let result = 0;
        if (playerSort === 'name') result = a.name.localeCompare(b.name);
        else if (playerSort === 'games') result = (a.stats?.gamesPlayed || 0) - (b.stats?.gamesPlayed || 0);
        else result = (a.waitingSince || a.joinedAt) - (b.waitingSince || b.joinedAt);
        return sortAsc ? result : -result;
      });
  }, [waitingPlayers, playerSearch, tierFilter, playerSort, sortAsc]);
  const queuedMatches = matches.filter(match => match.status === 'Waiting');

  const panelClass = 'flex min-h-[360px] min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/35';
  const headerClass = 'flex min-h-14 shrink-0 items-center justify-between gap-2 border-b border-slate-800 px-4 py-2';
  const outlineButtonClass = 'flex h-8 items-center gap-1.5 rounded-lg border-2 border-indigo-500 bg-transparent px-3 text-[11px] font-bold text-indigo-300 transition hover:bg-indigo-500/10 active:scale-95 disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-600';

  return (
    <div className="grid h-full min-h-0 w-full grid-cols-1 gap-4 overflow-y-auto bg-slate-950 p-4 lg:grid-cols-[minmax(300px,1fr)_minmax(360px,1.35fr)_minmax(360px,1.35fr)] lg:overflow-hidden">
      <section className={panelClass}>
        <header className={headerClass}>
          <div><h2 className="text-xs font-black tracking-[0.18em] text-white">PLAYERS</h2><p className="mt-0.5 text-[9px] text-slate-500">{filteredPlayers.length} of {waitingPlayers.length} waiting</p></div>
          <button onClick={onAddPlayer} className={outlineButtonClass}><Plus className="h-3.5 w-3.5" /> Add</button>
        </header>
        <div className="shrink-0 space-y-2 border-b border-slate-800/70 p-3">
          <div className="flex gap-2">
            <input value={playerSearch} onChange={event => setPlayerSearch(event.target.value)} placeholder="Search players..." className="h-8 min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 text-[11px] text-white outline-none focus:border-indigo-500" />
            <select value={tierFilter} onChange={event => setTierFilter(event.target.value as SkillTier | 'ALL')} className="h-8 rounded-lg border border-slate-700 bg-slate-950 px-2 text-[10px] font-bold text-slate-300 outline-none focus:border-indigo-500">
              <option value="ALL">All tiers</option>{Object.keys(tierColors).map(tier => <option key={tier} value={tier}>{tierLabel(tier as SkillTier)}</option>)}
            </select>
          </div>
          <div className="flex rounded-full bg-slate-950/80 p-0.5">
            {(['waiting', 'name', 'games'] as const).map(sort => <button key={sort} onClick={() => setPlayerSort(sort)} className={`flex-1 rounded-full py-1 text-[9px] font-bold transition ${playerSort === sort ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-white'}`}>{sort === 'waiting' ? 'Wait' : sort === 'name' ? 'A-Z' : 'Games'}</button>)}
            <button onClick={() => setSortAsc(value => !value)} className="px-2 text-slate-400 hover:text-white" title="Reverse sort">{sortAsc ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}</button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-2 gap-3">
          {filteredPlayers.map(player => (
            <article key={player.id} onClick={() => onEditPlayer(player)} className="group min-w-0 cursor-pointer rounded-xl border-2 border-transparent bg-slate-900 p-3 shadow-sm transition hover:border-indigo-500/40 hover:bg-slate-800">
              <div className="mb-2 flex items-center justify-between gap-1"><span className={`max-w-full truncate rounded-full px-2 py-0.5 text-[8px] font-black ${tierColors[player.tier]}`}>{tierLabel(player.tier)}</span><div className="flex"><button onClick={event => { event.stopPropagation(); onEditPlayer(player); }} className="p-1 text-slate-500 hover:text-indigo-300" title="Edit player"><Pencil className="h-3 w-3" /></button><button onClick={event => { event.stopPropagation(); if (user) deletePlayer(user.uid, player.id); }} className="p-1 text-slate-500 hover:text-red-400" title="Delete player"><Trash2 className="h-3 w-3" /></button></div></div>
              <h3 className="truncate text-xs font-bold text-white">{player.name}</h3>
              <div className="mt-1 flex justify-between text-[9px] text-slate-500"><span>{formatWaitTime(player.waitingSince || player.joinedAt)}</span><span>{player.stats?.gamesPlayed || 0} games</span></div>
            </article>
          ))}
          </div>
          {filteredPlayers.length === 0 && <p className="p-8 text-center text-xs text-slate-600">No matching waiting players</p>}
        </div>
      </section>

      <section className={panelClass}>
        <header className={headerClass}>
          <div><h2 className="text-xs font-black tracking-[0.18em] text-white">QUEUE</h2><p className="mt-0.5 text-[9px] text-slate-500">{queuedMatches.length} matches lined up</p></div>
          <button onClick={onManualQueue} className={outlineButtonClass}><Plus className="h-3.5 w-3.5" /> Add Queue</button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-3"><div className="grid grid-cols-2 gap-3">
          {queuedMatches.map((match, index) => (
            <article key={match.id} className="rounded-2xl border border-slate-700/80 border-l-4 border-l-amber-500/50 bg-slate-900 p-3 shadow-lg shadow-black/10">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-bold text-white">Queue {index + 1}</h3>
                <span className="text-[9px] text-slate-500">{courts.find(court => court.id === match.courtId)?.name}</span>
              </div>
              {[match.teamA, match.teamB].map((team, pairIndex) => (
                <div key={pairIndex} className="mb-2">
                  <div className="mb-1 text-[8px] font-black tracking-widest text-slate-500">PAIR {pairIndex + 1}</div>
                  <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-950/55 p-1.5">
                    {team.map(id => {
                      const player = players.find(item => item.id === id);
                      return <div key={id} className="min-w-0 overflow-hidden rounded-md bg-slate-800 text-center">
                        {player && <div className={`truncate px-1 py-0.5 text-[8px] font-black tracking-wide ${tierColors[player.tier]}`}>{tierLabel(player.tier)}</div>}
                        <div className="truncate px-1.5 py-1.5 text-[10px] font-bold text-white">{player?.name || 'Unknown'}</div>
                      </div>;
                    })}
                  </div>
                </div>
              ))}
              <button onClick={() => user && cancelMatch(user.uid, match.id)} className="mt-1 flex items-center gap-1 text-[9px] font-semibold text-red-400 hover:text-red-300"><Trash2 className="h-3 w-3" /> Remove</button>
            </article>
          ))}
          </div>{queuedMatches.length === 0 && <p className="p-8 text-center text-xs text-slate-600">Queue is empty</p>}</div>
      </section>

      <section className={panelClass}>
        <header className={headerClass}><div><h2 className="text-xs font-black tracking-[0.18em] text-white">COURTS</h2><p className="mt-0.5 text-[9px] text-slate-500">{courts.filter(court => court.status !== 'Available').length} occupied / {courts.length} total</p></div><div className="flex gap-2"><button onClick={onAutoQueue} disabled={waitingPlayers.length < 4 || courts.length === 0} className={outlineButtonClass} title="Auto-match four waiting players"><Sparkles className="h-3.5 w-3.5" /> Auto</button><button onClick={() => user && addCourt(user.uid, `Court ${courts.length + 1}`)} className={outlineButtonClass}><Plus className="h-3.5 w-3.5" /> Court</button></div></header>
        <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-3 overflow-y-auto p-3">
          {courts.map(court => {
            const active = matches.find(match => match.id === court.activeMatchId);
            const nextQueued = court.queue.length > 0;
            return <article key={court.id} className="rounded-2xl border border-slate-700/80 border-l-4 border-l-indigo-500/40 bg-slate-900 p-3 shadow-lg shadow-black/10">
              <div className="mb-1.5 flex items-center justify-between"><h3 className="text-[11px] font-bold text-white">{court.name}</h3><div className="flex items-center gap-1"><span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-red-400' : 'bg-emerald-400'}`} />{!active && !nextQueued && <button onClick={() => user && deleteCourt(user.uid, court.id)} className="p-1 text-slate-500 hover:text-red-400" title="Remove court"><X className="h-3.5 w-3.5" /></button>}</div></div>
              {active ? <>
                <div className="grid min-h-32 grid-cols-[1fr_22px_1fr] items-stretch rounded-lg bg-slate-950/45 p-2">
                  <div className="flex min-w-0 flex-col items-center">
                    <div className="text-[8px] font-black tracking-widest text-slate-400">TEAM A</div>
                    <span className="my-1 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/15 text-[10px] font-black text-blue-300 ring-1 ring-blue-400/25">{active.scoreA || 0}</span>
                    <div className="w-full space-y-1">{active.teamA.map(id => {
                      const player = players.find(p => p.id === id);
                      return <div key={id} className="min-w-0 rounded-md bg-blue-500/5 px-1 py-1 text-center">
                        {player && <span className={`inline-block max-w-full truncate rounded px-1 py-px text-[7px] font-black ${tierColors[player.tier]}`}>{tierLabel(player.tier)}</span>}
                        <div className="truncate text-[9px] font-semibold text-white">{player?.name}</div>
                      </div>;
                    })}</div>
                  </div>
                  <div className="flex flex-col items-center justify-center px-1">
                    <span className="h-full w-px bg-gradient-to-b from-transparent via-slate-600 to-transparent" />
                    <span className="my-1 text-[8px] font-black text-slate-500">VS</span>
                    <span className="h-full w-px bg-gradient-to-b from-transparent via-slate-600 to-transparent" />
                  </div>
                  <div className="flex min-w-0 flex-col items-center">
                    <div className="text-[8px] font-black tracking-widest text-slate-400">TEAM B</div>
                    <span className="my-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500/15 text-[10px] font-black text-red-300 ring-1 ring-red-400/25">{active.scoreB || 0}</span>
                    <div className="w-full space-y-1">{active.teamB.map(id => {
                      const player = players.find(p => p.id === id);
                      return <div key={id} className="min-w-0 rounded-md bg-red-500/5 px-1 py-1 text-center">
                        {player && <span className={`inline-block max-w-full truncate rounded px-1 py-px text-[7px] font-black ${tierColors[player.tier]}`}>{tierLabel(player.tier)}</span>}
                        <div className="truncate text-[9px] font-semibold text-white">{player?.name}</div>
                      </div>;
                    })}</div>
                  </div>
                </div>
                <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                  <button onClick={() => onFinish(active.id)} className="h-6 rounded-md bg-slate-700 text-[9px] font-bold text-white hover:bg-slate-600">✓ Finish</button>
                  <button onClick={() => user && cancelMatch(user.uid, active.id)} className="h-6 rounded-md bg-red-500/15 text-[9px] font-bold text-red-300 hover:bg-red-500/25">✕ Cancel</button>
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
