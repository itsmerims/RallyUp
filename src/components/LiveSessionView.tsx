import { useEffect, useMemo, useState } from 'react';
import { Activity, Clock3, Radio, Trophy, Users } from 'lucide-react';
import * as firestoreService from '../services/firestore';
import type { Court, Match, Player, SkillTier } from '../types';

const tierStyles: Record<SkillTier, string> = {
  BEG: 'bg-emerald-600 text-white', ADV_BEG: 'bg-green-600 text-white', LOW_INT: 'bg-teal-600 text-white',
  INT: 'bg-emerald-500 text-slate-950', MID_INT: 'bg-orange-500 text-slate-950', UP_INT: 'bg-amber-500 text-slate-950',
  ADV: 'bg-red-600 text-white', EXP: 'bg-rose-600 text-white', PRO: 'bg-orange-600 text-white',
};

const PlayerBlock = ({ player }: { player?: Player }) => <div className="min-w-0 rounded-lg bg-slate-900/90 p-2 text-center ring-1 ring-slate-800">
  {player ? <><span className={`inline-block max-w-full truncate rounded-full px-2 py-0.5 text-[8px] font-black uppercase ${tierStyles[player.tier]}`}>{player.tier.replace('_', ' ')}</span><div className="mt-1 truncate text-[11px] font-bold text-white">{player.name}</div></> : <span className="text-[10px] text-slate-600">Unknown</span>}
</div>;

