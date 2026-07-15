import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { useAuth } from '../contexts/AuthContext';
import * as firestoreService from '../services/firestore';
import CourtScene from './CourtScene';
import { getTierFromShortcut, getTierLabel } from '../utils/tiers';
import { generateOptimalMatch } from '../utils/matchmaker';
import WelcomeModal from './WelcomeModal';
import LocalGlobalRankings from './LocalGlobalRankings';
import FinancePage from './FinancePage';
import SettingsPage from './SettingsPage';
import PlayerDashboard from './PlayerDashboard';
import ThemeToggle from './ThemeToggle';
import NotificationToast, { createToast } from './NotificationToast';
import type { ToastItem } from './NotificationToast';
import { 
  Plus, Check, Trophy, Settings, Trash2, LayoutGrid, Users, 
  Activity, Menu, X, Loader2, LogOut, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Monitor, MonitorOff, Coins, Info, ShieldAlert, Sparkles, Bell, RotateCcw
} from 'lucide-react';
import { Player, SkillTier } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { requestNotificationPermission, removePlayerFcmToken, setupMessageListener } from '../services/notifications';
import gsap from 'gsap';
import { formatWaitTime } from '../utils/time';
import PlayerInfoModal from './PlayerInfoModal';
import SessionModal from './SessionModal';
import SessionChoiceModal from './SessionChoiceModal';
import ClubDashboard from './ClubDashboard';
import AddPlayerModal from './AddPlayerModal';
import CompactPipeline from './CompactPipeline';
import { readWorkspace, writeWorkspacePart } from '../services/localData';

