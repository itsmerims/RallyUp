import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { useAuth } from '../contexts/AuthContext';
import * as firestoreService from '../services/firestore';
import { Trophy, Globe, MapPin, Award, Search, Sparkles, Loader2 } from 'lucide-react';
import { Player, SkillTier } from '../types';

export default function LocalGlobalRankings() {
  const { players } = useAppStore();
  const { userProfile } = useAuth();
  const [rankingTab, setRankingTab] = useState<'local' | 'global'>('local');
  const [globalProfiles, setGlobalProfiles] = useState<any[]>([]);
  const [globalLoading, setGlobalLoading] = useState(true);
  
  // Filters for Global
  const [globalFilter, setGlobalFilter] = useState<'all' | 'country'>('all');
  const [tierFilter, setTierFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all global profiles for Leaderboard
  useEffect(() => {
    if (rankingTab === 'global') {
      setGlobalLoading(true);
      const unsubscribe = firestoreService.subscribeToGlobalProfiles((profiles) => {
        setGlobalProfiles(profiles);
        setGlobalLoading(false);
      });
      return unsubscribe;
    }
  }, [rankingTab]);

  // Sort Local Players by Rating
  const sortedLocalPlayers = [...players].sort((a, b) => b.ratingScore - a.ratingScore);

  // Filter and Sort Global Players
  const sortedGlobalPlayers = [...globalProfiles]
    .filter((profile) => {
      // Search text filter
      const matchesSearch = profile.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            profile.email?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Country filter
      const matchesCountry = globalFilter === 'all' || 
                             (userProfile && profile.country === userProfile.country);
      
      // Tier filter
      const matchesTier = tierFilter === 'ALL' || profile.skillTier === tierFilter;

      return matchesSearch && matchesCountry && matchesTier;
    })
    .sort((a, b) => (b.ratingScore || 1000) - (a.ratingScore || 1000));

  const calculateWinRate = (stats: any) => {
    if (!stats || !stats.gamesPlayed) return '0%';
    return `${Math.round((stats.wins / stats.gamesPlayed) * 100)}%`;
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'BEG': return <span className="bg-slate-800 text-slate-300 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase border border-slate-700">Beg</span>;
      case 'ADV_BEG': return <span className="bg-blue-950 text-blue-300 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase border border-blue-800/60">Adv Beg</span>;
      case 'LOW_INT': return <span className="bg-blue-950 text-blue-300 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase border border-blue-800/60">Low Int</span>;
      case 'INT': return <span className="bg-emerald-950 text-emerald-300 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase border border-emerald-800/60">Int</span>;
      case 'MID_INT': return <span className="bg-emerald-950 text-emerald-300 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase border border-emerald-800/60">Mid Int</span>;
      case 'UP_INT': return <span className="bg-teal-950 text-teal-300 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase border border-teal-800/60">Up Int</span>;
      case 'ADV': return <span className="bg-purple-950 text-purple-300 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase border border-purple-800/60">Adv</span>;
      case 'EXP': return <span className="bg-purple-950 text-purple-300 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase border border-purple-800/60">Exp</span>;
      case 'PRO': return <span className="bg-amber-950 text-amber-300 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase border border-amber-800/60">Pro</span>;
      default: return <span className="bg-slate-800 text-slate-400 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">Unknown</span>;
    }
  };

  return (
    <div className="flex-1 bg-slate-950 p-4 md:p-8 overflow-y-auto relative flex flex-col h-full font-sans text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.05),transparent_70%)] z-0 pointer-events-none" />

      <div className="relative z-10 max-w-5xl w-full mx-auto flex-1 flex flex-col">
        {/* Title and Tab Switcher */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-5 h-5 text-yellow-500 animate-bounce" />
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">RallyUp Leaderboards</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter text-white">Club Standings</h1>
          </div>

          {/* Sub Tab selection */}
          <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-2xl md:w-80">
            <button
              onClick={() => setRankingTab('local')}
              className={`flex-1 h-10 rounded-xl text-xs font-bold transition-all uppercase flex items-center justify-center gap-2 ${
                rankingTab === 'local' 
                  ? 'bg-slate-800 text-white shadow border border-slate-700' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <MapPin className="w-4 h-4" />
              Local Session
            </button>
            <button
              onClick={() => setRankingTab('global')}
              className={`flex-1 h-10 rounded-xl text-xs font-bold transition-all uppercase flex items-center justify-center gap-2 ${
                rankingTab === 'global' 
                  ? 'bg-slate-800 text-white shadow border border-slate-700' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Globe className="w-4 h-4" />
              Global Platform
            </button>
          </div>
        </div>

        {/* Content Box */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-3xl p-6 shadow-2xl flex-1 flex flex-col overflow-hidden min-h-[450px]">
          {rankingTab === 'local' ? (
            /* LOCAL SESSION RANKINGS */
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">Active Session Leaders</h3>
                  <p className="text-xs text-slate-400">Rankings updated automatically after each completed match.</p>
                </div>
                <div className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-[10px] font-bold border border-emerald-500/15 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  Live Session
                </div>
              </div>

              {sortedLocalPlayers.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                  <div className="w-14 h-14 bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-500 border border-slate-700/50">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <h4 className="text-white font-bold mb-1">No rankings yet</h4>
                  <p className="text-slate-500 text-sm max-w-sm leading-relaxed">
                    Once the Queue Master starts the matches and records results, the local leaderboard will display active rankings here.
                  </p>
                </div>
              ) : (
                <div className="flex-1 overflow-x-auto overflow-y-auto">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="border-b border-slate-800/50 text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                        <th className="py-3 px-4">#</th>
                        <th className="py-3 px-4">Player</th>
                        <th className="py-3 px-4">Tier</th>
                        <th className="py-3 px-4">Streak</th>
                        <th className="py-3 px-4 text-center">W/L</th>
                        <th className="py-3 px-4 text-center">Win%</th>
                        <th className="py-3 px-4 text-right">Points</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/30">
                      {sortedLocalPlayers.map((player, index) => {
                        const rank = index + 1;
                        const streakColor = player.stats?.currentStreak > 0 
                          ? 'text-emerald-400 font-bold' 
                          : player.stats?.currentStreak < 0 
                            ? 'text-rose-400' 
                            : 'text-slate-500';
                        
                        return (
                          <tr key={`${player.id}-${index}`} className="hover:bg-slate-800/10 transition-colors">
                            <td className="py-3.5 px-4 font-mono font-bold text-sm text-slate-400">
                              {rank === 1 ? <span className="text-yellow-400 text-lg">🥇</span> : 
                               rank === 2 ? <span className="text-slate-300 text-lg">🥈</span> : 
                               rank === 3 ? <span className="text-amber-600 text-lg">🥉</span> : 
                               `#${rank}`}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold uppercase">
                                  {player.name.substring(0, 2)}
                                </div>
                                <span className="font-bold text-slate-200">{player.name}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">{getTierBadge(player.tier)}</td>
                            <td className="py-3.5 px-4 font-mono text-xs">
                              <span className={streakColor}>
                                {player.stats?.currentStreak > 0 ? `+${player.stats.currentStreak} W` : 
                                 player.stats?.currentStreak < 0 ? `${player.stats.currentStreak} L` : '-'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-xs text-center text-slate-300">
                              {player.stats?.wins || 0}W - {player.stats?.losses || 0}L
                            </td>
                            <td className="py-3.5 px-4 font-mono text-xs text-center text-emerald-400 font-bold">
                              {calculateWinRate(player.stats)}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-right font-black text-white text-sm">
                              {player.ratingScore}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            /* GLOBAL PLATFORM LEADERBOARD */
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Filters Block */}
              <div className="flex flex-col gap-4 mb-6 shrink-0 border-b border-slate-800/50 pb-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">Global Player Leaderboard</h3>
                    <p className="text-xs text-slate-400">RallyUp platform-wide rankings across all regional clubs.</p>
                  </div>
                  
                  {/* Search Bar */}
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search global players..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full h-10 pl-9 pr-4 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20"
                    />
                  </div>
                </div>

                {/* Sub Filters Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex bg-slate-950 border border-slate-800 p-1 rounded-xl">
                    <button
                      onClick={() => setGlobalFilter('all')}
                      className={`px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all uppercase flex items-center gap-1 ${
                        globalFilter === 'all' 
                          ? 'bg-slate-800 text-white shadow' 
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      Global
                    </button>
                    <button
                      onClick={() => setGlobalFilter('country')}
                      className={`px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all uppercase flex items-center gap-1 ${
                        globalFilter === 'country' 
                          ? 'bg-slate-800 text-white shadow' 
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      By Country ({userProfile?.country || 'Philippines'})
                    </button>
                  </div>

                  {/* Tier filtering buttons */}
                  <div className="flex flex-wrap gap-1.5 bg-slate-950 border border-slate-800 p-1 rounded-xl">
                    {['ALL', 'BEG', 'ADV_BEG', 'LOW_INT', 'INT', 'MID_INT', 'UP_INT', 'ADV', 'EXP', 'PRO'].map((t) => (
                      <button
                        key={t}
                        onClick={() => setTierFilter(t)}
                        className={`px-2.5 py-1 rounded-lg text-[9px] font-bold transition-all uppercase ${
                          tierFilter === t 
                            ? 'bg-red-500 text-[#ffffff]' 
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {t === 'ALL' ? 'All Tiers' : t.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {globalLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center">
                  <Loader2 className="w-8 h-8 text-red-500 animate-spin mb-2" />
                  <p className="text-slate-500 text-xs uppercase tracking-widest font-bold">Syncing Global Standings...</p>
                </div>
              ) : sortedGlobalPlayers.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                  <div className="w-14 h-14 bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-500 border border-slate-700/50">
                    <Globe className="w-6 h-6" />
                  </div>
                  <h4 className="text-white font-bold mb-1">No matching players found</h4>
                  <p className="text-slate-500 text-sm max-w-sm leading-relaxed">
                    Adjust your search query, country, or skill tier filter to find other global players.
                  </p>
                </div>
              ) : (
                <div className="flex-1 overflow-x-auto overflow-y-auto">
                  <table className="w-full text-left border-collapse min-w-[650px]">
                    <thead>
                      <tr className="border-b border-slate-800/50 text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                        <th className="py-3 px-4">#</th>
                        <th className="py-3 px-4">Player</th>
                        <th className="py-3 px-4">Country</th>
                        <th className="py-3 px-4">Tier</th>
                        <th className="py-3 px-4 text-center">Games</th>
                        <th className="py-3 px-4 text-center">Win%</th>
                        <th className="py-3 px-4 text-right">Points</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/30">
                      {sortedGlobalPlayers.map((player, index) => {
                        const rank = index + 1;
                        return (
                          <tr key={`${player.id}-${index}`} className="hover:bg-slate-800/10 transition-colors">
                            <td className="py-3.5 px-4 font-mono font-bold text-sm text-slate-400">
                              {rank === 1 ? <span className="text-yellow-400 text-lg">🥇</span> : 
                               rank === 2 ? <span className="text-slate-300 text-lg">🥈</span> : 
                               rank === 3 ? <span className="text-amber-600 text-lg">🥉</span> : 
                               `#${rank}`}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold uppercase">
                                  {player.name?.substring(0, 2)}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-bold text-slate-200 flex items-center gap-1.5">
                                    {player.name}
                                    {player.role === 'QUEUE_MASTER' && (
                                      <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[8px] px-1.5 py-0.2 rounded uppercase font-black tracking-wide">Host</span>
                                    )}
                                  </span>
                                  <span className="text-[9px] text-slate-500">{player.email}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                                {player.country || 'Philippines'}
                              </div>
                            </td>
                            <td className="py-3.5 px-4">{getTierBadge(player.skillTier)}</td>
                            <td className="py-3.5 px-4 font-mono text-xs text-center text-slate-300">
                              {player.stats?.gamesPlayed || 0} GP
                            </td>
                            <td className="py-3.5 px-4 font-mono text-xs text-center text-teal-400 font-bold">
                              {calculateWinRate(player.stats)}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-right font-black text-[#ffffff] text-sm">
                              {player.ratingScore || 1000}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