export default function LiveSessionView() {
  const sessionCode = new URLSearchParams(window.location.search).get('session')?.trim() || '';
  const [players, setPlayers] = useState<Player[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [status, setStatus] = useState<'loading' | 'live' | 'missing'>('loading');
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const updateConnection = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateConnection);
    window.addEventListener('offline', updateConnection);
    return () => { window.removeEventListener('online', updateConnection); window.removeEventListener('offline', updateConnection); };
  }, []);

  useEffect(() => {
    if (!sessionCode) { setStatus('missing'); return; }
    let unsubscribers: Array<() => void> = [];
    let cancelled = false;
    firestoreService.getSessionMapping(sessionCode).then(mapping => {
      if (cancelled) return;
      if (!mapping) { setStatus('missing'); return; }
      const sessionId = mapping.matchSessionId;
      unsubscribers = [
        firestoreService.subscribeToPlayers(mapping.qmUserId, data => { setPlayers(data); setLastUpdated(Date.now()); }, sessionId),
        firestoreService.subscribeToCourts(mapping.qmUserId, data => { setCourts(data); setLastUpdated(Date.now()); }),
        firestoreService.subscribeToMatches(mapping.qmUserId, data => { setMatches(data); setLastUpdated(Date.now()); }, sessionId),
      ];
      setStatus('live');
    });
    return () => { cancelled = true; unsubscribers.forEach(unsubscribe => unsubscribe()); };
  }, [sessionCode]);

  const playerById = useMemo(() => new Map(players.map(player => [player.id, player])), [players]);
  const activeMatches = matches.filter(match => match.status === 'Active');
  const queuedMatches = matches.filter(match => match.status === 'Waiting');
  const completedMatches = matches.filter(match => match.status === 'Completed').sort((a, b) => (b.completedAt || b.startTime || 0) - (a.completedAt || a.startTime || 0));
  const averageMinutes = completedMatches.filter(match => match.startTime && match.completedAt).reduce((summary, match) => ({ total: summary.total + ((match.completedAt! - match.startTime!) / 60000), count: summary.count + 1 }), { total: 0, count: 0 });
  const rankings = [...players].sort((a, b) => (b.stats?.wins || 0) - (a.stats?.wins || 0) || (b.ratingScore || 0) - (a.ratingScore || 0)).slice(0, 10);
  const metrics = [
    { icon: Users, value: `${players.filter(player => player.status !== 'timeout').length} Players`, label: 'Total Active Players' },
    { icon: Trophy, value: `${completedMatches.length} Matches`, label: 'Total Matches Completed' },
    { icon: Clock3, value: averageMinutes.count ? `${Math.round(averageMinutes.total / averageMinutes.count)} mins / game` : '— mins / game', label: 'Average Game Time' },
  ];

  if (status !== 'live') return <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-center text-white"><div><div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500"><Radio className="h-7 w-7" /></div><h1 className="text-2xl font-black uppercase">Live Session View</h1><p className="mt-2 text-sm text-slate-500">{status === 'loading' ? 'Connecting to the live session…' : 'This live session link is missing or no longer active.'}</p></div></div>;

  return <div className="panel-scrollbar h-screen overflow-y-auto bg-slate-950 text-slate-100">
    <header className="sticky top-0 z-20 flex min-h-20 items-center justify-between border-b border-slate-800 bg-slate-950/90 px-4 py-4 backdrop-blur-xl md:px-8">
      <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500 shadow-[0_0_22px_rgba(239,68,68,.3)]"><span className="text-xs font-black text-white">LOGO</span></div><div><h1 className="text-base font-black uppercase tracking-tight text-white md:text-xl">RallyUp Badminton App</h1><p className="text-[9px] font-bold uppercase tracking-[.22em] text-slate-500">Live Session View · {sessionCode}</p></div></div>
      <div className={`flex items-center gap-2 rounded-full border px-3 py-2 ${isOnline ? 'border-emerald-500/20 bg-emerald-500/10' : 'border-amber-500/20 bg-amber-500/10'}`}><span className="relative flex h-2.5 w-2.5"><span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-70 ${isOnline ? 'bg-emerald-400' : 'bg-amber-400'}`} /><span className={`relative h-2.5 w-2.5 rounded-full ${isOnline ? 'bg-emerald-400 shadow-[0_0_10px_#34d399]' : 'bg-amber-400'}`} /></span><span className={`hidden text-[10px] font-black uppercase tracking-wider sm:inline ${isOnline ? 'text-emerald-300' : 'text-amber-300'}`}>{isOnline ? 'Live Realtime Tracking' : 'Waiting to reconnect'}</span><span className={`text-[10px] font-black sm:hidden ${isOnline ? 'text-emerald-300' : 'text-amber-300'}`}>{isOnline ? 'LIVE' : 'OFFLINE'}</span></div>
    </header>

    <main className="mx-auto max-w-[1600px] space-y-5 p-4 md:p-6 lg:p-8">
      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">{metrics.map(metric => <div key={metric.label} className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/55 p-5 shadow-xl shadow-black/10"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-emerald-400"><metric.icon className="h-5 w-5" /></div><div><div className="text-2xl font-black tracking-tight text-white">{metric.value}</div><div className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-500">{metric.label}</div></div></div>)}</section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,7fr)_minmax(300px,3fr)]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-800 bg-slate-900/30"><div className="flex items-center justify-between border-b border-slate-800 px-5 py-4"><div><h2 className="text-xs font-black uppercase tracking-[.18em] text-white">Live Courts</h2><p className="mt-1 text-[9px] text-slate-500">Matches currently in progress</p></div><Activity className="h-4 w-4 text-red-400" /></div><div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">{activeMatches.map(match => {
            const court = courts.find(item => item.id === match.courtId);
            return <article key={match.id} className="rounded-2xl border border-slate-700 border-l-4 border-l-red-500/70 bg-slate-900 p-4"><div className="mb-3 flex items-center justify-between"><h3 className="text-xs font-black text-white">{court?.name || 'Court'}</h3><span className="rounded-full bg-red-500/10 px-2 py-1 text-[8px] font-black uppercase text-red-300">In Play</span></div><div className="grid grid-cols-[1fr_30px_1fr] rounded-xl bg-slate-950/70 p-3"><div><div className="mb-2 text-center text-[8px] font-black tracking-widest text-blue-300">TEAM A</div><div className="mb-2 text-center"><span className="inline-flex min-w-9 justify-center rounded-lg bg-blue-500/15 px-2 py-1 text-sm font-black text-blue-300 ring-1 ring-blue-400/25">{match.scoreA || 0}</span></div><div className="space-y-2">{match.teamA.map(id => <PlayerBlock key={id} player={playerById.get(id)} />)}</div></div><div className="flex flex-col items-center justify-center"><span className="h-full w-px bg-gradient-to-b from-transparent via-slate-700 to-transparent" /><span className="my-2 text-[8px] font-black text-slate-600">VS</span><span className="h-full w-px bg-gradient-to-b from-transparent via-slate-700 to-transparent" /></div><div><div className="mb-2 text-center text-[8px] font-black tracking-widest text-red-300">TEAM B</div><div className="mb-2 text-center"><span className="inline-flex min-w-9 justify-center rounded-lg bg-red-500/15 px-2 py-1 text-sm font-black text-red-300 ring-1 ring-red-400/25">{match.scoreB || 0}</span></div><div className="space-y-2">{match.teamB.map(id => <PlayerBlock key={id} player={playerById.get(id)} />)}</div></div></div></article>;
          })}{activeMatches.length === 0 && <p className="col-span-full p-10 text-center text-xs text-slate-600">No matches are currently active.</p>}</div></section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/30"><div className="border-b border-slate-800 px-5 py-4"><h2 className="text-xs font-black uppercase tracking-[.18em] text-white">Live Queue</h2><p className="mt-1 text-[9px] text-slate-500">Upcoming matches in order</p></div><div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">{queuedMatches.map((match, index) => <article key={match.id} className="rounded-2xl border border-slate-700 border-l-4 border-l-amber-500/60 bg-slate-900 p-4"><div className="mb-3 flex items-center justify-between"><h3 className="text-xs font-black text-white">Queue {index + 1}</h3><span className="text-[9px] text-slate-500">{courts.find(court => court.id === match.courtId)?.name || 'Next court'}</span></div><div className="grid grid-cols-2 gap-3">{[match.teamA, match.teamB].map((team, pairIndex) => <div key={pairIndex} className="rounded-xl bg-slate-950/70 p-2.5 ring-1 ring-slate-800"><div className="mb-2 text-center text-[8px] font-black tracking-widest text-amber-300">PAIR {pairIndex + 1}</div><div className="space-y-2">{team.map(id => <PlayerBlock key={id} player={playerById.get(id)} />)}</div></div>)}</div></article>)}{queuedMatches.length === 0 && <p className="col-span-full p-10 text-center text-xs text-slate-600">The live queue is empty.</p>}</div></section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-slate-800 bg-slate-900/40"><div className="border-b border-slate-800 px-5 py-4"><h2 className="text-xs font-black uppercase tracking-[.18em] text-white">Live Rankings</h2></div><div className="divide-y divide-slate-800/70 px-4">{rankings.map((player, index) => <div key={player.id} className="flex items-center gap-3 py-3"><span className={`flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-black ${index === 0 ? 'bg-amber-400/20 text-amber-300' : index === 1 ? 'bg-slate-300/15 text-slate-300' : index === 2 ? 'bg-orange-700/20 text-orange-400' : 'bg-slate-950 text-slate-500'}`}>{index + 1}</span><div className="min-w-0 flex-1 truncate text-xs font-bold text-white">{player.name}</div><div className="text-right"><div className="text-xs font-black text-emerald-400">{player.stats?.wins || 0} W</div><div className="text-[8px] uppercase text-slate-600">{player.ratingScore || 0} pts</div></div></div>)}</div></section>
          <section className="rounded-2xl border border-slate-800 bg-slate-900/40"><div className="border-b border-slate-800 px-5 py-4"><h2 className="text-xs font-black uppercase tracking-[.18em] text-white">Match History</h2></div><div className="panel-scrollbar queue-scrollbar max-h-80 divide-y divide-slate-800/70 overflow-y-auto px-4">{completedMatches.slice(0, 4).map(match => { const a = match.teamA.map(id => playerById.get(id)?.name || 'Unknown').join(' / '); const b = match.teamB.map(id => playerById.get(id)?.name || 'Unknown').join(' / '); const aWon = (match.scoreA || 0) > (match.scoreB || 0); return <div key={match.id} className="py-3"><div className="text-[10px] leading-relaxed text-slate-300"><strong className="text-white">{aWon ? a : b}</strong> def. {aWon ? b : a}</div><div className="mt-1 text-[9px] font-black text-emerald-400">{Math.max(match.scoreA || 0, match.scoreB || 0)}–{Math.min(match.scoreA || 0, match.scoreB || 0)}</div></div>; })}{completedMatches.length === 0 && <p className="p-8 text-center text-xs text-slate-600">No completed matches yet.</p>}</div></section>
        </aside>
      </div>
    </main>

    <footer className="border-t border-slate-800 px-4 py-8 text-center"><p className="text-[10px] text-slate-500">This dashboard updates automatically in real-time. Players do not need to refresh this page.</p>{lastUpdated && <p className="mt-1 text-[9px] text-slate-600">Last live update: {new Date(lastUpdated).toLocaleTimeString()}</p>}<p className="mt-2 text-[10px] text-slate-600">Built with&nbsp; by <a href="https://github.com/itsmerims" target="_blank" rel="noreferrer" className="font-bold text-slate-400 hover:text-emerald-400">Rims</a></p></footer>
  </div>;
}