export default function Dashboard() {
  const { user, userProfile, logout } = useAuth();
  const { 
    players, courts, matches, clubs, clubMembers,
    isLoading, dataLoaded, currentSessionId, connectionMode,
    setPlayers, setCourts, setMatches, setFinancialConfig, setDataLoaded, setCurrentSessionId, initializeCourts,
    setClubs, setClubMembers,
    togglePlayerPaid, completeMatch, deletePlayer, addCourt, deleteCourt, startMatch, resetMatchTimer, setConnectionMode
  } = useAppStore();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // Inline player add form state
  const [addMode, setAddMode] = useState<'single' | 'bulk'>('single');
  const [playerInput, setPlayerInput] = useState('');
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  
  // Custom navigation tabs
  const [activeTab, setActiveTab] = useState<'courts' | 'players' | 'stats' | 'finance' | 'rankings' | 'clubs' | 'settings'>('courts');
  const [is3DViewCollapsed, setIs3DViewCollapsed] = useState(false);
  const [isRosterCollapsed, setIsRosterCollapsed] = useState(false);

  // Animation refs
  const headerRef = useRef<HTMLDivElement>(null);
  const courtGridRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLElement>(null);

  // GSAP entrance animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      if (headerRef.current) {
        gsap.fromTo(headerRef.current,
          { y: -20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' }
        );
      }
      if (courtGridRef.current) {
        const cards = courtGridRef.current.querySelectorAll('.court-card');
        gsap.fromTo(cards,
          { y: 30, opacity: 0, scale: 0.95 },
          { y: 0, opacity: 1, scale: 1, duration: 0.5, stagger: 0.06, ease: 'power2.out', delay: 0.3 }
        );
      }
      if (footerRef.current) {
        gsap.fromTo(footerRef.current,
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out', delay: 0.6 }
        );
      }
    });
    return () => ctx.revert();
  }, [dataLoaded]);

  // Re-animate court cards when courts change
  useEffect(() => {
    if (courtGridRef.current && dataLoaded) {
      const cards = courtGridRef.current.querySelectorAll('.court-card');
      gsap.fromTo(cards,
        { y: 20, opacity: 0, scale: 0.95 },
        { y: 0, opacity: 1, scale: 1, duration: 0.4, stagger: 0.05, ease: 'power2.out' }
      );
    }
  }, [courts.length, dataLoaded]);

  // Match completion state
  const [completingMatchId, setCompletingMatchId] = useState<string | null>(null);
  const [scoreA, setScoreA] = useState('21');
  const [scoreB, setScoreB] = useState('19');
  const [shuttlesUsed, setShuttlesUsed] = useState('1');
  const [quickDeclare, setQuickDeclare] = useState(false);
  const [declareWinner, setDeclareWinner] = useState<'A' | 'B' | null>(null);

  // Notification toast state
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Player detail popup
  const [detailPlayer, setDetailPlayer] = useState<Player | null>(null);

  // Roster search & filter
  const [rosterSearch, setRosterSearch] = useState('');
  const [rosterTierFilter, setRosterTierFilter] = useState<SkillTier | 'ALL'>('ALL');

  const filteredPlayers = players
    .filter((p) => {
      const matchName = p.name.toLowerCase().includes(rosterSearch.toLowerCase());
      const matchTier = rosterTierFilter === 'ALL' || p.tier === rosterTierFilter;
      return matchName && matchTier;
    })
    .sort((a, b) => (a.waitingSince || a.joinedAt) - (b.waitingSince || b.joinedAt));
  const waitingRoster = filteredPlayers.filter(player => player.status === 'waiting');

  const isQM = userProfile?.role === 'QUEUE_MASTER';

  const handleAutoMatch = async () => {
    if (!user || !isQM) return;
    const waiting = players.filter(p => p.status === 'waiting');
    if (waiting.length < 4) {
      showToast('Auto Match', 'Need at least 4 waiting players.');
      return;
    }
    const match = generateOptimalMatch(players);
    if (!match || match.length < 4) return;
    const targetCourt = [...courts].sort((a, b) => a.queue.length - b.queue.length)[0];
    if (!targetCourt) {
      showToast('Auto Match', 'Add a court before queuing a match.');
      return;
    }

    // Smart check: warn if this pairing played together recently
    const recentPairs = new Set<string>();
    for (const m of matches) {
      if (m.status === 'Completed' && m.startTime && Date.now() - m.startTime < 30 * 60 * 1000) {
        const pairA = [m.teamA[0], m.teamA[1]].sort().join(':');
        const pairB = [m.teamB[0], m.teamB[1]].sort().join(':');
        recentPairs.add(pairA);
        recentPairs.add(pairB);
      }
    }
    const newPairA = [match[0].id, match[1].id].sort().join(':');
    const newPairB = [match[2].id, match[3].id].sort().join(':');
    const repeatA = recentPairs.has(newPairA);
    const repeatB = recentPairs.has(newPairB);

    if (repeatA || repeatB) {
      const names = [
        repeatA ? `${match[0].name} & ${match[1].name}` : '',
        repeatB ? `${match[2].name} & ${match[3].name}` : '',
      ].filter(Boolean).join(' and ');
      if (!window.confirm(`⚠️ ${names} played together recently. Still match them?`)) return;
    }

    await useAppStore.getState().addMatch(user.uid, {
      courtId: targetCourt.id,
      teamA: [match[0].id, match[1].id],
      teamB: [match[2].id, match[3].id],
    });
    showToast('Match Queued', `${match[0].name} & ${match[1].name} vs ${match[2].name} & ${match[3].name}`, 6000);
  };

  const showToast = (title: string, body: string, duration = 4000) => {
    const toast = createToast({ title, body, icon: '/icon-192x192.png', click_action: '/' });
    setToasts(prev => [...prev, toast]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== toast.id)), duration);
  };

  const handleAddPlayerFromInput = async () => {
    if (!user || !userProfile || !playerInput.trim()) return;
    if (addMode === 'single') {
      const parsed = parsePlayerInput(playerInput.trim());
      if (parsed) {
        await useAppStore.getState().addPlayer(user.uid, { name: parsed.name, tier: parsed.tier });
        setPlayerInput('');
      }
    } else {
      const lines = playerInput.split('\n').map(l => l.trim()).filter(Boolean);
      for (const line of lines) {
        const parsed = parsePlayerInput(line);
        if (parsed) {
          await useAppStore.getState().addPlayer(user.uid, { name: parsed.name, tier: parsed.tier });
        }
      }
      setPlayerInput('');
    }
  };

  const parsePlayerInput = (input: string): { name: string; tier: SkillTier } | null => {
    const dashMatch = input.match(/^(.+?)\s*[-–]\s*(\d+)$/);
    if (dashMatch) {
      const name = dashMatch[1].trim();
      const num = dashMatch[2];
      const tier = getTierFromShortcut(num);
      if (tier && name.length > 0) return { name, tier };
    }
    // Try just the number at the end
    const numMatch = input.match(/^(.+?)\s+(\d+)$/);
    if (numMatch) {
      const name = numMatch[1].trim();
      const tier = getTierFromShortcut(numMatch[2]);
      if (tier && name.length > 0) return { name, tier };
    }
    // Fallback: use name with default tier
    if (input.length > 0) return { name: input, tier: 'BEG' };
    return null;
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'a' || e.key === 'A') { if (isQM) document.getElementById('player-input')?.focus(); }
      if (e.key === 'm' || e.key === 'M') { if (isQM) handleAutoMatch(); }
      if (e.key >= '1' && e.key <= '9') {
        const activeOnCourt = matches.find(m => m.status === 'Active');
        if (activeOnCourt && isQM) {
          setCompletingMatchId(activeOnCourt.id);
          setScoreA('21'); setScoreB('19'); setShuttlesUsed('1');
          setQuickDeclare(false); setDeclareWinner(null);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isQM, matches, handleAutoMatch]);

  // Loading state for async operations
  const [pendingOps, setPendingOps] = useState<Set<string>>(new Set());
  const runOp = async (name: string, fn: () => Promise<any>) => {
    setPendingOps((prev) => new Set(prev).add(name));
    try { await fn(); } finally { setPendingOps((prev) => { const next = new Set(prev); next.delete(name); return next; }); }
  };
  const isPending = (name: string) => pendingOps.has(name);

  // Setup Firebase Cloud Messaging listener
  useEffect(() => {
    const unsubscribe = setupMessageListener((payload) => {
      const toast = createToast(payload);
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, 6000);
    });
    return unsubscribe;
  }, []);

  // Set status to DISCONNECTED on tab close
  useEffect(() => {
    const handleBeforeUnload = () => {
      const qm = localStorage.getItem('rallyup_joined_qm');
      const pid = userProfile?.id;
      if (qm && pid) {
        navigator.sendBeacon(
          '/api/playerStatus',
          JSON.stringify({ qmUserId: qm, playerId: pid, status: 'DISCONNECTED' })
        );
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [userProfile]);

  // Auto-join from URL ?join=XXXXXX
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get('join');
    if (joinCode && !localStorage.getItem('rallyup_joined_qm')) {
      firestoreService.getSessionMapping(joinCode).then((result) => {
        if (result) {
          setJoinedQmUserId(result.qmUserId);
          localStorage.setItem('rallyup_joined_qm', result.qmUserId);
          localStorage.setItem('rallyup_joined_code', joinCode);
          if (result.matchSessionId) {
            localStorage.setItem('rallyup_current_session_id', result.matchSessionId);
            setCurrentSessionId(result.matchSessionId);
            // Auto-register player in QM's roster
            if (userProfile) {
              firestoreService.autoRegisterPlayer(
                result.qmUserId, userProfile.id,
                userProfile.name || 'Player',
                userProfile.skillTier || 'BEG',
                result.matchSessionId
              );
            }
          }
          window.history.replaceState({}, '', window.location.pathname);
        }
      });
    }
  }, []);

  // Session modal
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showSessionChoice, setShowSessionChoice] = useState(false);

  // Connection management for player role
  const [joinedQmUserId, setJoinedQmUserId] = useState<string | null>(() => {
    return localStorage.getItem('rallyup_joined_qm');
  });

  const handleSessionJoined = (qmUserId: string, matchSessionId?: string) => {
    setJoinedQmUserId(qmUserId);
    localStorage.setItem('rallyup_joined_qm', qmUserId);
    if (matchSessionId) setCurrentSessionId(matchSessionId);
    setActiveTab('courts');
  };

  const handleSessionLeft = () => {
    const qmUserId = localStorage.getItem('rallyup_joined_qm');
    if (userProfile && qmUserId) {
      removePlayerFcmToken(qmUserId, userProfile.id);
    }
    setJoinedQmUserId(null);
    localStorage.removeItem('rallyup_joined_qm');
    localStorage.removeItem('rallyup_joined_code');
    localStorage.removeItem('rallyup_current_session_id');
    localStorage.removeItem('rallyup_is_temporary');
    setCurrentSessionId('');
    setPlayers([]);
    setCourts([]);
    setMatches([]);
  };

  useEffect(() => {
    if (!user || !userProfile) return;
    
    // Determine whose data we should subscribe to
    // If the user is a PLAYER and connected to a QM's session, subscribe to QM's collection
    const targetUserId = (userProfile.role === 'PLAYER' && joinedQmUserId) 
      ? joinedQmUserId 
      : user.uid;

    const local = readWorkspace(targetUserId);
    setPlayers(local.players);
    setCourts(local.courts);
    setMatches(local.matches);
    if (local.financialConfig) setFinancialConfig(local.financialConfig);

    if (connectionMode === 'offline') {
      if (local.courts.length === 0 && userProfile.role === 'QUEUE_MASTER') initializeCourts(user.uid);
      setDataLoaded(true);
      return;
    }

    // Online mode is local-first: publish the last local workspace before accepting remote snapshots.
    void Promise.all([
      ...local.players.map(player => firestoreService.savePlayer(targetUserId, player)),
      ...local.courts.map(court => firestoreService.saveCourt(targetUserId, court)),
      ...local.matches.map(match => firestoreService.saveMatch(targetUserId, match)),
      ...(local.financialConfig ? [firestoreService.saveFinancialConfig(targetUserId, local.financialConfig)] : []),
    ]);

    let isInitialLoad = true;
    let preferLocalPlayers = local.players.length > 0;
    let preferLocalCourts = local.courts.length > 0;
    let preferLocalMatches = local.matches.length > 0;
    
    const unsubCourts = firestoreService.subscribeToCourts(targetUserId, (courtsData) => {
      if (preferLocalCourts) { preferLocalCourts = false; return; }
      if (courtsData.length === 0 && isInitialLoad && userProfile.role === 'QUEUE_MASTER') {
        initializeCourts(user.uid);
      } else {
        setCourts(courtsData);
        writeWorkspacePart(targetUserId, 'courts', courtsData);
      }
    });
    
    const sessionFilter = currentSessionId || undefined;
    const unsubPlayers = firestoreService.subscribeToPlayers(targetUserId, (playersData) => {
      if (preferLocalPlayers) { preferLocalPlayers = false; return; }
      setPlayers(playersData);
      writeWorkspacePart(targetUserId, 'players', playersData);
    }, sessionFilter);

    const unsubMatches = firestoreService.subscribeToMatches(targetUserId, (matchesData) => {
      if (preferLocalMatches) { preferLocalMatches = false; return; }
      setMatches(matchesData);
      writeWorkspacePart(targetUserId, 'matches', matchesData);
    }, sessionFilter);

    const unsubConfig = firestoreService.subscribeToFinancialConfig(targetUserId, (configData) => {
      if (configData) { setFinancialConfig(configData); writeWorkspacePart(targetUserId, 'financialConfig', configData); }
    });

    // Club subscriptions
    const unsubClubs: (() => void)[] = [];
    const clubIds = userProfile.clubIds || [];
    const clubData: any[] = [];
    const memberData: any[] = [];

    clubIds.forEach((clubId) => {
      const unsubClub = firestoreService.subscribeToClub(clubId, (club) => {
        if (club) {
          const idx = clubData.findIndex(c => c.id === club.id);
          if (idx >= 0) clubData[idx] = club;
          else clubData.push(club);
        }
        setClubs([...clubData]);
      });
      unsubClubs.push(unsubClub);

      const unsubMembers = firestoreService.subscribeToClubMembers(clubId, (members) => {
        const otherMembers = memberData.filter(m => m.clubId !== clubId);
        const updated = [...otherMembers, ...members.map(m => ({ ...m, clubId }))];
        memberData.length = 0;
        memberData.push(...updated);
        setClubMembers([...memberData]);
      });
      unsubClubs.push(unsubMembers);
    });

    const timer = setTimeout(() => {
      isInitialLoad = false;
      setDataLoaded(true);
    }, 1000);

    return () => {
      unsubPlayers();
      unsubCourts();
      unsubMatches();
      unsubConfig();
      unsubClubs.forEach(u => u());
      clearTimeout(timer);
    };
  }, [user, userProfile, joinedQmUserId, currentSessionId, connectionMode, setPlayers, setCourts, setMatches, setFinancialConfig, setClubs, setClubMembers, setDataLoaded, initializeCourts]);

  // Show session choice modal for QMs without an active session
  useEffect(() => {
    if (dataLoaded && isQM && !currentSessionId && !localStorage.getItem('rallyup_is_temporary')) {
      setShowSessionChoice(true);
    }
  }, [dataLoaded, isQM, currentSessionId]);

  const handleStartSessionChoice = async () => {
    setShowSessionChoice(false);
    setShowSessionModal(true);
  };

  const handleTemporarySessionChoice = () => {
    localStorage.setItem('rallyup_is_temporary', 'true');
    setShowSessionChoice(false);
  };

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
  const queuedMatches = matches.filter(m => m.status === 'Waiting');

  return (
    <div className="fixed inset-0 bg-slate-950 text-slate-100 font-sans flex flex-col overflow-hidden">
      
      {/* Sign-out loading overlay */}
      <AnimatePresence>
        {isPending('signout') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center"
          >
            <div className="w-16 h-16 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.15)] relative">
              <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
              <div className="absolute inset-0 border-2 border-red-500/20 rounded-2xl animate-pulse"></div>
            </div>
            <div className="flex flex-col items-center gap-1 mt-6">
              <h2 className="text-lg font-black italic uppercase tracking-widest text-white">Signing Out</h2>
              <p className="text-xs font-mono text-slate-500">Cleaning up session...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 10-Second Welcome Modal */}
      <WelcomeModal />

      {/* Complete Match Modal */}
      <AnimatePresence>
        {completingMatchId && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl flex flex-col gap-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black uppercase tracking-tight text-white">Match Result</h3>
                <button onClick={() => setCompletingMatchId(null)} className="text-slate-500 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Toggle between Score Entry and Quick Declaration */}
              <button
                onClick={() => { setQuickDeclare(!quickDeclare); setDeclareWinner(null); }}
                className="w-full py-2.5 px-4 bg-slate-950 border border-slate-700 rounded-xl text-[10px] font-bold uppercase tracking-wider text-slate-300 hover:text-white hover:border-emerald-500/50 transition-all text-center"
              >
                {quickDeclare
                  ? 'Switch to Score Entry'
                  : 'Click here to skip scores'}
              </button>

              {quickDeclare ? (
                /* Quick Declaration Mode */
                <div className="flex flex-col gap-4">
                  {/* Info Note */}
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                    <p className="text-[10px] font-medium text-amber-300/90 leading-relaxed">
                      Quick declaration mode. Pick a winner without entering scores — recorded under Match Declarations, not Rankings. Use Switch to Score Entry to make this match count.
                    </p>
                  </div>

                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Select Winner</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setDeclareWinner('A')}
                      className={`flex-1 h-14 rounded-2xl border text-xs font-black uppercase tracking-wider transition-all ${
                        declareWinner === 'A'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      Team A
                    </button>
                    <button
                      onClick={() => setDeclareWinner('B')}
                      className={`flex-1 h-14 rounded-2xl border text-xs font-black uppercase tracking-wider transition-all ${
                        declareWinner === 'B'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      Team B
                    </button>
                  </div>
                </div>
              ) : (
                /* Score Entry Mode */
                <div className="flex flex-col gap-4">
                  <div className="flex gap-4">
                    <div className="flex-1 flex flex-col gap-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Team A Score</label>
                      <input
                        type="number"
                        value={scoreA}
                        onChange={(e) => setScoreA(e.target.value)}
                        className="w-full h-14 bg-slate-950 border border-slate-800 text-white text-xl font-black text-center rounded-2xl outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="flex-1 flex flex-col gap-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Team B Score</label>
                      <input
                        type="number"
                        value={scoreB}
                        onChange={(e) => setScoreB(e.target.value)}
                        className="w-full h-14 bg-slate-950 border border-slate-800 text-white text-xl font-black text-center rounded-2xl outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Shuttles Used</label>
                    <input
                      type="number"
                      value={shuttlesUsed}
                      onChange={(e) => setShuttlesUsed(e.target.value)}
                      className="w-full h-12 bg-slate-950 border border-slate-800 text-white text-sm font-bold rounded-xl px-4 outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  if (!user || !completingMatchId) return;
                  runOp('completeMatch', async () => {
                    if (quickDeclare) {
                      // Quick declaration: winner gets 21, loser gets 19
                      const win = declareWinner === 'A'
                        ? { a: 21, b: 19 }
                        : { a: 19, b: 21 };
                      await completeMatch(user.uid, completingMatchId, win.a, win.b, 1);
                    } else {
                      await completeMatch(
                        user.uid,
                        completingMatchId,
                        parseInt(scoreA) || 0,
                        parseInt(scoreB) || 0,
                        parseInt(shuttlesUsed) || 1
                      );
                    }
                    setCompletingMatchId(null);
                  });
                }}
                className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                disabled={isPending('completeMatch') || (quickDeclare && !declareWinner)}
              >
                {isPending('completeMatch') ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {quickDeclare ? 'Declare Winner' : 'Confirm Match End'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Top Navigation / Status Bar */}
      <header ref={headerRef} className="h-16 flex items-center justify-between px-4 md:px-8 bg-slate-900/50 border-b border-slate-800 backdrop-blur-md z-20 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors lg:hidden">
            <Menu className="w-6 h-6" />
          </button>
          <div className="w-10 h-10 bg-red-500 flex items-center justify-center rounded-xl shadow-[0_0_20px_rgba(239,68,68,0.25)]">
            <svg className="w-6 h-6 text-[#ffffff]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </div>
          <h1 className="text-xl md:text-2xl font-black tracking-tighter uppercase italic text-white flex items-center gap-2">
            RallyUp
            <span className="hidden sm:inline-block text-[9px] font-black uppercase tracking-widest bg-slate-850 text-slate-400 border border-slate-800 px-2.5 py-0.5 rounded">PH</span>
            {currentSessionId && (
              <span className="text-[8px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                Session
              </span>
            )}
          </h1>
        </div>

        {/* Header navigation tabs (Desktop Only) */}
        <div className="hidden lg:flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-2xl border border-slate-850">
          <button
            onClick={() => setActiveTab('courts')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'courts' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            {isQM ? 'Courts & Queues' : 'Dashboard'}
          </button>
          
          {isQM && (
            <button
              onClick={() => setActiveTab('players')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'players' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              Roster
            </button>
          )}

          {isQM && (
            <button
              onClick={() => setActiveTab('finance')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'finance' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Coins className="w-4 h-4" />
              Finance
            </button>
          )}

          <button
            onClick={() => setActiveTab('clubs')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'clubs' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            Clubs
          </button>

          <button
            onClick={() => setActiveTab('rankings')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'rankings' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Trophy className="w-4 h-4" />
            Rankings
          </button>

          {isQM && (
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'stats' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-4 h-4" />
              History
            </button>
          )}
        </div>

        {/* Right header buttons */}
        <div className="flex items-center gap-3">
          {isQM && (
            <button
              onClick={() => setConnectionMode(connectionMode === 'online' ? 'offline' : 'online')}
              className={`h-9 px-3 rounded-xl border text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${connectionMode === 'online' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'}`}
              title="Switch data connection mode"
            >
              {connectionMode === 'online' ? <Monitor className="w-3.5 h-3.5" /> : <MonitorOff className="w-3.5 h-3.5" />}
              {connectionMode}
            </button>
          )}
          {isQM && (
            <div className="relative group">
              <button
                onClick={() => setShowSessionModal(true)}
                className={`flex items-center justify-center w-9 h-9 rounded-xl border transition-colors ${
                  currentSessionId
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title={currentSessionId ? 'View Session' : 'Start New Session'}
              >
                {currentSessionId ? <Monitor className="w-4.5 h-4.5" /> : <MonitorOff className="w-4.5 h-4.5" />}
              </button>
              <div className="absolute top-full right-0 mt-1.5 bg-slate-900 border border-slate-800 rounded-xl p-2 shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                <span className="text-[10px] font-bold text-slate-400">
                  {currentSessionId
                    ? 'View session details'
                    : localStorage.getItem('rallyup_is_temporary')
                      ? 'Temporary session — start a real session?'
                      : 'Start new session'}
                </span>
              </div>
            </div>
          )}

          {/* Shortcuts help */}
          <div className="relative group">
            <button className="flex items-center justify-center w-9 h-9 rounded-xl border bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
              <span className="text-xs font-black">⌘</span>
            </button>
            <div className="absolute top-full right-0 mt-1.5 bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 w-56">
              <div className="space-y-1.5">
                {[
                  { keys: 'A', label: 'Focus add player' },
                  { keys: 'M', label: 'Auto match' },
                  { keys: '1–9', label: 'Quick score (match active)' },
                  { keys: '1–9', label: 'Tier shortcut (in name input)' },
                ].map(item => (
                  <div key={item.keys} className="flex items-center justify-between gap-3">
                    <kbd className="text-[9px] font-bold text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded">{item.keys}</kbd>
                    <span className="text-[10px] text-slate-400">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <ThemeToggle />
          
          <button 
            onClick={() => runOp('notif', async () => {
              if (!userProfile) return;
              if ('Notification' in window && Notification.permission !== 'granted') {
                const granted = await requestNotificationPermission(userProfile.id);
                if (granted) {
                  const toast = createToast({ title: 'RallyUp', body: 'Notifications enabled!', icon: '/icon-192x192.png', click_action: '/' });
                  setToasts((prev) => [...prev, toast]);
                  setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== toast.id)), 4000);
                }
              } else if ('Notification' in window && Notification.permission === 'granted') {
                const toast = createToast({ title: 'RallyUp', body: 'You are already receiving notifications.', icon: '/icon-192x192.png', click_action: '/' });
                setToasts((prev) => [...prev, toast]);
                setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== toast.id)), 4000);
              }
            })}
            className={`flex items-center justify-center w-9 h-9 rounded-xl border transition-colors bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800`}
            title="Notifications"
            disabled={isPending('notif')}
          >
            {isPending('notif') ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4.5 h-4.5" />}
          </button>
          
          <button 
            onClick={() => setActiveTab('settings')}
            className={`flex items-center justify-center w-9 h-9 rounded-xl border transition-colors ${
              activeTab === 'settings' 
                ? 'bg-slate-800 text-white border-slate-700' 
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="System Settings"
          >
            <Settings className="w-4.5 h-4.5" />
          </button>
          
          <button 
            onClick={() => runOp('signout', async () => { await logout(); })}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 hover:border-red-500/20 transition-colors"
            title="Sign Out"
            disabled={isPending('signout')}
          >
            {isPending('signout') ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4.5 h-4.5" />}
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden relative">
        
        {/* Left Mobile Menu Drawer */}
        <AnimatePresence>
          {isSidebarOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSidebarOpen(false)}
                className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-30 lg:hidden"
              />
              <motion.aside 
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed top-0 bottom-0 left-0 w-72 bg-slate-900 border-r border-slate-800 z-40 p-6 flex flex-col gap-6"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black uppercase tracking-widest text-slate-400">RallyUp Menu</span>
                  <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex flex-col gap-2 mt-4">
                  <button
                    onClick={() => { setActiveTab('courts'); setIsSidebarOpen(false); }}
                    className={`h-12 rounded-xl text-left px-4 font-bold text-sm flex items-center gap-3 transition-colors ${
                      activeTab === 'courts' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-850/50 hover:text-white'
                    }`}
                  >
                    <LayoutGrid className="w-5 h-5" />
                    {isQM ? 'Courts & Queues' : 'Dashboard'}
                  </button>
                  
                  {isQM && (
                    <button
                      onClick={() => { setActiveTab('players'); setIsSidebarOpen(false); }}
                      className={`h-12 rounded-xl text-left px-4 font-bold text-sm flex items-center gap-3 transition-colors ${
                        activeTab === 'players' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-850/50 hover:text-white'
                      }`}
                    >
                      <Users className="w-5 h-5" />
                      Roster
                    </button>
                  )}

                  {isQM && (
                    <button
                      onClick={() => { setActiveTab('finance'); setIsSidebarOpen(false); }}
                      className={`h-12 rounded-xl text-left px-4 font-bold text-sm flex items-center gap-3 transition-colors ${
                        activeTab === 'finance' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-850/50 hover:text-white'
                      }`}
                    >
                      <Coins className="w-5 h-5" />
                      Finance
                    </button>
                  )}

                  <button
                    onClick={() => { setActiveTab('clubs'); setIsSidebarOpen(false); }}
                    className={`h-12 rounded-xl text-left px-4 font-bold text-sm flex items-center gap-3 transition-colors ${
                      activeTab === 'clubs' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-850/50 hover:text-white'
                    }`}
                  >
                    <Users className="w-5 h-5" />
                    Clubs
                  </button>

                  <button
                    onClick={() => { setActiveTab('rankings'); setIsSidebarOpen(false); }}
                    className={`h-12 rounded-xl text-left px-4 font-bold text-sm flex items-center gap-3 transition-colors ${
                      activeTab === 'rankings' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-850/50 hover:text-white'
                    }`}
                  >
                    <Trophy className="w-5 h-5" />
                    Rankings
                  </button>

                  {isQM && (
                    <button
                      onClick={() => { setActiveTab('stats'); setIsSidebarOpen(false); }}
                      className={`h-12 rounded-xl text-left px-4 font-bold text-sm flex items-center gap-3 transition-colors ${
                        activeTab === 'stats' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-850/50 hover:text-white'
                      }`}
                    >
                      <Activity className="w-5 h-5" />
                      History
                    </button>
                  )}

                  <button
                    onClick={() => { setActiveTab('settings'); setIsSidebarOpen(false); }}
                    className={`h-12 rounded-xl text-left px-4 font-bold text-sm flex items-center gap-3 transition-colors ${
                      activeTab === 'settings' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-850/50 hover:text-white'
                    }`}
                  >
                    <Settings className="w-5 h-5" />
                    Settings
                  </button>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* ----------------- CORE VIEWS DISPATCHER ----------------- */}

        {/* 1. COURTS & QUEUES / PLAYER OVERVIEW TAB */}
        {activeTab === 'courts' && (
          isQM ? (
            <CompactPipeline
              onAddPlayer={() => setShowAddPlayer(true)}
              onEditPlayer={setDetailPlayer}
              onAutoQueue={handleAutoMatch}
              onFinish={(matchId) => {
                setCompletingMatchId(matchId);
                setScoreA('21'); setScoreB('19'); setShuttlesUsed('1');
                setQuickDeclare(false); setDeclareWinner(null);
              }}
              onDeclareWin={(matchId, winner) => {
                setCompletingMatchId(matchId);
                setScoreA('21'); setScoreB('19'); setShuttlesUsed('1');
                setQuickDeclare(true); setDeclareWinner(winner);
              }}
            />
          ) : false ? (
            /* QUEUE MASTER MAIN VIEW (ORIGINAL WITH COURT ALLOCATOR & LIVE ROSTER SIDEBAR) */
            <div className="flex-1 flex overflow-hidden w-full">
              
              {/* QM Sidebar: Player Queue */}
              <AnimatePresence initial={false}>
                {!isRosterCollapsed && (
                  <motion.aside 
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 320, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="hidden lg:flex border-r border-slate-800 bg-slate-950/80 backdrop-blur-md flex-col p-6 shrink-0 h-full overflow-hidden"
                  >
                    <div className="flex items-center justify-between mb-4 w-full">
                      <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 whitespace-nowrap">Roster ({players.length})</h2>
                      <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-500 font-bold px-2 py-0.5 rounded-md uppercase whitespace-nowrap">Queue</span>
                    </div>
                    
                    {/* Inline Add Player Form */}
                    <div className="mb-4 w-full space-y-2">
                      <div className="flex items-center gap-1.5 bg-slate-900 rounded-lg p-0.5 border border-slate-800">
                        <button
                          onClick={() => setAddMode('single')}
                          className={`flex-1 py-1.5 rounded text-[9px] font-bold uppercase tracking-wider transition-colors ${addMode === 'single' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-white'}`}
                        >Single</button>
                        <button
                          onClick={() => setAddMode('bulk')}
                          className={`flex-1 py-1.5 rounded text-[9px] font-bold uppercase tracking-wider transition-colors ${addMode === 'bulk' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-white'}`}
                        >Bulk</button>
                      </div>

                      {addMode === 'single' ? (
                        <div className="flex gap-2">
                          <input
                            id="player-input"
                            type="text"
                            value={playerInput}
                            onChange={(e) => setPlayerInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddPlayerFromInput(); } }}
                            placeholder="Name - 1"
                            className="flex-1 h-10 bg-slate-950 border border-slate-800 text-white text-xs font-bold rounded-xl px-3 outline-none focus:border-emerald-500 placeholder:text-slate-600"
                          />
                          <button
                            onClick={handleAddPlayerFromInput}
                            className="h-10 w-10 bg-emerald-500 text-[#ffffff] rounded-xl flex items-center justify-center hover:bg-emerald-400 transition-colors shrink-0"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <textarea
                            value={playerInput}
                            onChange={(e) => setPlayerInput(e.target.value)}
                            placeholder="Juan - 1&#10;Maria - 3&#10;Pedro - 5"
                            rows={3}
                            className="w-full bg-slate-950 border border-slate-800 text-white text-xs font-bold rounded-xl p-3 outline-none focus:border-emerald-500 placeholder:text-slate-600 resize-none"
                          />
                          <button
                            onClick={handleAddPlayerFromInput}
                            className="h-10 bg-emerald-500 text-[#ffffff] rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-emerald-400 transition-colors flex items-center justify-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add All
                          </button>
                        </div>
                      )}
                      <p className="text-[8px] text-slate-600 font-bold uppercase tracking-wider px-1">Format: Name - Number (1-9)</p>
                    </div>

                    {/* Roster search & filter */}
                    <div className="mb-3 w-full">
                      <input
                        type="text"
                        placeholder="Search players..."
                        value={rosterSearch}
                        onChange={(e) => setRosterSearch(e.target.value)}
                        className="w-full h-9 bg-slate-950 border border-slate-800 text-white text-xs rounded-xl px-3 outline-none focus:border-red-500/50 placeholder:text-slate-600"
                      />
                      <div className="flex gap-1 mt-1.5">
                        {(['ALL', 'BEG', 'ADV_BEG', 'LOW_INT', 'INT', 'MID_INT', 'UP_INT', 'ADV', 'EXP', 'PRO'] as const).map((t) => (
                          <button
                            key={t}
                            onClick={() => setRosterTierFilter(t as SkillTier | 'ALL')}
                            className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider transition-colors ${
                              rosterTierFilter === t ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'text-slate-500 bg-slate-950/50 border border-slate-800 hover:text-white'
                            }`}
                          >
                            {t === 'ALL' ? 'All' : t}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 w-full">
                      {waitingRoster.map((player, index) => (
                        <div key={`${player.id}-${index}`} 
                          draggable
                          onDragStart={(e) => { e.dataTransfer.setData('text/plain', player.id); e.dataTransfer.effectAllowed = 'move'; }}
                          className={`p-3 border rounded-xl flex items-center justify-between group transition-colors cursor-pointer ${
                          player.status === 'resting' ? 'bg-slate-900/40 border-slate-850 opacity-60' : 'bg-slate-900 border-slate-800'
                        }`} onClick={() => setDetailPlayer(player)}>
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-full border border-slate-700 flex items-center justify-center text-xs font-bold shrink-0 ${
                              player.status === 'waiting' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                              player.status === 'resting' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                              'bg-slate-800 text-slate-300'
                            }`}>
                              {player.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="overflow-hidden">
                              <div className="text-xs font-bold text-slate-200 truncate">{player.name}</div>
                              <div className="text-[9px] text-slate-500 uppercase tracking-wide truncate">
                                {player.tier} • <span className="text-slate-600 font-mono">{formatWaitTime(player.waitingSince || player.joinedAt)}</span> • <span className={
                                  player.status === 'waiting' ? 'text-emerald-400 font-bold' :
                                  player.status === 'resting' ? 'text-amber-400' :
                                  player.status === 'active' ? 'text-blue-400' :
                                  player.status === 'timeout' ? 'text-slate-600' :
                                  'text-slate-500'
                                }>{player.status}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                if (user) runOp(`paid-${player.id}`, () => togglePlayerPaid(user.uid, player.id));
                              }}
                              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors border ${
                                player.hasPaid ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10' : 'border-slate-800 text-slate-600 hover:text-white'
                              }`}
                              title={player.hasPaid ? 'Paid' : 'Unpaid'}
                              disabled={isPending(`paid-${player.id}`)}
                            >
                              {isPending(`paid-${player.id}`) ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            </button>
                            <button onClick={(e) => {
                              e.stopPropagation();
                              if (user) runOp(`del-${player.id}`, () => deletePlayer(user.uid, player.id));
                            }} className="text-slate-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 p-1.5 transition-all" disabled={isPending(`del-${player.id}`)}>
                              {isPending(`del-${player.id}`) ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3.5 h-3.5"/>}
                            </button>
                          </div>
                        </div>
                      ))}
                      {players.length === 0 && (
                        <div className="text-center text-slate-600 text-xs mt-10 whitespace-nowrap">
                          Roster is empty.
                        </div>
                      )}
                    </div>
                  </motion.aside>
                )}
              </AnimatePresence>

              {/* Roster Toggle Button */}
              <div className="hidden lg:flex flex-col border-r border-slate-800 bg-slate-950/50 items-center justify-center">
                <button 
                  onClick={() => setIsRosterCollapsed(!isRosterCollapsed)}
                  className="h-16 px-1 flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-900 transition-colors rounded-l-md"
                >
                  {isRosterCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>
              </div>

              {/* Main courts center panel */}
              <section className="flex-1 bg-slate-950 relative overflow-hidden flex flex-col h-full">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(239,68,68,0.03),transparent_70%)] z-0 pointer-events-none"></div>
                
                {/* 3D Monitor Collapsible Header and Scene */}
                <div className="w-full relative z-10 border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-sm shadow shrink-0 flex flex-col">
                  <div 
                    onClick={() => setIs3DViewCollapsed(!is3DViewCollapsed)}
                    className="flex items-center justify-between px-4 md:px-6 py-3 bg-slate-900/10 hover:bg-slate-900/20 cursor-pointer select-none transition-colors border-b border-slate-800/10"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${is3DViewCollapsed ? 'bg-slate-500' : 'bg-red-500 animate-pulse'}`}></div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-200">3D Interactive Court View</span>
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest hidden sm:inline">
                          ({courts.filter(c => c.status !== 'Available').length} Occupied / {courts.length} Courts)
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIs3DViewCollapsed(!is3DViewCollapsed);
                        }}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 border border-slate-800 hover:border-red-500/30 hover:bg-red-500/10 text-[9px] font-bold uppercase tracking-wider text-slate-400 hover:text-red-400 rounded-lg transition-all"
                      >
                        {is3DViewCollapsed ? (
                          <>
                            <Monitor className="w-3 h-3" />
                            <span>Show 3D</span>
                          </>
                        ) : (
                          <>
                            <MonitorOff className="w-3 h-3" />
                            <span>Hide 3D</span>
                          </>
                        )}
                      </button>
                      {is3DViewCollapsed ? (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      ) : (
                        <ChevronUp className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                  </div>
                  
                  <AnimatePresence initial={false}>
                    {!is3DViewCollapsed && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
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
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="relative z-10 px-4 md:px-6 py-3 border-b border-slate-800 bg-slate-900/40 flex items-center gap-3 overflow-x-auto shrink-0">
                  <div className="shrink-0">
                    <div className="text-[10px] font-black uppercase tracking-widest text-amber-400">Match Queue ({queuedMatches.length})</div>
                    <div className="text-[9px] text-slate-500">Reserved players are removed from the waiting roster</div>
                  </div>
                  {queuedMatches.map((match, index) => {
                    const court = courts.find(item => item.id === match.courtId);
                    const names = [...match.teamA, ...match.teamB].map(id => players.find(player => player.id === id)?.name || 'Unknown');
                    return <div key={match.id} className="shrink-0 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 min-w-52">
                      <div className="text-[9px] font-bold text-slate-500 uppercase">#{index + 1} · {court?.name || 'Court'}</div>
                      <div className="text-[10px] font-bold text-slate-200 truncate">{names.join(' · ')}</div>
                    </div>;
                  })}
                  {queuedMatches.length === 0 && <span className="text-xs text-slate-600 italic">No matches queued.</span>}
                </div>

                {/* Grid of Courts for QM */}
                  <div ref={courtGridRef} className="flex-1 overflow-y-auto p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 relative z-10 pb-24">
                    {courts.map((court, index) => {
                      const activeMatch = matches.find(m => m.id === court.activeMatchId);
                      const canStartMatch = court.status === 'Available' && court.queue.some(matchId => matches.some(match => match.id === matchId && match.status === 'Waiting'));
                      const elapsed = activeMatch?.startTime ? Math.floor((Date.now() - activeMatch.startTime) / 60000) : 0;
                      return (
                        <div 
                          key={`${court.id}-${index}`} 
                          className="court-card bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col justify-between h-56 relative group hover:border-slate-700 transition-all"
                        >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase tracking-wider text-slate-400">{court.name}</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] px-2.5 py-0.5 rounded font-black uppercase ${
                              court.status === 'Available' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                            }`}>
                              {court.status === 'Available' ? 'Vacant' : 'Occupied'}
                            </span>
                            {activeMatch && (
                              <span className="text-[9px] font-mono text-slate-500 bg-slate-950/50 px-1.5 py-0.5 rounded">
                                {elapsed < 60 ? `${elapsed}m` : `${Math.floor(elapsed / 60)}h${elapsed % 60}m`}
                              </span>
                            )}
                            {court.queue.length > 0 && (
                              <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                                Q{court.queue.length}
                              </span>
                            )}
                            {isQM && court.status === 'Available' && (
                              <button onClick={() => { if (user) runOp(`delcourt-${court.id}`, () => deleteCourt(user.uid, court.id)); }} className="text-slate-500 hover:text-red-500 hover:bg-red-500/10 transition-colors p-1 rounded-md" disabled={isPending(`delcourt-${court.id}`)}>
                                {isPending(`delcourt-${court.id}`) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-4 h-4" />}
                              </button>
                            )}
                          </div>
                        </div>

                        {activeMatch ? (
                          <div className="my-2 flex flex-col gap-2">
                            <div className="flex items-center justify-between bg-slate-950/40 p-3 rounded-2xl border border-slate-850">
                              <div className="flex flex-col text-left">
                                <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider">Team A</span>
                                <span className="text-xs font-bold text-slate-200 truncate max-w-[100px]">
                                  {activeMatch.teamA.map(pId => players.find(p => p.id === pId)?.name || 'Empty').join(' / ')}
                                </span>
                              </div>
                              <span className="text-[10px] text-red-500 font-black italic">VS</span>
                              <div className="flex flex-col text-right">
                                <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider">Team B</span>
                                <span className="text-xs font-bold text-slate-200 truncate max-w-[100px]">
                                  {activeMatch.teamB.map(pId => players.find(p => p.id === pId)?.name || 'Empty').join(' / ')}
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="my-2 text-center py-3 border border-dashed border-slate-800 rounded-2xl">
                            <span className="text-slate-600 text-xs font-bold">No active match</span>
                          </div>
                        )}
                        {court.queue.length > 0 && (
                          <div className="text-[9px] text-amber-400 bg-amber-500/5 rounded-xl px-2.5 py-1.5 flex flex-wrap gap-1 items-center">
                            <span className="font-bold uppercase tracking-wider text-[8px]">Queue:</span>
                            {court.queue.map((matchId) => {
                              const queued = matches.find(match => match.id === matchId);
                              return queued ? (
                                <span key={matchId} className="bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded font-bold text-[8px]">
                                  {[...queued.teamA, ...queued.teamB].map(id => players.find(player => player.id === id)?.name).filter(Boolean).join(' · ')}
                                </span>
                              ) : null;
                            })}
                          </div>
                        )}

                        <div className="flex gap-2">
                          {activeMatch ? (
                            isQM ? (
                              <>
                                <button
                                  onClick={() => {
                                    if (user) {
                                      setCompletingMatchId(activeMatch.id);
                                      setScoreA('21');
                                      setScoreB('19');
                                      setShuttlesUsed('1');
                                      setQuickDeclare(false);
                                      setDeclareWinner(null);
                                    }
                                  }}
                                  className="flex-1 h-10 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold text-xs uppercase tracking-wider rounded-xl border border-emerald-500/15"
                                >
                                  Complete Match
                                </button>
                                <button
                                  onClick={() => {
                                    if (!user) return;
                                    runOp(`reset-${activeMatch.id}`, () => resetMatchTimer(user.uid, activeMatch.id));
                                  }}
                                  className="h-10 w-10 bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold rounded-xl border border-slate-700 flex items-center justify-center"
                                  title="Reset timer"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <div className="flex-1 h-10 bg-emerald-500/10 text-emerald-500 font-bold text-xs uppercase tracking-wider rounded-xl border border-emerald-500/15 flex items-center justify-center">
                                Match in Progress
                              </div>
                            )
                          ) : (
                            <button
                              onClick={() => { if (user) runOp(`start-${court.id}`, () => startMatch(user.uid, court.id)); }}
                              disabled={!canStartMatch}
                              title={canStartMatch ? 'Start the next queued match' : 'Queue a match for this court first'}
                              className="flex-1 h-10 bg-emerald-500 hover:bg-emerald-400 text-[#ffffff] font-bold text-xs uppercase tracking-wider rounded-xl border border-emerald-400/30 transition-all disabled:bg-slate-800 disabled:text-slate-600 disabled:border-slate-700 disabled:cursor-not-allowed disabled:hover:bg-slate-800"
                            >
                              Start Match
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Add Court Button Card */}
                  {isQM && (
                    <button 
                      onClick={() => { if (user) runOp('addcourt', () => addCourt(user.uid, `Court ${courts.length + 1}`)); }}
                      className="bg-slate-900/50 border border-dashed border-slate-700 hover:border-slate-500 rounded-3xl p-5 flex flex-col items-center justify-center h-56 transition-all text-slate-500 hover:text-slate-300 group"
                      disabled={isPending('addcourt')}
                    >
                      {isPending('addcourt') ? <Loader2 className="w-8 h-8 mb-2 animate-spin" /> : <Plus className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />}
                      <span className="text-xs font-bold uppercase tracking-wider">Add Court</span>
                    </button>
                  )}
                </div>

                {/* Queue creation actions */}
                {isQM && (
                  <div className="absolute bottom-6 right-6 flex gap-2 z-50">
                    <button onClick={handleAutoMatch} className="h-14 bg-red-500 hover:bg-red-600 text-white font-black rounded-2xl text-xs uppercase tracking-widest px-6 shadow-xl shadow-red-500/20 active:scale-95 flex items-center gap-2 border border-red-400/50">
                      <Sparkles className="w-5 h-5" /> Auto Queue
                    </button>
                  </div>
                )}
              </section>

            </div>
          ) : (
            /* PLAYER PERSONAL LIVE STATS & COURTS VIEWER */
            <PlayerDashboard 
              joinedQmUserId={joinedQmUserId} 
              onNavigateToSettings={() => setActiveTab('settings')} 
            />
          )
        )}

        {/* 2. PLAYERS / ROSTER TAB */}
        {activeTab === 'players' && isQM && (
          <section className="flex-1 bg-slate-950 relative overflow-y-auto p-4 md:p-8 custom-scrollbar">
            <div className="max-w-6xl mx-auto space-y-6 pb-20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter text-white">Roster Database</h2>
                  <p className="text-sm text-slate-400 mt-1">Manage and audit court member lists and stats.</p>
                </div>
                <button
                  onClick={() => setShowAddPlayer(true)}
                  className="h-12 bg-violet-600 hover:bg-violet-500 text-white font-black rounded-xl text-xs uppercase tracking-widest px-6 transition-all"
                >
                  + Add Player
                </button>
              </div>

              {/* Roster search */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search by name..."
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  className="flex-1 h-10 bg-slate-900 border border-slate-800 text-white text-xs rounded-xl px-4 outline-none focus:border-red-500/50 placeholder:text-slate-600"
                />
                <select
                  value={rosterTierFilter}
                  onChange={(e) => setRosterTierFilter(e.target.value as SkillTier | 'ALL')}
                  className="h-10 bg-slate-900 border border-slate-800 text-white text-xs rounded-xl px-3 outline-none focus:border-red-500/50 cursor-pointer"
                >
                  <option value="ALL">All Tiers</option>
                  <option value="BEGINNER">Beginner</option>
                  <option value="LOW_INTERMEDIATE">Low Inter</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                </select>
              </div>

              {/* Roster profiles table / cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredPlayers.map((player, index) => (
                  <div key={`${player.id}-${index}`} 
                    draggable
                    onDragStart={(e) => { e.dataTransfer.setData('text/plain', player.id); e.dataTransfer.effectAllowed = 'move'; }}
                    className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col justify-between group cursor-pointer" onClick={() => setDetailPlayer(player)}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-black uppercase text-slate-300">
                          {player.name.substring(0,2)}
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-sm flex items-center gap-2">
                            {player.name}
                            <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                              player.status === 'waiting' ? 'bg-emerald-500/10 text-emerald-400' :
                              player.status === 'resting' ? 'bg-amber-500/10 text-amber-400' :
                              player.status === 'active' ? 'bg-blue-500/10 text-blue-400' :
                              player.status === 'timeout' ? 'bg-slate-800 text-slate-500' :
                              'bg-slate-800 text-slate-400'
                            }`}>{player.status}</span>
                          </h4>
                          <span className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">{player.tier?.replace('_', ' ')}</span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (user) runOp(`del-${player.id}`, () => deletePlayer(user.uid, player.id));
                        }}
                        className="text-slate-600 hover:text-red-500 p-1 bg-slate-950 border border-slate-850 rounded-lg"
                        disabled={isPending(`del-${player.id}`)}
                      >
                        {isPending(`del-${player.id}`) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2 border-t border-slate-850 pt-3">
                      <div className="flex flex-col">
                        <span className="text-[9px] text-slate-500 uppercase font-bold">PTS</span>
                        <span className="text-xs font-bold text-white font-mono">{player.ratingScore}</span>
                      </div>
                      <div className="flex flex-col text-center">
                        <span className="text-[9px] text-slate-500 uppercase font-bold">Games</span>
                        <span className="text-xs font-bold text-white font-mono">{player.stats?.gamesPlayed || 0}</span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-[9px] text-slate-500 uppercase font-bold">Win/Loss</span>
                        <span className="text-xs font-bold text-emerald-400 font-mono">{player.stats?.wins || 0} - {player.stats?.losses || 0}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 3. FINANCE & BILLING TAB */}
        {activeTab === 'finance' && isQM && (
          <FinancePage />
        )}

        {/* 4. CLUBS PAGE */}
        {activeTab === 'clubs' && (
          <section className="flex-1 bg-slate-950 relative overflow-y-auto p-4 md:p-8 custom-scrollbar">
            <ClubDashboard />
          </section>
        )}

        {/* 5. RANKINGS PAGE (LOCAL & GLOBAL LEADERBOARDS) */}
        {activeTab === 'rankings' && (
          <LocalGlobalRankings />
        )}

        {/* 5. HISTORY & STATS TAB */}
        {activeTab === 'stats' && isQM && (
          <section className="flex-1 bg-slate-950 relative overflow-y-auto p-4 md:p-8 custom-scrollbar">
            <div className="max-w-6xl mx-auto space-y-8 pb-20">
              <div>
                <h2 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter text-white">Analytics & History</h2>
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
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 border-b border-slate-800/80 pb-2">Match History</h3>
                {matches.filter(m => m.status === 'Completed').reverse().map((match, index) => (
                  <div key={`${match.id}-${index}`} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest">{new Date(match.startTime || Date.now()).toLocaleString()}</span>
                      <span className="text-xs font-bold text-white">Court {match.id.substring(0, 4)}</span>
                    </div>
                    
                    <div className="flex items-center gap-4 md:gap-8 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                      <div className="flex flex-col items-end gap-1 min-w-[120px]">
                        {match.teamA?.map((id, index) => (
                          <span key={`${id}-${index}`} className="text-xs text-slate-300 font-medium truncate max-w-[150px]">{players.find(p => p.id === id)?.name || 'Unknown'}</span>
                        ))}
                      </div>
                      
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-2xl font-black ${(match.scoreA || 0) > (match.scoreB || 0) ? 'text-emerald-400' : 'text-slate-500'}`}>{match.scoreA || 0}</span>
                        <span className="text-slate-600 font-bold">-</span>
                        <span className={`text-2xl font-black ${(match.scoreB || 0) > (match.scoreA || 0) ? 'text-emerald-400' : 'text-slate-500'}`}>{match.scoreB || 0}</span>
                      </div>

                      <div className="flex flex-col items-start gap-1 min-w-[120px]">
                        {match.teamB?.map((id, index) => (
                          <span key={`${id}-${index}`} className="text-xs text-slate-300 font-medium truncate max-w-[150px]">{players.find(p => p.id === id)?.name || 'Unknown'}</span>
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

        {/* 6. SETTINGS TAB */}
        {activeTab === 'settings' && (
          <SettingsPage 
            joinedQmUserId={joinedQmUserId} 
            onSessionJoined={handleSessionJoined} 
            onSessionLeft={handleSessionLeft} 
          />
        )}

      </main>

      {/* Footer System Status Bar (Desktop & Mobile status indicator) */}
      <footer ref={footerRef} className="bg-slate-900 border-t border-slate-800 shrink-0 z-30 flex flex-col">
        <div className="h-10 md:h-12 flex items-center px-4 md:px-8 text-[10px] text-slate-500 justify-between">
          <div className="flex gap-4 md:gap-6 items-center uppercase tracking-widest font-bold">
            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Cloud Synced</span>
            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-teal-500"></div> {players.length} Players Active</span>
          </div>
          <div className="font-mono text-slate-400 uppercase">
            {matches.filter(m => m.status === 'Completed').length} Matches Completed
          </div>
        </div>
      </footer>
      
      <NotificationToast toasts={toasts} onDismiss={dismissToast} />
      <PlayerInfoModal isOpen={!!detailPlayer} player={detailPlayer} players={players} matches={matches} onClose={() => setDetailPlayer(null)} />
      <AddPlayerModal isOpen={showAddPlayer} onClose={() => setShowAddPlayer(false)} />
      <SessionModal
        isOpen={showSessionModal}
        onClose={() => setShowSessionModal(false)}
        user={user}
        currentSessionId={currentSessionId}
        setCurrentSessionId={setCurrentSessionId}
      />
      <SessionChoiceModal
        isOpen={showSessionChoice}
        onStartSession={handleStartSessionChoice}
        onTemporarySession={handleTemporarySessionChoice}
      />
    </div>
  );
}
