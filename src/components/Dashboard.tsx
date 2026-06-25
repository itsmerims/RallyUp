import { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { useAuth } from '../contexts/AuthContext';
import * as firestoreService from '../services/firestore';
import CourtScene from './CourtScene';
import MatchMakerModal from './MatchMakerModal';
import AddPlayerModal from './AddPlayerModal';
import SettingsModal from './SettingsModal';
import { Plus, Check, Trophy, Settings, Trash2, LayoutGrid, Users, Activity, Menu, X, Loader2, LogOut } from 'lucide-react';
import { Player, SkillTier } from '../types';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { 
    players, courts, matches, isLoading, dataLoaded,
    setPlayers, setCourts, setMatches, setFinancialConfig, setDataLoaded, initializeCourts,
    togglePlayerPaid, completeMatch, deletePlayer, addCourt, deleteCourt
  } = useAppStore();
  
  const [isMatchMakerOpen, setMatchMakerOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAddPlayerModalOpen, setIsAddPlayerModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'courts' | 'players' | 'stats'>('courts');

  useEffect(() => {
    if (!user) return;
    
    let isInitialLoad = true;
    
    const unsubPlayers = firestoreService.subscribeToPlayers(user.uid, (playersData) => {
      setPlayers(playersData);
    });
    
    const unsubCourts = firestoreService.subscribeToCourts(user.uid, (courtsData) => {
      if (courtsData.length === 0 && isInitialLoad) {
        initializeCourts(user.uid);
      } else {
        setCourts(courtsData);
      }
    });
    
    const unsubMatches = firestoreService.subscribeToMatches(user.uid, (matchesData) => {
      setMatches(matchesData);
    });
    
    const unsubConfig = firestoreService.subscribeToFinancialConfig(user.uid, (configData) => {
      if (configData) setFinancialConfig(configData);
    });

    // Simulate initial data loading delay for smoother transition
    const timer = setTimeout(() => {
      isInitialLoad = false;
      setDataLoaded(true);
    }, 1000);

    return () => {
      unsubPlayers();
      unsubCourts();
      unsubMatches();
      unsubConfig();
      clearTimeout(timer);
    };
  }, [user, setPlayers, setCourts, setMatches, setFinancialConfig, setDataLoaded, initializeCourts]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.05),transparent_70%)] z-0 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col items-center gap-6">
          <div className="w-16 h-16 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.15)] relative">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            <div className="absolute inset-0 border-2 border-emerald-500/20 rounded-2xl animate-pulse"></div>
          </div>
          <div className="flex flex-col items-center gap-1">
             <h2 className="text-xl font-black italic uppercase tracking-widest text-white">Syncing Workspace</h2>
             <p className="text-xs font-mono text-slate-500">Establishing secure connection...</p>
          </div>
        </div>
      </div>
    );
  }
  
  const activeMatches = matches.filter(m => m.status === 'Active');

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
    <div className="fixed inset-0 bg-slate-950 text-slate-100 font-sans flex flex-col overflow-hidden">
      {/* Top Navigation / Status Bar */}
      <header className="h-16 flex items-center justify-between px-4 md:px-8 bg-slate-900/50 border-b border-slate-800 backdrop-blur-md z-20 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors">
            <Menu className="w-6 h-6" />
          </button>
          <div className="w-10 h-10 bg-emerald-500 hidden sm:flex items-center justify-center rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.4)]">
            <svg className="w-6 h-6 text-slate-950" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
            </svg>
          </div>
          <h1 className="text-xl md:text-2xl font-black tracking-tighter uppercase italic text-emerald-400">RallyUp <span className="text-slate-500 font-normal hidden sm:inline">v2.0</span></h1>
        </div>
        <div className="flex items-center gap-6 md:gap-8">
          <div className="hidden md:flex items-center gap-8">
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase tracking-widest text-slate-500">Utilization</span>
              <span className="text-emerald-400 font-mono font-bold">
                {courts.length ? Math.round((courts.filter(c => c.status !== 'Available').length / courts.length) * 100) : 0}%
              </span>
            </div>
            <div className="h-8 w-px bg-slate-800"></div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase tracking-widest text-slate-500">Shuttles Used</span>
              <span className="text-teal-400 font-mono font-bold">
                {matches.reduce((acc, m) => acc + (m.shuttlecocksUsed || 0), 0)}
              </span>
            </div>
            <div className="h-8 w-px bg-slate-800"></div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase tracking-widest text-slate-500">Paid Ratio</span>
              <span className="text-white font-mono font-bold">
                {players.filter(p => p.hasPaid).length} / {players.length || 1}
              </span>
            </div>
          </div>
          <div className="h-8 w-px bg-slate-800 hidden md:block"></div>
          <button 
            onClick={logout}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar: Player Queue / Roster */}
        <div className={`fixed inset-0 bg-slate-950/50 z-30 lg:hidden transition-opacity ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsSidebarOpen(false)} />
        <aside className={`absolute lg:relative z-40 h-full w-80 border-r border-slate-800 bg-slate-950/95 lg:bg-slate-950/80 backdrop-blur-xl flex flex-col p-6 shrink-0 transition-all duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:-ml-80'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">Roster ({players.length})</h2>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="mb-6">
            <button 
              onClick={() => setIsAddPlayerModalOpen(true)}
              className="w-full h-14 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors border border-slate-700 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,0,0,0.2)]"
            >
              <Plus className="w-5 h-5" />
              <span className="font-bold text-sm tracking-widest uppercase">Add Player</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
            {players.map(player => (
              <div key={player.id} className={`p-4 border rounded-2xl flex items-center justify-between group transition-colors ${
                player.status === 'RESTING' ? 'bg-slate-900/50 border-slate-800/50 opacity-70' : 'bg-slate-900 border-slate-800'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full border border-slate-600 flex items-center justify-center text-xs font-bold ${
                    player.status === 'PLAYING' ? 'bg-gradient-to-br from-teal-500 to-emerald-600 text-slate-950 font-black' : 
                    'bg-gradient-to-br from-slate-700 to-slate-800 text-white'
                  }`}>
                    {player.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-bold">{player.name}</div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wide">
                      {player.tier?.replace('_', ' ')} • <span className={
                        player.status === 'PLAYING' ? 'text-emerald-400' :
                        player.status === 'WAITING' ? 'text-amber-400' : 'text-slate-500'
                      }>{player.status}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      if (user) togglePlayerPaid(user.uid, player.id);
                    }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors border ${
                      player.hasPaid ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10' : 'border-slate-700 text-slate-500 hover:text-white'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => {
                    if (user) deletePlayer(user.uid, player.id);
                  }} className="text-slate-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                     <Trash2 className="w-4 h-4"/>
                  </button>
                </div>
              </div>
            ))}
            {players.length === 0 && (
              <div className="text-center text-slate-500 text-sm mt-10">
                No players in roster.
              </div>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        {activeTab === 'courts' && (
          <section className="flex-1 bg-slate-950 relative overflow-hidden flex flex-col">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.1),transparent_70%)] z-0 pointer-events-none"></div>
            
            <div className="w-full relative z-10 border-b border-slate-800/50 bg-slate-950 shadow-2xl shrink-0">
              <CourtScene courts={courts.map(c => ({
                id: c.id,
                name: c.name,
                status: c.status === 'Available' ? 'VACANT' : c.status === 'Occupied' ? 'OCCUPIED' : 'FINISHING'
              }))} />
            </div>

            <div className="p-4 md:p-8 flex-1 overflow-y-auto relative z-10 grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-8 content-start custom-scrollbar pb-32">
              {courts.map(court => {
                const activeMatch = matches.find(m => m.id === court.activeMatchId);
                
                if (court.status === 'Available') {
                  return (
                    <div 
                      key={court.id} 
                      onClick={() => setMatchMakerOpen(true)}
                      className="relative bg-slate-900/40 border-2 border-dashed border-emerald-500/40 rounded-3xl p-6 flex flex-col items-center justify-center min-h-[240px] group hover:bg-emerald-500/5 transition-all cursor-pointer"
                    >
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (user) {
                            deleteCourt(user.uid, court.id);
                          }
                        }}
                        className="absolute top-4 right-4 p-2 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-full transition-colors z-50 cursor-pointer"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                      <div className="w-16 h-16 rounded-full border-2 border-emerald-500/40 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <span className="text-3xl text-emerald-400">+</span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">{court.name}</span>
                      <h3 className="text-xl font-black text-slate-500 mt-1">READY FOR MATCH</h3>
                    </div>
                  );
                }

                const isFinishing = court.status === 'Finishing Soon';
                const borderColor = isFinishing ? 'border-amber-500' : 'border-rose-500';
                const shadowColor = isFinishing ? 'shadow-[0_0_40px_rgba(245,158,11,0.15)]' : 'shadow-[0_0_40px_rgba(244,63,94,0.15)]';
                const textColor = isFinishing ? 'text-amber-400' : 'text-rose-400';

                return (
                  <div key={court.id} className={`relative bg-slate-900/80 border-2 ${borderColor} ${shadowColor} rounded-3xl p-6 flex flex-col min-h-[240px]`}>
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (user) {
                          deleteCourt(user.uid, court.id);
                        }
                      }}
                      className="absolute top-4 right-4 p-2 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-full transition-colors z-50 cursor-pointer"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    <div className="flex justify-between items-start mb-6 mt-4">
                      <div>
                        <span className={`text-[10px] font-bold ${textColor} uppercase tracking-widest`}>{court.name}</span>
                        <h3 className="text-xl font-black mt-1 uppercase">{isFinishing ? 'FINAL SET' : 'MATCH ACTIVE'}</h3>
                      </div>
                      <div className="text-right">
                        <div className={`text-[10px] uppercase tracking-widest font-bold mb-2 ${
                          (court.queue?.length || 0) > 0 ? 'text-emerald-400' : 'text-slate-500'
                        }`}>
                          Queue: {court.queue?.length || 0} Wait
                        </div>
                        <button 
                          onClick={() => {
                            if (!activeMatch || !user) return;
                            const shuttlesStr = window.prompt("How many shuttlecocks were used?", "1");
                            const shuttlesUsed = parseInt(shuttlesStr || "1") || 1;
                            
                            const scoreAStr = window.prompt("Enter Team A score", "21");
                            const scoreBStr = window.prompt("Enter Team B score", "15");
                            const scoreA = parseInt(scoreAStr || "21") || 21;
                            const scoreB = parseInt(scoreBStr || "15") || 15;

                            completeMatch(user.uid, activeMatch.id, scoreA, scoreB, shuttlesUsed);
                            
                            if (court.queue.length > 0) {
                               setTimeout(() => {
                                 alert(`[SYSTEM DISPATCH] SMS Sent to next players for ${court.name}`);
                               }, 500);
                            }
                          }}
                          className={`text-xs px-3 py-1.5 rounded-full font-bold uppercase transition-colors border ${
                            isFinishing ? 'border-amber-500 text-amber-500 hover:bg-amber-500/10' : 'border-rose-500 text-rose-500 hover:bg-rose-500/10'
                          }`}
                        >
                          End Match
                        </button>
                      </div>
                    </div>

                    {activeMatch ? (
                      <div className="flex-1 flex flex-col gap-4 justify-center">
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                            {activeMatch.teamA?.map(id => {
                              const p = players.find(x => x.id === id);
                              return <div key={id} className={`px-4 py-2.5 bg-slate-800 rounded-xl text-sm font-bold border-l-2 ${borderColor} shadow-inner truncate`}>{p?.name || 'Unknown'}</div>;
                            })}
                          </div>
                          <div className="space-y-2">
                            {activeMatch.teamB?.map(id => {
                              const p = players.find(x => x.id === id);
                              return <div key={id} className="px-4 py-2.5 bg-slate-800 rounded-xl text-sm font-bold border-r-2 border-teal-500 text-right shadow-inner truncate">{p?.name || 'Unknown'}</div>;
                            })}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-slate-500 italic">No Active Match Data</div>
                    )}
                    
                    <div className="mt-6 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex">
                      <div className={`h-full ${isFinishing ? 'bg-amber-500 w-[90%]' : 'bg-rose-500 w-[45%]'}`}></div>
                    </div>
                  </div>
                );
              })}
              
              <div 
                onClick={() => user && addCourt(user.uid, `Court ${courts.length + 1}`)}
                className="bg-slate-900/20 border-2 border-dashed border-slate-700/50 rounded-3xl p-6 flex flex-col items-center justify-center min-h-[240px] group hover:bg-slate-800/20 hover:border-slate-600 transition-all cursor-pointer"
              >
                <div className="w-16 h-16 rounded-full border-2 border-slate-700/50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <span className="text-3xl text-slate-500">+</span>
                </div>
                <h3 className="text-xl font-black text-slate-600 mt-1">ADD COURT</h3>
              </div>
            </div>

            {/* Floating Quick Actions */}
            <div className="absolute bottom-4 right-4 md:bottom-8 md:right-8 flex gap-3 md:gap-4 z-50">
              <button 
                onClick={() => setIsSettingsOpen(true)}
                className="settings-icon-button w-14 h-14 md:w-16 md:h-16 bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-700 shadow-xl text-slate-300 hover:text-white transition-all cursor-pointer active:scale-95 shrink-0"
              >
                <Settings className="w-6 h-6" />
              </button>
              <button 
                onClick={() => setMatchMakerOpen(true)}
                className="h-14 md:h-16 px-6 md:px-8 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl flex items-center justify-center gap-2 md:gap-3 shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all active:scale-95 shrink-0"
              >
                <span className="text-2xl leading-none">+</span> <span className="hidden sm:inline">NEW MATCH</span>
              </button>
            </div>
          </section>
        )}

        {activeTab === 'players' && (
          <section className="flex-1 bg-slate-950 relative overflow-y-auto p-4 md:p-8 custom-scrollbar">
            <div className="max-w-6xl mx-auto space-y-8 pb-20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl md:text-3xl font-black uppercase italic tracking-tight text-white">Player Directory</h2>
                  <p className="text-sm text-slate-400 mt-1">Manage full roster, stats, and financials.</p>
                </div>
                <button 
                  onClick={() => setIsAddPlayerModalOpen(true)}
                  className="h-12 px-6 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all active:scale-95"
                >
                  <Plus className="w-5 h-5" /> ADD PLAYER
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {players.map(player => (
                  <div key={player.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4 group hover:border-slate-700 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full border border-slate-600 flex items-center justify-center text-sm font-bold ${
                          player.status === 'PLAYING' ? 'bg-gradient-to-br from-teal-500 to-emerald-600 text-slate-950 font-black' : 
                          'bg-gradient-to-br from-slate-700 to-slate-800 text-white'
                        }`}>
                          {player.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-lg font-bold text-white truncate max-w-[150px]">{player.name}</div>
                          <div className="text-[10px] text-slate-400 uppercase tracking-wide">
                            {player.tier?.replace('_', ' ')}
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-2">
                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded border ${
                          player.status === 'PLAYING' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' :
                          player.status === 'WAITING' ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' :
                          'text-slate-400 border-slate-700 bg-slate-800'
                        }`}>
                          {player.status}
                        </span>
                        <button 
                          onClick={() => {
                            if (user) togglePlayerPaid(user.uid, player.id);
                          }}
                          className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded flex items-center gap-1 transition-colors ${
                            player.hasPaid ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400 bg-slate-800 hover:text-white'
                          }`}
                        >
                          {player.hasPaid ? <><Check className="w-3 h-3"/> PAID</> : 'UNPAID'}
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-800">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider">Rating</span>
                        <span className="text-sm font-bold text-white">{Math.round(player.ratingScore || 1000)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider">Games</span>
                        <span className="text-sm font-bold text-white">{player.stats?.gamesPlayed || 0}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider">Win/Loss</span>
                        <span className="text-sm font-bold text-white">{player.stats?.wins || 0} - {player.stats?.losses || 0}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {players.length === 0 && (
                  <div className="col-span-full py-20 text-center text-slate-500 border-2 border-dashed border-slate-800 rounded-3xl">
                    No players found. Add someone to get started!
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'stats' && (
          <section className="flex-1 bg-slate-950 relative overflow-y-auto p-4 md:p-8 custom-scrollbar">
            <div className="max-w-6xl mx-auto space-y-8 pb-20">
              <div>
                <h2 className="text-2xl md:text-3xl font-black uppercase italic tracking-tight text-white">Analytics & History</h2>
                <p className="text-sm text-slate-400 mt-1">Review past matches and club performance.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-center">
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Total Matches</span>
                  <span className="text-4xl font-black text-white">{matches.length}</span>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-center">
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Total Players</span>
                  <span className="text-4xl font-black text-emerald-400">{players.length}</span>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-center">
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Shuttles Consumed</span>
                  <span className="text-4xl font-black text-teal-400">{matches.reduce((acc, m) => acc + (m.shuttlecocksUsed || 0), 0)}</span>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 border-b border-slate-800 pb-2">Match History</h3>
                {matches.filter(m => m.status === 'Completed').reverse().map(match => (
                  <div key={match.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest">{new Date(match.startTime || Date.now()).toLocaleString()}</span>
                      <span className="text-sm font-bold text-white">Court {match.id.substring(0, 4)}</span>
                    </div>
                    
                    <div className="flex items-center gap-4 md:gap-8 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                      <div className="flex flex-col items-end gap-1 min-w-[120px]">
                        {match.teamA?.map(id => (
                          <span key={id} className="text-xs text-slate-300 font-medium truncate max-w-[150px]">{players.find(p => p.id === id)?.name || 'Unknown'}</span>
                        ))}
                      </div>
                      
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-2xl font-black ${(match.scoreA || 0) > (match.scoreB || 0) ? 'text-emerald-400' : 'text-slate-500'}`}>{match.scoreA || 0}</span>
                        <span className="text-slate-600 font-bold">-</span>
                        <span className={`text-2xl font-black ${(match.scoreB || 0) > (match.scoreA || 0) ? 'text-emerald-400' : 'text-slate-500'}`}>{match.scoreB || 0}</span>
                      </div>

                      <div className="flex flex-col items-start gap-1 min-w-[120px]">
                        {match.teamB?.map(id => (
                          <span key={id} className="text-xs text-slate-300 font-medium truncate max-w-[150px]">{players.find(p => p.id === id)?.name || 'Unknown'}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                {matches.filter(m => m.status === 'Completed').length === 0 && (
                  <div className="py-12 text-center text-slate-500 italic">No completed matches yet.</div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Right Panel: Desktop Navigation */}
        <aside className="w-24 border-l border-slate-800 bg-slate-900 flex flex-col items-center py-8 gap-10 shrink-0 z-20 hidden lg:flex">
          <div onClick={() => setActiveTab('stats')} className={`flex flex-col items-center gap-1 cursor-pointer transition-opacity ${activeTab === 'stats' ? 'text-emerald-400 opacity-100' : 'text-slate-300 opacity-40 hover:opacity-100'}`}>
            <div className="w-10 h-10 flex items-center justify-center"><Activity className="w-5 h-5"/></div>
            <span className="text-[9px] font-bold uppercase tracking-tighter">Stats</span>
          </div>
          <div onClick={() => setActiveTab('courts')} className={`flex flex-col items-center gap-1 cursor-pointer transition-opacity ${activeTab === 'courts' ? 'text-emerald-400 opacity-100' : 'text-slate-300 opacity-40 hover:opacity-100'}`}>
            <div className="w-10 h-10 flex items-center justify-center"><LayoutGrid className="w-5 h-5"/></div>
            <span className="text-[9px] font-bold uppercase tracking-tighter">Courts</span>
          </div>
          <div onClick={() => setActiveTab('players')} className={`flex flex-col items-center gap-1 cursor-pointer transition-opacity ${activeTab === 'players' ? 'text-emerald-400 opacity-100' : 'text-slate-300 opacity-40 hover:opacity-100'}`}>
            <div className="w-10 h-10 flex items-center justify-center"><Users className="w-5 h-5"/></div>
            <span className="text-[9px] font-bold uppercase tracking-tighter">Players</span>
          </div>
          
          <div className="mt-auto flex flex-col items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[8px] text-slate-500 font-bold tracking-widest">LIVE</span>
          </div>
        </aside>
      </main>

      {/* Bottom Bar: Status (Desktop) & Navigation (Mobile) */}
      <footer className="bg-slate-900 border-t border-slate-800 shrink-0 z-30 flex flex-col">
        {/* Mobile Navigation */}
        <div className="flex lg:hidden justify-around items-center h-16 border-b border-slate-800/50 px-4">
          <div onClick={() => setActiveTab('stats')} className={`flex flex-col items-center gap-1 flex-1 cursor-pointer transition-colors ${activeTab === 'stats' ? 'text-emerald-400' : 'text-slate-400'}`}>
            <Activity className="w-5 h-5"/>
            <span className="text-[9px] font-bold uppercase tracking-tighter">Stats</span>
          </div>
          <div onClick={() => setActiveTab('courts')} className={`flex flex-col items-center gap-1 flex-1 cursor-pointer transition-colors ${activeTab === 'courts' ? 'text-emerald-400' : 'text-slate-400'}`}>
            <LayoutGrid className="w-5 h-5"/>
            <span className="text-[9px] font-bold uppercase tracking-tighter">Courts</span>
          </div>
          <div onClick={() => setActiveTab('players')} className={`flex flex-col items-center gap-1 flex-1 cursor-pointer transition-colors ${activeTab === 'players' ? 'text-emerald-400' : 'text-slate-400'}`}>
            <Users className="w-5 h-5"/>
            <span className="text-[9px] font-bold uppercase tracking-tighter">Players</span>
          </div>
        </div>
        
        {/* Status Bar */}
        <div className="h-10 md:h-12 flex items-center px-4 md:px-8 text-[9px] md:text-[10px] text-slate-500 justify-between">
          <div className="flex gap-4 md:gap-6 items-center uppercase tracking-widest font-bold">
            <span className="flex items-center gap-1.5 md:gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> <span className="hidden sm:inline">Cloud Synced</span><span className="sm:hidden">Synced</span></span>
            <span className="flex items-center gap-1.5 md:gap-2"><div className="w-1.5 h-1.5 rounded-full bg-teal-500"></div> {players.length} <span className="hidden sm:inline">Players Active</span></span>
            <span className="hidden md:flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-slate-500"></div> System Stable</span>
          </div>
          <div className="font-mono text-slate-400 uppercase">
            {matches.filter(m => m.status === 'Completed').length} <span className="hidden sm:inline">Matches Completed</span><span className="sm:hidden">Matches</span>
          </div>
        </div>
      </footer>
      
      <MatchMakerModal isOpen={isMatchMakerOpen} onClose={() => setMatchMakerOpen(false)} />
      <AddPlayerModal isOpen={isAddPlayerModalOpen} onClose={() => setIsAddPlayerModalOpen(false)} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}
