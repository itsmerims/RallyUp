import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAppStore } from '../store';
import * as firestoreService from '../services/firestore';
import { Settings, Shield, User, Globe, MapPin, Save, Plus, Trash2, Key, HelpCircle, Check, Loader2, RefreshCw, Info, ChevronDown, MoreVertical, Link, Copy, QrCode, Monitor, MonitorOff } from 'lucide-react';
import { SkillTier } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface SettingsPageProps {
  onSessionJoined?: (qmUserId: string, matchSessionId?: string) => void;
  joinedQmUserId: string | null;
  onSessionLeft?: () => void;
}

export default function SettingsPage({ onSessionJoined, joinedQmUserId, onSessionLeft }: SettingsPageProps) {
  const { user, userProfile, updateProfile, logout } = useAuth();
  const { courts, addCourt, deleteCourt, currentSessionId, setCurrentSessionId } = useAppStore();

  // Collapsible States
  const [openSections, setOpenSections] = useState({
    profile: true,
    sessionHosting: true,
    courtsConfig: true,
    connectSession: true,
    resetData: false,
    others: false,
    dangerZone: false
  });

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Profile Form States
  const [name, setName] = useState(userProfile?.name || '');
  const [skillTier, setSkillTier] = useState<SkillTier>(userProfile?.skillTier || 'BEGINNER');
  const [country, setCountry] = useState(userProfile?.country || 'Philippines');
  const [role, setRole] = useState<'PLAYER' | 'QUEUE_MASTER'>(userProfile?.role || 'PLAYER');
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Court Input
  const [newCourtName, setNewCourtName] = useState('');

  // QM Session ID State
  const [sessionId, setSessionId] = useState<string>('');
  const [isSessionActive, setIsSessionActive] = useState<boolean>(false);
  const [sessionGenerating, setSessionGenerating] = useState<boolean>(false);

  // Player Joining Code States
  const [joiningCode, setJoiningCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState('');

  // Reset / Delete states
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Share session
  const [copySuccess, setCopySuccess] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const countries = [
    'Philippines', 'United States', 'Singapore', 'Malaysia', 'Indonesia', 
    'Japan', 'Canada', 'United Kingdom', 'Australia', 'India', 'Thailand'
  ];

  // Initialize values
  useEffect(() => {
    if (userProfile) {
      setName(userProfile.name || '');
      setSkillTier(userProfile.skillTier || 'BEGINNER');
      setCountry(userProfile.country || 'Philippines');
      setRole(userProfile.role || 'PLAYER');
    }
  }, [userProfile]);

  // Load QM active Session ID
  useEffect(() => {
    if (user && userProfile?.role === 'QUEUE_MASTER') {
      const savedCode = localStorage.getItem(`rallyup_session_${user.uid}`);
      if (savedCode) {
        setSessionId(savedCode);
        setIsSessionActive(true);
      }
    }
  }, [user, userProfile]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    setSaveSuccess(false);
    try {
      const roleChanged = role !== userProfile?.role;
      await updateProfile({
        name,
        skillTier,
        country,
        role,
      });
      setSaveSuccess(true);
      if (roleChanged) {
        await new Promise(resolve => setTimeout(resolve, 500));
        window.dispatchEvent(new CustomEvent('rallyup:reload'));
      }
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleAddCourt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourtName.trim() || !user) return;
    addCourt(user.uid, newCourtName.trim());
    setNewCourtName('');
  };

  // Generate a random 6-digit active Session ID for QM
  const generateSession = async () => {
    if (!user) return;
    setSessionGenerating(true);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    try {
      // Auto-start a match session for per-session match isolation
      const matchSessionId = currentSessionId || 'sess_' + Math.random().toString(36).substring(2, 10);
      if (!currentSessionId) setCurrentSessionId(matchSessionId);
      await firestoreService.saveSessionMapping(code, user.uid, true, matchSessionId);
      localStorage.setItem(`rallyup_session_${user.uid}`, code);
      setSessionId(code);
      setIsSessionActive(true);
    } catch (err) {
      console.error(err);
    } finally {
      setSessionGenerating(false);
    }
  };

  const deactivateSession = async () => {
    if (!user || !sessionId) return;
    setSessionGenerating(true);
    try {
      await firestoreService.saveSessionMapping(sessionId, user.uid, false);
      localStorage.removeItem(`rallyup_session_${user.uid}`);
      // Also end the match session
      localStorage.removeItem('rallyup_current_session_id');
      setCurrentSessionId('');
      setSessionId('');
      setIsSessionActive(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSessionGenerating(false);
    }
  };

  // Player connecting to host
  const handleJoinSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError('');
    if (joiningCode.trim().length !== 6) {
      setJoinError('Please enter a valid 6-digit session code.');
      return;
    }
    setJoinLoading(true);
    try {
      const result = await firestoreService.getSessionMapping(joiningCode.trim());
      if (result) {
        localStorage.setItem('rallyup_joined_qm', result.qmUserId);
        localStorage.setItem('rallyup_joined_code', joiningCode.trim());
        if (result.matchSessionId) {
          localStorage.setItem('rallyup_current_session_id', result.matchSessionId);
        }
        if (onSessionJoined) {
          onSessionJoined(result.qmUserId, result.matchSessionId);
        }
      } else {
        setJoinError('Active Session ID not found or expired.');
      }
    } catch (err) {
      setJoinError('Failed to connect. Please try again.');
    } finally {
      setJoinLoading(false);
    }
  };

  const isQM = userProfile?.role === 'QUEUE_MASTER';

  const handleResetAll = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      await Promise.all([
        firestoreService.deleteAllMatches(user.uid),
        firestoreService.deleteAllPlayers(user.uid),
        firestoreService.deleteAllCourts(user.uid),
      ]);
      setConfirmAction(null);
      window.location.reload();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetMatches = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      await firestoreService.deleteAllMatches(user.uid);
      setConfirmAction(null);
      window.location.reload();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      await Promise.all([
        firestoreService.deleteAllMatches(user.uid),
        firestoreService.deleteAllPlayers(user.uid),
        firestoreService.deleteAllCourts(user.uid),
        firestoreService.deleteUserProfile(user.uid),
      ]);
      setConfirmAction(null);
      await logout();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-slate-950 p-4 md:p-8 overflow-y-auto relative flex flex-col h-full font-sans text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.05),transparent_70%)] z-0 pointer-events-none" />

      <div className="relative z-10 max-w-5xl w-full mx-auto flex-1 flex flex-col gap-6">
        
        {/* Title */}
        <div className="shrink-0 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Settings className="w-5 h-5 text-slate-400" />
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Preferences</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter text-white">System Settings</h1>
          </div>
          <span className="text-xs bg-slate-900 border border-slate-800 text-slate-400 font-bold uppercase px-3 py-1.5 rounded-xl flex items-center gap-1.5">
            {isQM ? <Shield className="w-4 h-4 text-red-500" /> : <User className="w-4 h-4 text-emerald-400" />}
            {isQM ? 'Queue Master' : 'Player'}
          </span>
        </div>

        {/* Content Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1 min-h-0">
          
          {/* PROFILE CARD */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 lg:col-span-6 flex flex-col gap-2">
            <div className="flex items-center justify-between cursor-pointer group" onClick={() => toggleSection('profile')}>
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white uppercase tracking-tight text-sm">Personal Profile</h3>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${openSections.profile ? 'rotate-180' : ''}`} />
            </div>

            <AnimatePresence initial={false}>
              {openSections.profile && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <form onSubmit={handleProfileSave} className="flex flex-col gap-4 pt-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Full Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full h-12 bg-slate-950 border border-slate-800 text-white text-sm rounded-xl px-4 outline-none focus:border-emerald-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Skill Level</label>
                      <select
                        value={skillTier}
                        onChange={(e) => setSkillTier(e.target.value as SkillTier)}
                        className="w-full h-12 bg-slate-950 border border-slate-800 text-white text-sm rounded-xl px-4 outline-none focus:border-emerald-500 cursor-pointer"
                      >
                        <option value="BEGINNER">Beginner (1000 PTS)</option>
                        <option value="LOW_INTERMEDIATE">Low Intermediate (1400 PTS)</option>
                        <option value="INTERMEDIATE">Intermediate (1800 PTS)</option>
                        <option value="ADVANCED">Advanced (2200 PTS)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" /> Country
                      </label>
                      <select
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="w-full h-12 bg-slate-950 border border-slate-800 text-white text-sm rounded-xl px-4 outline-none focus:border-emerald-500 cursor-pointer"
                      >
                        {countries.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5 text-slate-400" /> Account Role
                      </label>
                      <div className="bg-slate-950 p-1 rounded-2xl border border-slate-850 flex gap-1">
                        <button
                          type="button"
                          onClick={() => setRole('PLAYER')}
                          className={`flex-1 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 ${
                            role === 'PLAYER' 
                              ? 'bg-emerald-500 text-slate-950 shadow-md border border-emerald-400' 
                              : 'text-slate-400 hover:text-white border border-transparent'
                          }`}
                        >
                          Player
                        </button>
                        <button
                          type="button"
                          onClick={() => setRole('QUEUE_MASTER')}
                          className={`flex-1 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 ${
                            role === 'QUEUE_MASTER' 
                              ? 'bg-red-500 text-[#ffffff] shadow-md border border-red-400' 
                              : 'text-slate-400 hover:text-white border border-transparent'
                          }`}
                        >
                          Queue Master
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={saveLoading}
                      className={`h-12 w-full font-black text-xs uppercase rounded-xl transition-all shadow-md flex items-center justify-center gap-2 ${
                        saveSuccess 
                          ? 'bg-teal-500 text-slate-950' 
                          : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 active:scale-[0.98]'
                      }`}
                    >
                      {saveLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : saveSuccess ? (
                        <>
                          <Check className="w-4 h-4" /> Profile Updated!
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" /> Save Changes
                        </>
                      )}
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* DYNAMIC CARDS DEPENDING ON ROLE */}
          <div className="lg:col-span-6 flex flex-col gap-6">
            
            {isQM ? (
              /* QUEUE MASTER - COURTS & SESSIONS */
              <>
                
                {/* Session Host Engine */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col gap-2">
                  <div className="flex items-center justify-between cursor-pointer group" onClick={() => toggleSection('sessionHosting')}>
                    <div className="flex items-center gap-2">
                      <Key className="w-5 h-5 text-red-500" />
                      <h3 className="font-bold text-white uppercase tracking-tight text-sm">Session Hosting</h3>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${openSections.sessionHosting ? 'rotate-180' : ''}`} />
                  </div>

                  <AnimatePresence initial={false}>
                    {openSections.sessionHosting && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className="flex flex-col gap-4 pt-4">
                          <p className="text-xs text-slate-400 leading-relaxed">
                            Generate a secure 6-digit Session ID to allow other club members to log in as Players and view live courts, queue schedules, matches, and local statistics in real-time.
                          </p>

                          {isSessionActive ? (
                            <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex flex-col items-center gap-3">
                              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Active Session ID</span>
                              <span className="text-4xl font-black text-white font-mono tracking-widest bg-slate-900 px-6 py-2 rounded-xl border border-slate-800">
                                {sessionId}
                              </span>

                              {/* Match session indicator integrated here */}
                              <div className="flex items-center gap-2">
                                <Monitor className={`w-3.5 h-3.5 ${currentSessionId ? 'text-emerald-400' : 'text-slate-600'}`} />
                                <span className={`text-[9px] font-bold uppercase tracking-wider ${currentSessionId ? 'text-emerald-400' : 'text-slate-600'}`}>
                                  Match Session: {currentSessionId ? 'Active' : 'Inactive'}
                                </span>
                                {currentSessionId && (
                                  <span className="text-[8px] font-mono text-slate-500">({currentSessionId})</span>
                                )}
                              </div>

                              <div className="flex gap-2 mt-1">
                                <button
                                  onClick={() => {
                                    const url = `${window.location.origin}?join=${sessionId}`;
                                    navigator.clipboard.writeText(url).then(() => {
                                      setCopySuccess(true);
                                      setTimeout(() => setCopySuccess(false), 2000);
                                    });
                                  }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-bold rounded-lg uppercase tracking-wider transition-colors"
                                >
                                  {copySuccess ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                  {copySuccess ? 'Copied!' : 'Copy Link'}
                                </button>
                                <button
                                  onClick={() => setShowQR(!showQR)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-bold rounded-lg uppercase tracking-wider transition-colors"
                                >
                                  <QrCode className="w-3 h-3" />
                                  QR
                                </button>
                              </div>
                              {showQR && (
                                <div className="bg-white p-3 rounded-xl flex flex-col items-center">
                                  <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`${window.location.origin}?join=${sessionId}`)}`}
                                    alt="QR Code"
                                    className="w-30 h-30"
                                  />
                                  <span className="text-[9px] text-slate-500 mt-1">Scan to join session</span>
                                </div>
                              )}
                              <button
                                onClick={deactivateSession}
                                disabled={sessionGenerating}
                                className="text-xs font-bold text-red-500 hover:text-red-400 uppercase tracking-wider flex items-center gap-1.5"
                              >
                                {sessionGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                                Deactivate Session
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={generateSession}
                              disabled={sessionGenerating}
                              className="w-full h-12 bg-red-500 hover:bg-red-400 text-[#ffffff] font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                            >
                              {sessionGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                              Generate Active Session ID
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Courts Configuration */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col gap-2">
                  <div className="flex items-center justify-between cursor-pointer group" onClick={() => toggleSection('courtsConfig')}>
                    <div className="flex items-center gap-2">
                      <Globe className="w-5 h-5 text-emerald-400" />
                      <h3 className="font-bold text-white uppercase tracking-tight text-sm">Courts Config</h3>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${openSections.courtsConfig ? 'rotate-180' : ''}`} />
                  </div>

                  <AnimatePresence initial={false}>
                    {openSections.courtsConfig && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className="flex flex-col gap-4 pt-4">
                          <form onSubmit={handleAddCourt} className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Add court (e.g. Court 5)"
                              value={newCourtName}
                              onChange={(e) => setNewCourtName(e.target.value)}
                              className="flex-1 h-11 bg-slate-950 border border-slate-800 text-white text-xs rounded-xl px-4 outline-none focus:border-emerald-500"
                            />
                            <button
                              type="submit"
                              className="w-11 h-11 bg-slate-800 hover:bg-slate-700 text-white rounded-xl flex items-center justify-center"
                            >
                              <Plus className="w-5 h-5" />
                            </button>
                          </form>

                          {/* List of Courts */}
                          <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                            {courts.map((court, index) => (
                              <div key={`${court.id}-${index}`} className="flex items-center justify-between p-2.5 bg-slate-950/40 rounded-xl border border-slate-850">
                                <span className="text-xs font-bold text-slate-200">{court.name}</span>
                                <button
                                  onClick={() => {
                                    if (user) deleteCourt(user.uid, court.id);
                                  }}
                                  className="text-slate-500 hover:text-red-500 p-1.5 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

              </>
            ) : (
              /* PLAYER - CONNECT TO SESSIONS */
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col gap-2">
                <div className="flex items-center justify-between cursor-pointer group" onClick={() => toggleSection('connectSession')}>
                  <div className="flex items-center gap-2">
                    <Key className="w-5 h-5 text-emerald-400" />
                    <h3 className="font-bold text-white uppercase tracking-tight text-sm">Connect to Host Session</h3>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${openSections.connectSession ? 'rotate-180' : ''}`} />
                </div>

                <AnimatePresence initial={false}>
                  {openSections.connectSession && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="flex flex-col gap-4 pt-4">
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Enter the 6-digit Session ID generated by your club's Queue Master to connect to their live court allocation schedules, queues, and matches.
                        </p>

                        {joinedQmUserId ? (
                          <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex flex-col items-center gap-3 text-center">
                            <span className="text-[10px] uppercase tracking-wider text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/15">
                              Connected
                            </span>
                            <div className="flex flex-col">
                              <span className="text-2xl font-black text-white font-mono tracking-widest">
                                {localStorage.getItem('rallyup_joined_code') || 'ACTIVE'}
                              </span>
                              <span className="text-[10px] text-slate-500 mt-1">Syncing matches & courts in real-time</span>
                            </div>
                            
                            <button
                              onClick={() => {
                                if (onSessionLeft) {
                                  onSessionLeft();
                                }
                                setJoiningCode('');
                              }}
                              className="text-xs font-bold text-red-500 hover:text-red-400 uppercase tracking-wider flex items-center gap-1.5 mt-2"
                            >
                              Disconnect Session
                            </button>
                          </div>
                        ) : (
                          <form onSubmit={handleJoinSession} className="flex flex-col gap-4">
                            <div className="relative">
                              <input
                                type="text"
                                placeholder="Enter 6-digit Session ID"
                                value={joiningCode}
                                onChange={(e) => setJoiningCode(e.target.value.slice(0, 6))}
                                className="w-full h-14 bg-slate-950 border border-slate-800 text-white font-mono tracking-widest text-lg font-black text-center rounded-2xl outline-none focus:border-emerald-500 placeholder:text-sm placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-600 placeholder:font-normal"
                                required
                              />
                            </div>

                            {joinError && (
                              <p className="text-red-500 text-xs font-semibold">{joinError}</p>
                            )}

                            <button
                              type="submit"
                              disabled={joinLoading}
                              className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                            >
                              {joinLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Connect To Session'}
                            </button>
                          </form>
                        )}

                        <div className="border-t border-slate-800/80 pt-4 mt-2">
                          <div className="flex gap-2.5 items-start text-xs text-slate-400 bg-slate-950/30 p-3 rounded-2xl border border-slate-850">
                            <HelpCircle className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                            <p className="leading-relaxed">
                              Ask your Queue Master / Admin to generate an active 6-digit session ID in their Settings and display it so you can sync instantly!
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

          </div>

          {/* RESET DATA & DANGER ZONE SECTION (QM Only) */}
          {isQM && (
            <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-6 mt-2 pb-12">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col gap-2">
                <div className="flex items-center justify-between cursor-pointer group" onClick={() => toggleSection('resetData')}>
                  <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-slate-400" />
                    <h3 className="font-bold text-white tracking-tight text-sm">Reset Data</h3>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${openSections.resetData ? 'rotate-180' : ''}`} />
                </div>
                
                <AnimatePresence initial={false}>
                  {openSections.resetData && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="flex flex-col gap-6 pt-4">
                        <div className="bg-blue-500/10 border-l-4 border-blue-500 p-4 rounded-r-xl rounded-l-sm flex flex-col gap-1">
                          <span className="text-blue-400 font-bold text-xs flex items-center gap-1.5">
                            <Info className="w-4 h-4" /> Session history limit: 10
                          </span>
                          <p className="text-blue-400/80 text-xs leading-relaxed mt-1">
                            The 10 most recent queueing sessions are kept on this device. Older sessions are automatically and permanently removed when you end a new one.
                          </p>
                        </div>
                        
                        <div className="flex flex-col gap-4">
                          <div className="flex items-center justify-between p-4 bg-slate-950/50 rounded-2xl border border-slate-850">
                            <div className="pr-4">
                              <h4 className="text-sm font-bold text-slate-200 mb-1">Reset All Data</h4>
                              <p className="text-xs text-slate-500 leading-relaxed">
                                Wipes everything on this device — roster, matches, fees, and session history. Does not affect global rankings.
                              </p>
                            </div>
                            <button
                              onClick={() => setConfirmAction('resetAll')}
                              disabled={actionLoading}
                              className="shrink-0 px-4 h-10 bg-slate-950 hover:bg-slate-800 text-slate-300 font-medium text-xs rounded-xl transition-colors border border-slate-700 disabled:opacity-50 flex items-center gap-2"
                            >
                              {actionLoading && confirmAction === 'resetAll' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                              Reset all
                            </button>
                          </div>
                          
                          <div className="flex items-center justify-between p-4 bg-slate-950/50 rounded-2xl border border-slate-850">
                            <div className="pr-4">
                              <h4 className="text-sm font-bold text-slate-200 mb-1">Reset Matches</h4>
                              <p className="text-xs text-slate-500 leading-relaxed">
                                Reset all match history, fees while keeping all player records intact.
                              </p>
                            </div>
                            <button
                              onClick={() => setConfirmAction('resetMatches')}
                              disabled={actionLoading}
                              className="shrink-0 px-4 h-10 bg-slate-950 hover:bg-slate-800 text-slate-300 font-medium text-xs rounded-xl transition-colors border border-slate-700 disabled:opacity-50 flex items-center gap-2"
                            >
                              {actionLoading && confirmAction === 'resetMatches' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                              Reset
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              <div className="flex flex-col gap-6">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col gap-2">
                  <div className="flex items-center justify-between cursor-pointer group" onClick={() => toggleSection('others')}>
                    <div className="flex items-center gap-2">
                      <MoreVertical className="w-5 h-5 text-slate-400" />
                      <h3 className="font-bold text-white tracking-tight text-sm">Others</h3>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${openSections.others ? 'rotate-180' : ''}`} />
                  </div>

                  <AnimatePresence initial={false}>
                    {openSections.others && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className="flex items-center justify-between p-4 bg-slate-950/50 rounded-2xl border border-slate-850 mt-4">
                          <span className="text-sm font-bold text-slate-200">Survey Form</span>
                          <button
                            onClick={() => window.open('https://forms.gle/your-survey-link', '_blank')}
                            className="px-5 h-10 bg-red-500 hover:bg-red-600 text-[#ffffff] font-bold text-xs rounded-xl transition-colors shadow-lg shadow-red-500/10"
                          >
                            Give Feedback
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                <div className="bg-rose-500/5 border border-rose-500/20 rounded-3xl p-6 flex flex-col gap-2">
                  <div className="flex items-center justify-between cursor-pointer group" onClick={() => toggleSection('dangerZone')}>
                    <h3 className="font-bold text-rose-500 tracking-tight text-sm">Danger zone</h3>
                    <ChevronDown className={`w-4 h-4 text-rose-500/70 transition-transform duration-300 ${openSections.dangerZone ? 'rotate-180' : ''}`} />
                  </div>
                  
                  <AnimatePresence initial={false}>
                    {openSections.dangerZone && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className="flex items-center justify-between p-4 bg-slate-950/50 rounded-2xl border border-rose-500/20 mt-4">
                          <div className="pr-4">
                            <h4 className="text-sm font-bold text-slate-200 mb-1">Delete account</h4>
                            <p className="text-xs text-slate-500 leading-relaxed">
                              Permanently delete your profile, match history, and ranking. This cannot be undone.
                            </p>
                          </div>
                          <button
                            onClick={() => setConfirmAction('deleteAccount')}
                            disabled={actionLoading}
                            className="shrink-0 px-5 h-10 bg-transparent border border-rose-500 text-rose-500 hover:bg-rose-500 hover:text-white font-bold text-xs rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
                          >
                            {actionLoading && confirmAction === 'deleteAccount' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                            Delete
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Confirmation Overlay */}
      <AnimatePresence>
        {confirmAction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => !actionLoading && setConfirmAction(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 bg-rose-500/10 rounded-2xl flex items-center justify-center border border-rose-500/20">
                  <Trash2 className="w-6 h-6 text-rose-400" />
                </div>
                <h3 className="text-lg font-black text-white mb-2">
                  {confirmAction === 'resetAll' && 'Reset All Data?'}
                  {confirmAction === 'resetMatches' && 'Reset Match History?'}
                  {confirmAction === 'deleteAccount' && 'Delete Account?'}
                </h3>
                <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                  {confirmAction === 'resetAll' && 'This will permanently wipe all players, matches, courts, and fees. Global rankings are not affected.'}
                  {confirmAction === 'resetMatches' && 'This will permanently delete all match history and fees. Player records will be kept.'}
                  {confirmAction === 'deleteAccount' && 'This will permanently delete your profile, all data, and match history. This cannot be undone.'}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirmAction(null)}
                    disabled={actionLoading}
                    className="flex-1 h-11 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (confirmAction === 'resetAll') handleResetAll();
                      else if (confirmAction === 'resetMatches') handleResetMatches();
                      else if (confirmAction === 'deleteAccount') handleDeleteAccount();
                    }}
                    disabled={actionLoading}
                    className="flex-1 h-11 bg-rose-500 hover:bg-rose-600 text-[#ffffff] font-bold text-xs rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {actionLoading ? 'Deleting...' : 'Confirm'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
