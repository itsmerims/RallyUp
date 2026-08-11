import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { useAuth } from '../contexts/AuthContext';
import * as firestoreService from '../services/firestore';
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
  Activity, Menu, X, Loader2, LogOut,
  Monitor, MonitorOff, Coins, Bell,
  MoreHorizontal, Share2, Copy, QrCode, Pencil
} from 'lucide-react';
import { SkillTier } from '../types';
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
import { readWorkspace, writeWorkspacePart, isCollectionHydrated, markCollectionHydrated } from '../services/localData';

export default function Dashboard() {
  const { user, userProfile, logout } = useAuth();
  const { 
    players, courts, matches, clubs, clubMembers,
    isLoading, dataLoaded, currentSessionId, connectionMode,
    setPlayers, setCourts, setMatches, setFinancialConfig, setDataLoaded, setCurrentSessionId, initializeCourts,
    setClubs, setClubMembers,
    togglePlayerPaid, completeMatch, deletePlayer, addCourt, deleteCourt, startMatch, updatePlayer, setConnectionMode
  } = useAppStore();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [showLiveShare, setShowLiveShare] = useState(false);
  const [liveLinkCopied, setLiveLinkCopied] = useState(false);
  // Inline player add form state
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  
  // Custom navigation tabs
  const [activeTab, setActiveTab] = useState<'courts' | 'players' | 'stats' | 'finance' | 'rankings' | 'clubs' | 'settings'>('courts');

  // Animation refs
  const headerRef = useRef<HTMLDivElement>(null);
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
      if (footerRef.current) {
        gsap.fromTo(footerRef.current,
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out', delay: 0.6 }
        );
      }
    });
    return () => ctx.revert();
  }, [dataLoaded]);

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
  const [detailPlayerId, setDetailPlayerId] = useState<string | null>(null);

  // Roster search & filter
  const [rosterSearch, setRosterSearch] = useState('');
  const [rosterTierFilter, setRosterTierFilter] = useState<SkillTier | 'ALL'>('ALL');
  const [rosterSelected, setRosterSelected] = useState<Set<string>>(new Set());
  const [rosterConfirm, setRosterConfirm] = useState<{ title: string; detail: string; onConfirm: () => void } | null>(null);

  const toggleRosterSelect = (id: string) => {
    setRosterSelected(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const filteredPlayers = players
    .filter((p) => {
      const matchName = p.name.toLowerCase().includes(rosterSearch.toLowerCase());
      const matchTier = rosterTierFilter === 'ALL' || p.tier === rosterTierFilter;
      return matchName && matchTier;
    })
    .sort((a, b) => (a.waitingSince || a.joinedAt) - (b.waitingSince || b.joinedAt));

  const isQM = userProfile?.role === 'QUEUE_MASTER';

  const handleAutoMatch = async () => {
    if (!user || !isQM) return;
    let draftedIds = new Set<string>();
    try {
      const drafts = JSON.parse(localStorage.getItem('rallyup_draft_queues') || '[]') as Array<{ teamA?: Array<string | null>; teamB?: Array<string | null> }>;
      draftedIds = new Set(drafts.flatMap(draft => [...(draft.teamA || []), ...(draft.teamB || [])].filter((id): id is string => Boolean(id))));
    } catch { /* Ignore malformed local draft data. */ }
    const waiting = players.filter(p => p.status === 'waiting' && !draftedIds.has(p.id));
    if (waiting.length < 4) {
      showToast('Auto Match', 'Need at least 4 waiting players.');
      return;
    }
    const match = generateOptimalMatch(waiting, matches);
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

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'a' || e.key === 'A') { if (isQM) setShowAddPlayer(true); }
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

    // Local storage is the source of truth. Always hydrate the store from the
    // local workspace first so the UI is instant and works like offline mode.
    const local = readWorkspace(targetUserId);
    setPlayers(local.players);
    setCourts(local.courts);
    setMatches(local.matches);
    if (local.financialConfig) setFinancialConfig(local.financialConfig);

    // Data the signed-in user owns is local-first; data viewed from a QM's
    // session (player role) is remote-first because that workspace is not ours.
    const ownsData = targetUserId === user.uid;

    if (connectionMode === 'offline') {
      if (ownsData && userProfile.role === 'QUEUE_MASTER' && local.courts.length === 0) initializeCourts(user.uid);
      setDataLoaded(true);
      return;
    }

    // Online: publish the local workspace to Firestore (non-blocking) so other
    // viewers and the public live feed stay current. Local changes always win.
    void Promise.all([
      ...local.players.map(player => firestoreService.savePlayer(targetUserId, player)),
      ...local.courts.map(court => firestoreService.saveCourt(targetUserId, court)),
      ...local.matches.map(match => firestoreService.saveMatch(targetUserId, match)),
      ...(local.financialConfig ? [firestoreService.saveFinancialConfig(targetUserId, local.financialConfig)] : []),
    ]).catch(() => {});

    const hydrated = {
      players: isCollectionHydrated(targetUserId, 'players'),
      courts: isCollectionHydrated(targetUserId, 'courts'),
      matches: isCollectionHydrated(targetUserId, 'matches'),
      financialConfig: isCollectionHydrated(targetUserId, 'financialConfig'),
    };

    const adoptRemote = (collection: 'players' | 'courts' | 'matches', data: any[], apply: (data: any[]) => void): boolean => {
      if (!ownsData) {
        apply(data);
        writeWorkspacePart(targetUserId, collection, data);
        return false;
      }
      if (local[collection].length === 0 && !hydrated[collection]) {
        apply(data);
        writeWorkspacePart(targetUserId, collection, data);
        markCollectionHydrated(targetUserId, collection);
        hydrated[collection] = true;
        return true;
      }
      return false;
    };
    
    const unsubCourts = firestoreService.subscribeToCourts(targetUserId, (courtsData) => {
      const adopted = adoptRemote('courts', courtsData, setCourts);
      if (ownsData && userProfile.role === 'QUEUE_MASTER' && useAppStore.getState().courts.length === 0 && adopted) {
        initializeCourts(user.uid);
      }
    });
    
    const sessionFilter = currentSessionId || undefined;
    const unsubPlayers = firestoreService.subscribeToPlayers(targetUserId, (playersData) => {
      adoptRemote('players', playersData, setPlayers);
    }, sessionFilter);

    const unsubMatches = firestoreService.subscribeToMatches(targetUserId, (matchesData) => {
      adoptRemote('matches', matchesData, setMatches);
    }, sessionFilter);

    const unsubConfig = firestoreService.subscribeToFinancialConfig(targetUserId, (configData) => {
      if (!ownsData && configData) {
        setFinancialConfig(configData);
        writeWorkspacePart(targetUserId, 'financialConfig', configData);
        return;
      }
      if (ownsData && configData && !local.financialConfig && !hydrated.financialConfig) {
        setFinancialConfig(configData);
        writeWorkspacePart(targetUserId, 'financialConfig', configData);
        markCollectionHydrated(targetUserId, 'financialConfig');
        hydrated.financialConfig = true;
      }
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

    setDataLoaded(true);

    return () => {
      unsubPlayers();
      unsubCourts();
      unsubMatches();
      unsubConfig();
      unsubClubs.forEach(u => u());
    };
  }, [user, userProfile, joinedQmUserId, currentSessionId, connectionMode, setPlayers, setCourts, setMatches, setFinancialConfig, setClubs, setClubMembers, setDataLoaded, initializeCourts]);

  // Keep the public read-only feed current even when the QM prefers the local-first
  // workspace. Firestore queues these writes and publishes them after reconnection.
  useEffect(() => {
    if (!user || !isQM || !currentSessionId || connectionMode !== 'offline') return;
    const publishTimer = window.setTimeout(() => {
      void Promise.all([
        ...players.map(player => firestoreService.savePlayer(user.uid, { ...player, sessionId: currentSessionId })),
        ...courts.map(court => firestoreService.saveCourt(user.uid, court)),
        ...matches.map(match => firestoreService.saveMatch(user.uid, { ...match, sessionId: currentSessionId })),
      ]).catch(() => {});
    }, 250);
    return () => window.clearTimeout(publishTimer);
  }, [user, isQM, currentSessionId, connectionMode, players, courts, matches]);

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
  const publicSessionCode = user ? localStorage.getItem(`rallyup_session_${user.uid}`) || '' : '';
  const liveViewUrl = publicSessionCode ? `${window.location.origin}/live?session=${publicSessionCode}` : '';

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

      <AnimatePresence>
        {showLiveShare && <div className="fixed inset-0 z-[210] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm" onMouseDown={event => { if (event.target === event.currentTarget) setShowLiveShare(false); }}>
          <motion.div initial={{ opacity: 0, scale: .95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: .95 }} className="w-full max-w-sm rounded-3xl border border-slate-700 bg-slate-900 p-6 text-center shadow-2xl">
            <div className="mb-4 flex items-center justify-between text-left"><div><h3 className="text-lg font-black uppercase text-white">Share Live View</h3><p className="mt-1 text-[10px] text-slate-500">Public, read-only realtime dashboard</p></div><button onClick={() => setShowLiveShare(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-800 hover:text-white"><X className="h-4 w-4" /></button></div>
            {liveViewUrl ? <><div className="mx-auto w-fit rounded-2xl bg-white p-3"><img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(liveViewUrl)}`} alt="Live session QR code" className="h-44 w-44" /></div><p className="mt-3 break-all rounded-xl bg-slate-950 p-3 text-[9px] text-slate-400">{liveViewUrl}</p><div className="mt-3 grid grid-cols-2 gap-2"><button onClick={() => { void navigator.clipboard.writeText(liveViewUrl); setLiveLinkCopied(true); setTimeout(() => setLiveLinkCopied(false), 1800); }} className="flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-500 text-[10px] font-black uppercase text-slate-950"><Copy className="h-4 w-4" />{liveLinkCopied ? 'Copied' : 'Copy Link'}</button><button onClick={() => window.open(liveViewUrl, '_blank', 'noopener,noreferrer')} className="flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 text-[10px] font-black uppercase text-white"><Share2 className="h-4 w-4" />Open View</button></div></> : <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5"><p className="text-xs font-bold text-amber-300">Start a session and generate a Session Code first.</p><button onClick={() => { setShowLiveShare(false); setShowSessionModal(true); }} className="mt-4 h-10 rounded-xl bg-amber-500 px-5 text-[10px] font-black uppercase text-slate-950">Create Session Code</button></div>}
          </motion.div>
        </div>}
      </AnimatePresence>

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
                      // Quick declaration: winner gets 21, loser gets 19. Skips rankings/ratings.
                      const win = declareWinner === 'A'
                        ? { a: 21, b: 19 }
                        : { a: 19, b: 21 };
                      await completeMatch(user.uid, completingMatchId, win.a, win.b, 1, false);
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
      <header ref={headerRef} className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-slate-800 bg-slate-900/50 px-2 backdrop-blur-md sm:px-4 md:px-8 z-20">
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors lg:hidden">
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.25)] sm:h-10 sm:w-10">
            <svg className="w-6 h-6 text-[#ffffff]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </div>
          <h1 className="flex min-w-0 items-center gap-2 text-base font-black uppercase italic tracking-tighter text-white sm:text-xl md:text-2xl">
            <span className="hidden min-[360px]:inline">RallyUp</span>
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
        <div className="flex items-center gap-2">
          {isQM && <button onClick={() => setShowLiveShare(true)} className="flex h-9 items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 text-[10px] font-black uppercase tracking-wider text-emerald-300 transition hover:bg-emerald-500/20"><Share2 className="h-4 w-4" /><span className="hidden sm:inline">Live View</span></button>}
          <div className="relative">
            <button onClick={() => setIsActionMenuOpen(open => !open)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-400 transition hover:bg-slate-800 hover:text-white" aria-label="Open actions menu"><MoreHorizontal className="h-5 w-5" /></button>
            {isActionMenuOpen && <><button aria-label="Close actions menu" onClick={() => setIsActionMenuOpen(false)} className="fixed inset-0 z-40 cursor-default" /><div className="fixed left-2 right-2 top-[4.25rem] z-50 overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 p-2 shadow-2xl sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-64">
              {isQM && <button onClick={() => setConnectionMode(connectionMode === 'online' ? 'offline' : 'online')} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-slate-300 hover:bg-slate-800">{connectionMode === 'online' ? <Monitor className="h-4 w-4 text-emerald-400" /> : <MonitorOff className="h-4 w-4 text-amber-400" />}Connection: {connectionMode}</button>}
              {isQM && <button onClick={() => { setShowSessionModal(true); setIsActionMenuOpen(false); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-slate-300 hover:bg-slate-800"><QrCode className="h-4 w-4 text-indigo-400" />Session Code</button>}
              <button onClick={() => { setIsActionMenuOpen(false); void runOp('notif', async () => { if (userProfile && 'Notification' in window && Notification.permission !== 'granted') await requestNotificationPermission(userProfile.id); }); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-slate-300 hover:bg-slate-800"><Bell className="h-4 w-4 text-amber-400" />Notifications</button>
              <button onClick={() => { setActiveTab('settings'); setIsActionMenuOpen(false); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-slate-300 hover:bg-slate-800"><Settings className="h-4 w-4 text-slate-400" />Settings</button>
              <div className="my-1 border-t border-slate-800" />
              <div className="flex items-center justify-between rounded-xl px-3 py-2"><span className="text-xs font-bold text-slate-400">Theme</span><ThemeToggle /></div>
              <button onClick={() => runOp('signout', async () => { await logout(); })} disabled={isPending('signout')} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-red-300 hover:bg-red-500/10">{isPending('signout') ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}Sign Out</button>
            </div></>}
          </div>
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
              onEditPlayer={setDetailPlayerId}
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
              onNotify={(title, body) => showToast(title, body)}
            />
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
                  {(['BEG','ADV_BEG','LOW_INT','INT','MID_INT','UP_INT','ADV','EXP','PRO'] as SkillTier[]).map(skillTier => (
                    <option key={skillTier} value={skillTier}>{skillTier.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>

              {rosterSelected.size > 0 && (
                <div className="flex flex-wrap items-center gap-2 bg-violet-500/10 border border-violet-500/30 rounded-2xl p-3">
                  <span className="text-[11px] font-bold text-violet-300 uppercase tracking-wider mr-1">{rosterSelected.size} selected</span>
                  <button onClick={() => runOp('bulkRest', async () => { const ids = [...rosterSelected]; ids.forEach(id => useAppStore.getState().updatePlayerStatus(user!.uid, id, 'resting')); setRosterSelected(new Set()); })} disabled={!user} className="h-8 px-3 rounded-lg bg-amber-500/15 text-amber-300 text-[10px] font-bold uppercase hover:bg-amber-500/25 transition disabled:opacity-40">Rest</button>
                  <button onClick={() => runOp('bulkWaiting', async () => { const ids = [...rosterSelected]; ids.forEach(id => useAppStore.getState().updatePlayerStatus(user!.uid, id, 'waiting')); setRosterSelected(new Set()); })} disabled={!user} className="h-8 px-3 rounded-lg bg-emerald-500/15 text-emerald-300 text-[10px] font-bold uppercase hover:bg-emerald-500/25 transition disabled:opacity-40">Set Waiting</button>
                  <button onClick={() => runOp('bulkPaid', async () => { const ids = [...rosterSelected]; ids.forEach(id => useAppStore.getState().togglePlayerPaid(user!.uid, id)); setRosterSelected(new Set()); })} disabled={!user} className="h-8 px-3 rounded-lg bg-teal-500/15 text-teal-300 text-[10px] font-bold uppercase hover:bg-teal-500/25 transition disabled:opacity-40">Mark Paid</button>
                  <button onClick={() => rosterSelected.size > 0 && setRosterConfirm({ title: 'Delete players', detail: `Delete ${rosterSelected.size} selected player(s)? This cannot be undone.`, onConfirm: () => runOp('bulkDelete', async () => { const ids = [...rosterSelected]; ids.forEach(id => useAppStore.getState().deletePlayer(user!.uid, id)); setRosterSelected(new Set()); }) })} disabled={!user} className="h-8 px-3 rounded-lg bg-red-500/15 text-red-300 text-[10px] font-bold uppercase hover:bg-red-500/25 transition disabled:opacity-40">Delete</button>
                  <button onClick={() => setRosterSelected(new Set())} className="h-8 px-3 rounded-lg bg-slate-800 text-slate-300 text-[10px] font-bold uppercase hover:bg-slate-700 transition">Clear</button>
                </div>
              )}

              {/* Roster profiles table / cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredPlayers.map((player, index) => (
                  <div key={`${player.id}-${index}`} 
                    className={`bg-slate-900 border rounded-3xl p-5 flex flex-col justify-between group cursor-pointer transition-colors ${rosterSelected.has(player.id) ? 'border-violet-500/50' : 'border-slate-800'}`} onClick={() => setDetailPlayerId(player.id)}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={rosterSelected.has(player.id)}
                          onChange={() => toggleRosterSelect(player.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 accent-violet-500 cursor-pointer shrink-0"
                        />
                        <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-black uppercase text-slate-300">
                          {player.name.substring(0,2)}
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-sm flex items-center gap-2">
                            {player.name}
                            <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                              player.status === 'waiting' ? 'bg-emerald-500/10 text-emerald-400' :
                              player.status === 'reserved' ? 'bg-violet-500/10 text-violet-400' :
                              player.status === 'resting' ? 'bg-amber-500/10 text-amber-400' :
                              player.status === 'active' ? 'bg-blue-500/10 text-blue-400' :
                              player.status === 'timeout' ? 'bg-slate-800 text-slate-500' :
                              'bg-slate-800 text-slate-400'
                            }`}>{player.status}</span>
                            {player.hasPaid && <span className="text-[8px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold uppercase tracking-wider">Paid</span>}
                          </h4>
                          <span className="text-[10px] text-slate-500 uppercase tracking-wide font-medium">{player.tier?.replace('_', ' ')}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (user) runOp(`paid-${player.id}`, () => togglePlayerPaid(user.uid, player.id));
                          }}
                          className={`p-1.5 rounded-lg border ${player.hasPaid ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400' : 'border-slate-800 text-slate-600 hover:text-white'}`}
                          title={player.hasPaid ? 'Mark unpaid' : 'Mark paid'}
                          disabled={isPending(`paid-${player.id}`)}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDetailPlayerId(player.id); }}
                          className="text-slate-600 hover:text-indigo-400 p-1.5 bg-slate-950 border border-slate-850 rounded-lg"
                          title="Edit player"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRosterConfirm({ title: 'Delete player', detail: `Delete ${player.name} from this session? This cannot be undone.`, onConfirm: () => runOp(`del-${player.id}`, async () => { await deletePlayer(user!.uid, player.id); setRosterSelected(current => { const next = new Set(current); next.delete(player.id); return next; }); }) });
                          }}
                          className="text-slate-600 hover:text-red-500 p-1.5 bg-slate-950 border border-slate-850 rounded-lg"
                          title="Delete player"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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
              {filteredPlayers.length === 0 && <p className="text-center text-xs text-slate-600 py-12">No players match your search.</p>}
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
      {rosterConfirm && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) setRosterConfirm(null); }}>
          <div className="w-full max-w-sm rounded-3xl border border-slate-700 bg-slate-900 p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-black uppercase text-white">{rosterConfirm.title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">{rosterConfirm.detail}</p>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setRosterConfirm(null)} className="flex-1 h-10 rounded-xl border border-slate-800 text-slate-400 text-xs font-bold uppercase tracking-wider transition hover:bg-slate-800 hover:text-white">Cancel</button>
              <button onClick={() => { rosterConfirm.onConfirm(); setRosterConfirm(null); }} className="flex-1 h-10 rounded-xl bg-red-500 text-white text-xs font-black uppercase tracking-wider transition hover:bg-red-400">Confirm</button>
            </div>
          </div>
        </div>
      )}
      <PlayerInfoModal isOpen={!!detailPlayerId} playerId={detailPlayerId} players={players} matches={matches} onSave={(playerId, updates) => user ? updatePlayer(user.uid, playerId, updates).then(() => showToast('Player Updated', 'Changes saved to the roster.')) : Promise.resolve()} onClose={() => setDetailPlayerId(null)} />
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
