import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { useAuth } from '../contexts/AuthContext';
import { Activity, Users, Trophy, Award, MapPin, Key, Shield, RefreshCw, Sparkles, AlertCircle, HelpCircle, Bell, BellRing } from 'lucide-react';
import CourtScene from './CourtScene';
import { SkillTier } from '../types';
import { requestPlayerNotificationPermission } from '../services/notifications';
import gsap from 'gsap';

interface PlayerDashboardProps {
  joinedQmUserId: string | null;
  onNavigateToSettings: () => void;
}

export default function PlayerDashboard({ joinedQmUserId, onNavigateToSettings }: PlayerDashboardProps) {
  const { userProfile } = useAuth();
  const { players, courts, matches } = useAppStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'roster'>('overview');

  const bannerRef = useRef<HTMLDivElement>(null);
  const statsGridRef = useRef<HTMLDivElement>(null);
  const courtMonitorRef = useRef<HTMLDivElement>(null);
  const rosterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (bannerRef.current) {
        gsap.fromTo(bannerRef.current,
          { y: -20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' }
        );
      }
      if (statsGridRef.current) {
        const statCards = statsGridRef.current.querySelectorAll('.stat-card');
        gsap.fromTo(statCards,
          { y: 30, opacity: 0, scale: 0.95 },
          { y: 0, opacity: 1, scale: 1, duration: 0.5, stagger: 0.07, ease: 'power2.out', delay: 0.2 }
        );
      }
      if (courtMonitorRef.current) {
        gsap.fromTo(courtMonitorRef.current,
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out', delay: 0.4 }
        );
      }
      if (rosterRef.current) {
        gsap.fromTo(rosterRef.current,
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out', delay: 0.5 }
        );
        const rosterItems = rosterRef.current.querySelectorAll('.roster-item');
        gsap.fromTo(rosterItems,
          { x: -15, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.4, stagger: 0.04, ease: 'power2.out', delay: 0.6 }
        );
      }
    });
    return () => ctx.revert();
  }, []);

  const [notifyingId, setNotifyingId] = useState<string | null>(null);
  const [subscribedPlayers, setSubscribedPlayers] = useState<string[]>(() => {
    if (!joinedQmUserId) return [];
    try {
      const stored = localStorage.getItem(`rallyup_subscribed_players_${joinedQmUserId}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (joinedQmUserId) {
      localStorage.setItem(`rallyup_subscribed_players_${joinedQmUserId}`, JSON.stringify(subscribedPlayers));
    }
  }, [subscribedPlayers, joinedQmUserId]);

  const handleSubscribe = async (playerId: string) => {
    if (!joinedQmUserId || notifyingId) return;
    setNotifyingId(playerId);
    try {
      const ok = await requestPlayerNotificationPermission(joinedQmUserId, playerId);
      if (ok && !subscribedPlayers.includes(playerId)) {
        setSubscribedPlayers(prev => [...prev, playerId]);
      }
    } finally {
      setNotifyingId(null);
    }
  };

  const currentMatch = matches.find(m => 
    m.status === 'Active' && 
    (m.teamA.includes(userProfile?.id || '') || m.teamB.includes(userProfile?.id || ''))
  );

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'BEGINNER': return 'text-slate-400';
      case 'LOW_INTERMEDIATE': return 'text-blue-400';
      case 'INTERMEDIATE': return 'text-emerald-400';
      case 'ADVANCED': return 'text-purple-400';
      default: return 'text-slate-400';
    }
  };

  const getTierLabel = (tier: string) => {
    return tier?.replace('_', ' ') || 'Beginner';
  };

  const winRate = userProfile?.stats?.gamesPlayed 
    ? `${Math.round((userProfile.stats.wins / userProfile.stats.gamesPlayed) * 100)}%` 
    : '0%';

  return (
    <div className="flex-1 bg-slate-950 p-4 md:p-8 overflow-y-auto relative flex flex-col h-full font-sans text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.05),transparent_70%)] z-0 pointer-events-none" />

      <div className="relative z-10 max-w-5xl w-full mx-auto flex-1 flex flex-col gap-6">
        
        {/* Banner Card / Connection Status */}
        <div ref={bannerRef} className="bg-slate-900 border border-slate-800/80 rounded-3xl p-6 shadow-2xl relative overflow-hidden shrink-0">
          <div className="absolute right-0 top-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center font-black text-slate-950 italic text-xl shadow-[0_0_20px_rgba(16,185,129,0.25)]">
                {userProfile?.name?.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  Welcome back, {userProfile?.name}!
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                    Player
                  </span>
                </h2>
                <p className="text-slate-400 text-xs mt-0.5">
                  Skill level: <span className={`font-bold uppercase ${getTierColor(userProfile?.skillTier || '')}`}>{getTierLabel(userProfile?.skillTier || '')}</span> • {userProfile?.country}
                </p>
              </div>
            </div>

            {/* Connection Indicator */}
            {joinedQmUserId ? (
              <div className="flex items-center gap-3 bg-slate-950/60 border border-slate-800 p-3 rounded-2xl">
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                <div className="text-left">
                  <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Session Connected</div>
                  <div className="text-xs font-mono font-bold text-slate-200">
                    Host ID: {joinedQmUserId.substring(0, 8)}...
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4 bg-slate-950/40 border border-red-500/10 p-3 rounded-2xl">
                <AlertCircle className="w-5 h-5 text-amber-500 animate-pulse shrink-0" />
                <div className="text-left">
                  <div className="text-xs font-bold text-slate-300">Not Connected to Session</div>
                  <button 
                    onClick={onNavigateToSettings}
                    className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold uppercase tracking-wider flex items-center gap-1 mt-0.5"
                  >
                    Enter Session Code <Key className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Player Stats Dashboard Widgets */}
        <div ref={statsGridRef} className="grid grid-cols-2 md:grid-cols-5 gap-4 shrink-0">
          <div className="stat-card bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Rating Score</span>
            <span className="text-2xl font-black text-white font-mono mt-1">{userProfile?.ratingScore || 1000}</span>
            <span className="text-[9px] text-slate-400">All-time points</span>
          </div>
          <div className="stat-card bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Games Played</span>
            <span className="text-2xl font-black text-white font-mono mt-1">{userProfile?.stats?.gamesPlayed || 0}</span>
            <span className="text-[9px] text-slate-400">Total match completions</span>
          </div>
          <div className="stat-card bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Wins</span>
            <span className="text-2xl font-black text-emerald-400 font-mono mt-1">{userProfile?.stats?.wins || 0}</span>
            <span className="text-[9px] text-slate-400">Total match victories</span>
          </div>
          <div className="stat-card bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Win Rate</span>
            <span className="text-2xl font-black text-teal-400 font-mono mt-1">{winRate}</span>
            <span className="text-[9px] text-slate-400">Efficiency percentage</span>
          </div>
          <div className="stat-card bg-slate-900 border border-slate-800 rounded-2xl p-4 col-span-2 md:col-span-1 flex flex-col justify-between">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Current Streak</span>
            <span className={`text-2xl font-black font-mono mt-1 ${userProfile?.stats?.currentStreak && userProfile.stats.currentStreak > 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
              {userProfile?.stats?.currentStreak && userProfile.stats.currentStreak > 0 ? `+${userProfile.stats.currentStreak}` : userProfile?.stats?.currentStreak || '0'}
            </span>
            <span className="text-[9px] text-slate-400">Current running streak</span>
          </div>
        </div>

        {/* Dynamic content tab switches */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1 min-h-0">
          
          {/* Main live board */}
          <div className="lg:col-span-8 flex flex-col gap-6 h-full overflow-hidden">
            
            {/* Live Courts status card */}
            <div ref={courtMonitorRef} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col h-full overflow-hidden">
              <div className="flex items-center justify-between mb-4 shrink-0">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-bold text-white uppercase tracking-tight text-sm">Live Court Monitor</h3>
                </div>
                <span className="text-[10px] bg-slate-950 border border-slate-800 text-slate-400 font-bold uppercase px-2.5 py-1 rounded-lg">
                  {courts.length} Active Courts
                </span>
              </div>

              {!joinedQmUserId ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-950/20 rounded-2xl border border-slate-850">
                  <HelpCircle className="w-12 h-12 text-slate-600 mb-2" />
                  <h4 className="text-white font-bold text-sm mb-1">Not Connected to Session</h4>
                  <p className="text-slate-500 text-xs max-w-sm leading-relaxed mb-4">
                    Connecting to your Queue Master's active Session ID allows you to monitor live court schedules, current matches, and see waitlists in real-time.
                  </p>
                  <button
                    onClick={onNavigateToSettings}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs uppercase tracking-wider"
                  >
                    Enter Session Code
                  </button>
                </div>
              ) : courts.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-950/20 rounded-2xl border border-slate-850">
                  <RefreshCw className="w-8 h-8 text-slate-600 mb-2 animate-spin" />
                  <h4 className="text-white font-bold text-sm mb-1">Synchronizing Courts...</h4>
                  <p className="text-slate-500 text-xs max-w-xs">
                    Please wait while we receive active session details from the host server.
                  </p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                  {/* Embedded 3D scene representation */}
                  <CourtScene courts={courts.map(c => {
                    const activeMatch = matches.find(m => m.id === c.activeMatchId);
                    const teamAPlayers = activeMatch ? activeMatch.teamA.map(pId => {
                      const p = players.find(player => player.id === pId);
                      return p ? { id: p.id, name: p.name, tier: p.tier } : null;
                    }).filter((p): p is { id: string; name: string; tier: SkillTier } => p !== null) : [];
                    
                    const teamBPlayers = activeMatch ? activeMatch.teamB.map(pId => {
                      const p = players.find(player => player.id === pId);
                      return p ? { id: p.id, name: p.name, tier: p.tier } : null;
                    }).filter((p): p is { id: string; name: string; tier: SkillTier } => p !== null) : [];

                    return {
                      id: c.id,
                      name: c.name,
                      status: c.status === 'Available' ? 'VACANT' : c.status === 'Occupied' ? 'OCCUPIED' : 'FINISHING',
                      teamA: teamAPlayers,
                      teamB: teamBPlayers
                    };
                  })} />

                  {/* Text-based live lists of courts */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-2">
                    {courts.map((court, index) => {
                      const activeMatch = matches.find(m => m.id === court.activeMatchId);
                      const isUserPlayingOnThisCourt = activeMatch && 
                        ([...activeMatch.teamA, ...activeMatch.teamB].includes(userProfile?.id || ''));

                      return (
                        <div 
                          key={`${court.id}-${index}`} 
                          className={`p-4 rounded-2xl border flex flex-col justify-between h-28 ${
                            isUserPlayingOnThisCourt
                              ? 'border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/20'
                              : 'border-slate-800 bg-slate-950/40'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-xs text-white">{court.name}</span>
                            <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                              court.status === 'Available' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                            }`}>
                              {court.status}
                            </span>
                          </div>

                          <div className="my-2">
                            {activeMatch ? (
                              <div className="text-[11px] text-slate-400 flex items-center justify-between">
                                <span className="font-bold text-slate-200">
                                  {activeMatch.teamA.map(pId => players.find(p => p.id === pId)?.name || 'Empty').join(' / ')}
                                </span>
                                <span className="text-slate-500 font-bold uppercase text-[9px] mx-1">VS</span>
                                <span className="font-bold text-slate-200">
                                  {activeMatch.teamB.map(pId => players.find(p => p.id === pId)?.name || 'Empty').join(' / ')}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-500">No active game on court.</span>
                            )}
                          </div>

                          {isUserPlayingOnThisCourt && (
                            <div className="bg-emerald-500/20 text-emerald-400 text-[9px] py-1 text-center font-bold rounded-lg uppercase tracking-wider flex items-center justify-center gap-1">
                              <Sparkles className="w-3.5 h-3.5" />
                              YOU ARE PLAYING ON THIS COURT!
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Right Sidebar: Personal Notifications / Active Queues */}
          <div ref={rosterRef} className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col gap-5 h-full overflow-hidden">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-white uppercase tracking-tight text-sm">Active Session Roster</h3>
            </div>

            {!joinedQmUserId ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                <p className="text-slate-500 text-xs">Roster matches will appear when connected.</p>
              </div>
            ) : players.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                <p className="text-slate-500 text-xs">Session roster has no active players.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                {players.map((p, index) => {
                  const isMe = p.id === userProfile?.id;
                  const isSubscribed = subscribedPlayers.includes(p.id);
                  const isNotifying = notifyingId === p.id;
                  return (
                    <div 
                      key={`${p.id}-${index}`} 
                      className={`roster-item p-3 border rounded-xl flex items-center justify-between transition-colors ${
                        isMe 
                          ? 'bg-emerald-500/10 border-emerald-500/30 ring-1 ring-emerald-500/10' 
                          : 'bg-slate-950/40 border-slate-850'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-7 h-7 rounded-full border flex items-center justify-center text-[10px] font-bold uppercase shrink-0 ${
                          isMe ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black' : 'bg-slate-800 border-slate-700 text-slate-300'
                        }`}>
                          {p.name.substring(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5 truncate max-w-[120px]">
                            <span className="truncate">{p.name}</span>
                            {isMe && <span className="bg-emerald-500 text-slate-950 text-[8px] px-1.5 py-0.2 rounded uppercase font-black tracking-wide shrink-0">Me</span>}
                            {isSubscribed && <BellRing className="w-3 h-3 text-emerald-400 shrink-0" />}
                          </div>
                          <span className="text-[9px] text-slate-500 uppercase tracking-wide truncate block">
                            {getTierLabel(p.tier)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleSubscribe(p.id)}
                          disabled={isNotifying || isSubscribed}
                          className={`p-1 rounded-lg transition-colors ${
                            isSubscribed
                              ? 'text-emerald-400/60 cursor-default'
                              : isNotifying
                                ? 'text-slate-600 animate-pulse'
                                : 'text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10'
                          }`}
                          title={isSubscribed ? 'Notifications active' : 'Get notified when your match is ready'}
                        >
                          {isSubscribed ? (
                            <BellRing className="w-3.5 h-3.5" />
                          ) : (
                            <Bell className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                          p.status === 'PLAYING' ? 'bg-emerald-500/10 text-emerald-400' :
                          p.status === 'WAITING' ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {p.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
