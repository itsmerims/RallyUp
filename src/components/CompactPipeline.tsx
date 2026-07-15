import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Pause, Pencil, Play, Plus, Search, Sparkles, Trash2, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAppStore } from '../store';
import type { Player, SkillTier } from '../types';
import { formatWaitTime } from '../utils/time';

interface CompactPipelineProps {
  onAddPlayer: () => void;
  onEditPlayer: (player: Player) => void;
  onAutoQueue: () => void;
  onFinish: (matchId: string) => void;
  onDeclareWin: (matchId: string, winner: 'A' | 'B') => void;
}

interface DraftQueue {
  id: string;
  teamA: Array<string | null>;
  teamB: Array<string | null>;
  ready?: boolean;
}

const tierColors: Record<SkillTier, string> = {
  BEG: 'bg-emerald-600 text-white', ADV_BEG: 'bg-green-600 text-white', LOW_INT: 'bg-teal-600 text-white',
  INT: 'bg-emerald-500 text-slate-950', MID_INT: 'bg-orange-500 text-slate-950', UP_INT: 'bg-amber-500 text-slate-950',
  ADV: 'bg-red-600 text-white', EXP: 'bg-rose-600 text-white', PRO: 'bg-orange-600 text-white',
};

const tierLabel = (tier: SkillTier) => tier.replace('_', ' ');

export default function CompactPipeline({ onAddPlayer, onEditPlayer, onAutoQueue, onFinish, onDeclareWin }: CompactPipelineProps) {
  const { user } = useAuth();
  const { players, matches, courts, deletePlayer, updatePlayerStatus, addMatch, startMatch, cancelMatch, addCourt, deleteCourt } = useAppStore();
  const [playerSearch, setPlayerSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<SkillTier | 'ALL'>('ALL');
  const [playerSort, setPlayerSort] = useState<'waiting' | 'name' | 'games'>('waiting');
  const [sortAsc, setSortAsc] = useState(true);
  const [showRestModal, setShowRestModal] = useState(false);
  const [restSearch, setRestSearch] = useState('');
  const [draftQueues, setDraftQueues] = useState<DraftQueue[]>(() => {
    try { return JSON.parse(localStorage.getItem('rallyup_draft_queues') || '[]') as DraftQueue[]; }
    catch { return []; }
  });
  useEffect(() => { localStorage.setItem('rallyup_draft_queues', JSON.stringify(draftQueues)); }, [draftQueues]);
  const draftedPlayerIds = useMemo(() => new Set(draftQueues.flatMap(queue => [...queue.teamA, ...queue.teamB].filter((id): id is string => Boolean(id)))), [draftQueues]);
  const waitingPlayers = useMemo(() => players.filter(player => player.status === 'waiting' && !draftedPlayerIds.has(player.id)), [players, draftedPlayerIds]);
  const availablePlayers = useMemo(() => players.filter(player => player.status === 'resting' || (player.status === 'waiting' && !draftedPlayerIds.has(player.id))), [players, draftedPlayerIds]);
  const restModalPlayers = useMemo(() => {
    const search = restSearch.trim().toLowerCase();
    return availablePlayers
      .filter(player => !search || player.name.toLowerCase().includes(search))
      .sort((a, b) => Number(b.status === 'resting') - Number(a.status === 'resting') || a.name.localeCompare(b.name));
  }, [availablePlayers, restSearch]);
  const filteredPlayers = useMemo(() => {
    const search = playerSearch.trim().toLowerCase();
    return availablePlayers
      .filter(player => (!search || player.name.toLowerCase().includes(search)) && (tierFilter === 'ALL' || player.tier === tierFilter))
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === 'resting' ? -1 : 1;
        let result = 0;
        if (playerSort === 'name') result = a.name.localeCompare(b.name);
        else if (playerSort === 'games') result = (a.stats?.gamesPlayed || 0) - (b.stats?.gamesPlayed || 0);
        else result = (a.waitingSince || a.joinedAt) - (b.waitingSince || b.joinedAt);
        return sortAsc ? result : -result;
      });
  }, [availablePlayers, playerSearch, tierFilter, playerSort, sortAsc]);
  const queuedMatches = matches.filter(match => match.status === 'Waiting');

  useEffect(() => {
    if (!user || queuedMatches.length === 0) return;
    courts.filter(court => !court.activeMatchId && court.status === 'Available').forEach(court => {
      void startMatch(user.uid, court.id);
    });
  }, [user, queuedMatches.length, courts, startMatch]);

  const addDraftQueue = () => setDraftQueues(current => [...current, { id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, teamA: [null, null], teamB: [null, null] }]);
  const removeDraftQueue = (queueId: string) => setDraftQueues(current => current.filter(queue => queue.id !== queueId));
  const assignDraftSlot = (queueId: string, team: 'teamA' | 'teamB', slot: number, playerId: string) => {
    if (!players.some(player => player.id === playerId && player.status === 'waiting')) return;
    setDraftQueues(current => current.map(queue => {
      const cleared = {
        ...queue,
        teamA: queue.teamA.map(id => id === playerId ? null : id),
        teamB: queue.teamB.map(id => id === playerId ? null : id),
      };
      return queue.id === queueId ? { ...cleared, [team]: cleared[team].map((id, index) => index === slot ? playerId : id) } : cleared;
    }));
  };
  const clearDraftSlot = (queueId: string, team: 'teamA' | 'teamB', slot: number) => setDraftQueues(current => current.map(queue => queue.id === queueId ? { ...queue, [team]: queue[team].map((id, index) => index === slot ? null : id) } : queue));
  const submitDraftQueue = async (queue: DraftQueue) => {
    if (!user) return;
    const ids = [...queue.teamA, ...queue.teamB];
    if (ids.some(id => !id) || new Set(ids).size !== 4) return;
    const targetCourt = [...courts].sort((a, b) => a.queue.length - b.queue.length)[0];
    if (!targetCourt) {
      setDraftQueues(current => current.map(item => item.id === queue.id ? { ...item, ready: true } : item));
      return;
    }
    setDraftQueues(current => current.map(item => item.id === queue.id ? { ...item, ready: false } : item));
    await addMatch(user.uid, { teamA: queue.teamA as string[], teamB: queue.teamB as string[], courtId: targetCourt.id });
    removeDraftQueue(queue.id);
  };

  useEffect(() => {
    const readyQueue = draftQueues.find(queue => queue.ready && [...queue.teamA, ...queue.teamB].every(Boolean));
    if (readyQueue && courts.length > 0) void submitDraftQueue(readyQueue);
  // submitDraftQueue intentionally uses the latest store-backed values on each draft/court change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftQueues, courts.length]);

  const panelClass = 'flex min-h-[360px] min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/35';
  const headerClass = 'flex min-h-14 shrink-0 items-center justify-between gap-2 border-b border-slate-800 px-4 py-2';
  const outlineButtonClass = 'flex h-8 items-center gap-1.5 rounded-lg border-2 border-indigo-500 bg-transparent px-3 text-[11px] font-bold text-indigo-300 transition hover:bg-indigo-500/10 active:scale-95 disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-600';

  return (
    <div className="grid h-full min-h-0 w-full grid-cols-1 gap-4 overflow-y-auto bg-slate-950 p-4 lg:grid-cols-[minmax(300px,1fr)_minmax(360px,1.35fr)_minmax(360px,1.35fr)] lg:overflow-hidden">
      <section className={panelClass}>
        <header className={headerClass}>
          <div><h2 className="text-xs font-black tracking-[0.18em] text-white">PLAYERS</h2><p className="mt-0.5 text-[9px] text-slate-500">{waitingPlayers.length} waiting · {availablePlayers.length - waitingPlayers.length} resting</p></div>
          <div className="flex gap-2"><button onClick={() => setShowRestModal(true)} className={outlineButtonClass}><Pause className="h-3.5 w-3.5" /> Rest</button><button onClick={onAddPlayer} className={outlineButtonClass}><Plus className="h-3.5 w-3.5" /> Add</button></div>
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
        <div className="panel-scrollbar players-scrollbar min-h-0 flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-2 gap-3">
          {filteredPlayers.map(player => (
            <article key={player.id} draggable={player.status === 'waiting'} onDragStart={event => { event.dataTransfer.setData('text/plain', player.id); event.dataTransfer.effectAllowed = 'move'; }} onClick={() => onEditPlayer(player)} className={`group min-w-0 rounded-xl border-2 p-3 shadow-sm transition ${player.status === 'resting' ? 'cursor-pointer border-amber-500/35 bg-amber-500/5 opacity-75' : 'cursor-grab border-transparent bg-slate-900 hover:border-indigo-500/40 hover:bg-slate-800 active:cursor-grabbing'}`}>
              <div className="mb-2 flex items-center justify-between gap-1"><span className={`max-w-full truncate rounded-full px-2 py-0.5 text-[8px] font-black ${player.status === 'resting' ? 'bg-amber-500/20 text-amber-300' : tierColors[player.tier]}`}>{player.status === 'resting' ? 'RESTING' : tierLabel(player.tier)}</span><div className="flex"><button onClick={event => { event.stopPropagation(); onEditPlayer(player); }} className="p-1 text-slate-500 hover:text-indigo-300" title="Edit player"><Pencil className="h-3 w-3" /></button><button onClick={event => { event.stopPropagation(); if (user) deletePlayer(user.uid, player.id); }} className="p-1 text-slate-500 hover:text-red-400" title="Delete player"><Trash2 className="h-3 w-3" /></button></div></div>
              <h3 className="truncate text-xs font-bold text-white">{player.name}</h3>
              <div className="mt-1 flex justify-between text-[9px] text-slate-500"><span>{player.status === 'resting' ? 'Wait frozen' : formatWaitTime(player.waitingSince || player.joinedAt)}</span><span>{player.stats?.gamesPlayed || 0} games</span></div>
            </article>
          ))}
          </div>
          {filteredPlayers.length === 0 && <p className="p-8 text-center text-xs text-slate-600">No matching waiting players</p>}
        </div>
      </section>

      {showRestModal && <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm" onMouseDown={event => { if (event.target === event.currentTarget) setShowRestModal(false); }}>
        <div className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl">
          <header className="flex items-center justify-between border-b border-slate-800 p-5"><div><h3 className="text-base font-black uppercase text-white">Player Rest</h3><p className="mt-1 text-[10px] text-slate-400">Resting players stay pinned and cannot be queued.</p></div><button onClick={() => setShowRestModal(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-800 hover:text-white"><X className="h-4 w-4" /></button></header>
          <div className="border-b border-slate-800 p-4"><div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3"><Search className="h-4 w-4 text-slate-500" /><input autoFocus value={restSearch} onChange={event => setRestSearch(event.target.value)} placeholder="Search players..." className="h-10 min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-slate-600" /></div></div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">{restModalPlayers.map(player => <div key={player.id} className={`flex items-center gap-3 rounded-xl border p-3 ${player.status === 'resting' ? 'border-amber-500/30 bg-amber-500/5' : 'border-slate-800 bg-slate-950/60'}`}><div className="min-w-0 flex-1"><div className="truncate text-xs font-bold text-white">{player.name}</div><div className="mt-0.5 text-[9px] font-bold uppercase text-slate-500">{tierLabel(player.tier)} · {player.status}</div></div><button onClick={() => user && updatePlayerStatus(user.uid, player.id, player.status === 'resting' ? 'waiting' : 'resting')} className={`flex h-8 items-center gap-1.5 rounded-lg px-3 text-[10px] font-black uppercase transition ${player.status === 'resting' ? 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25' : 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/25'}`}>{player.status === 'resting' ? <><Play className="h-3.5 w-3.5" /> Resume</> : <><Pause className="h-3.5 w-3.5" /> Rest</>}</button></div>)}{restModalPlayers.length === 0 && <p className="p-8 text-center text-xs text-slate-600">No players found.</p>}</div>
        </div>
      </div>}

      <section className={panelClass}>
        <header className={headerClass}>
          <div><h2 className="text-xs font-black tracking-[0.18em] text-white">QUEUE</h2><p className="mt-0.5 text-[9px] text-slate-500">{queuedMatches.length} matches lined up</p></div>
          <button onClick={addDraftQueue} className={outlineButtonClass}><Plus className="h-3.5 w-3.5" /> Add Queue</button>
        </header>
        <div className="panel-scrollbar queue-scrollbar min-h-0 flex-1 overflow-y-auto p-3"><div className="grid grid-cols-2 gap-3">
          {draftQueues.map((queue, index) => {
            const playerCount = [...queue.teamA, ...queue.teamB].filter(Boolean).length;
            return <article key={queue.id} className="rounded-2xl border border-slate-700/80 border-l-4 border-l-indigo-500/60 bg-slate-900 p-3 shadow-lg shadow-black/10">
              <div className="mb-2 flex items-center justify-between"><h3 className="text-xs font-bold text-white">Draft Queue {index + 1}</h3><button onClick={() => removeDraftQueue(queue.id)} className="p-1 text-slate-500 hover:text-red-400" title="Remove draft"><Trash2 className="h-3.5 w-3.5" /></button></div>
              {(['teamA', 'teamB'] as const).map((team, teamIndex) => <div key={team} className="mb-2 rounded-xl border border-indigo-500/10 bg-indigo-500/5 p-2"><div className="mb-1.5 text-[8px] font-black tracking-widest text-slate-500">PAIR {teamIndex + 1}</div><div className="grid grid-cols-2 gap-2">{queue[team].map((playerId, slot) => {
                const player = players.find(item => item.id === playerId);
                return <div key={slot} onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; }} onDrop={event => { event.preventDefault(); const id = event.dataTransfer.getData('text/plain'); if (id) assignDraftSlot(queue.id, team, slot, id); }} className={`group/slot relative flex min-h-14 items-center justify-center rounded-lg border-2 p-1.5 text-center transition ${player ? 'border-indigo-500/25 bg-slate-800' : 'border-dashed border-slate-700 text-slate-600 hover:border-indigo-400/60 hover:bg-indigo-500/5'}`}>
                  {player ? <><button onClick={() => clearDraftSlot(queue.id, team, slot)} className="absolute right-1 top-1 text-slate-500 opacity-0 hover:text-red-400 group-hover/slot:opacity-100"><X className="h-3 w-3" /></button><div className="min-w-0"><span className={`inline-block max-w-full truncate rounded px-1 py-px text-[7px] font-black ${tierColors[player.tier]}`}>{tierLabel(player.tier)}</span><div className="truncate text-[9px] font-bold text-white">{player.name}</div></div></> : <span className="text-[9px] font-semibold">Drop player</span>}
                </div>;
              })}</div></div>)}
              <button onClick={() => submitDraftQueue(queue)} disabled={playerCount !== 4} className="mt-1 h-8 w-full rounded-lg bg-indigo-600 text-[10px] font-bold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-600">{queue.ready ? 'Waiting for Court' : `Queue (${playerCount}/4)`}</button>
            </article>;
          })}
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
          </div>{queuedMatches.length === 0 && draftQueues.length === 0 && <p className="p-8 text-center text-xs text-slate-600">Queue is empty</p>}</div>
      </section>

      <section className={panelClass}>
        <header className={headerClass}><div><h2 className="text-xs font-black tracking-[0.18em] text-white">COURTS</h2><p className="mt-0.5 text-[9px] text-slate-500">{courts.filter(court => court.status !== 'Available').length} occupied / {courts.length} total</p></div><div className="flex gap-2"><button onClick={onAutoQueue} disabled={waitingPlayers.length < 4 || courts.length === 0} className={outlineButtonClass} title="Auto-match four waiting players"><Sparkles className="h-3.5 w-3.5" /> Auto</button><button onClick={() => user && addCourt(user.uid, `Court ${courts.length + 1}`)} className={outlineButtonClass}><Plus className="h-3.5 w-3.5" /> Court</button></div></header>
        <div className="panel-scrollbar courts-scrollbar grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-3 overflow-y-auto p-3">
          {courts.map(court => {
            const active = matches.find(match => match.id === court.activeMatchId);
            const nextQueued = queuedMatches.length > 0;
            return <article key={court.id} className="rounded-2xl border border-slate-700/80 border-l-4 border-l-indigo-500/40 bg-slate-900 p-3 shadow-lg shadow-black/10">
              <div className="mb-1.5 flex items-center justify-between"><h3 className="text-[11px] font-bold text-white">{court.name}</h3><div className="flex items-center gap-1"><span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-red-400' : 'bg-emerald-400'}`} />{!active && !nextQueued && <button onClick={() => user && deleteCourt(user.uid, court.id)} className="p-1 text-slate-500 hover:text-red-400" title="Remove court"><X className="h-3.5 w-3.5" /></button>}</div></div>
              {active ? <>
                <div className="grid min-h-32 grid-cols-[1fr_22px_1fr] items-stretch rounded-lg bg-slate-950/45 p-2">
                  <div className="flex min-w-0 flex-col items-center">
                    <div className="text-[8px] font-black tracking-widest text-slate-400">TEAM A</div>
                    <button onClick={() => onDeclareWin(active.id, 'A')} className="my-1 h-6 rounded-md bg-emerald-500/15 px-3 text-[8px] font-black tracking-wider text-emerald-300 ring-1 ring-emerald-400/30 transition hover:bg-emerald-500/25">WIN</button>
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
                    <button onClick={() => onDeclareWin(active.id, 'B')} className="my-1 h-6 rounded-md bg-emerald-500/15 px-3 text-[8px] font-black tracking-wider text-emerald-300 ring-1 ring-emerald-400/30 transition hover:bg-emerald-500/25">WIN</button>
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
