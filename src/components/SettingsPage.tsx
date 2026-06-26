import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAppStore } from '../store';
import * as firestoreService from '../services/firestore';
import { Settings, Shield, User, Globe, MapPin, Save, Plus, Trash2, Key, HelpCircle, Check, Loader2, RefreshCw } from 'lucide-react';
import { SkillTier } from '../types';

interface SettingsPageProps {
  onSessionJoined?: (qmUserId: string) => void;
  joinedQmUserId: string | null;
  onSessionLeft?: () => void;
}

export default function SettingsPage({ onSessionJoined, joinedQmUserId, onSessionLeft }: SettingsPageProps) {
  const { user, userProfile, updateProfile } = useAuth();
  const { courts, addCourt, deleteCourt } = useAppStore();

  // Profile Form States
  const [name, setName] = useState(userProfile?.name || '');
  const [skillTier, setSkillTier] = useState<SkillTier>(userProfile?.skillTier || 'BEGINNER');
  const [country, setCountry] = useState(userProfile?.country || 'Philippines');
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
      await updateProfile({
        name,
        skillTier,
        country,
      });
      setSaveSuccess(true);
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
      await firestoreService.saveSessionMapping(code, user.uid, true);
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
      const qmId = await firestoreService.getSessionMapping(joiningCode.trim());
      if (qmId) {
        if (onSessionJoined) {
          onSessionJoined(qmId);
          localStorage.setItem('rallyup_joined_qm', qmId);
          localStorage.setItem('rallyup_joined_code', joiningCode.trim());
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
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 lg:col-span-6 flex flex-col gap-6">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-white uppercase tracking-tight text-sm">Personal Profile</h3>
            </div>

            <form onSubmit={handleProfileSave} className="flex flex-col gap-4">
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
          </div>

          {/* DYNAMIC CARD DEPENDING ON ROLE */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 lg:col-span-6 flex flex-col gap-6">
            
            {isQM ? (
              /* QUEUE MASTER - COURTS & SESSIONS */
              <div className="flex flex-col gap-6">
                
                {/* Session Host Engine */}
                <div className="flex flex-col gap-4 border-b border-slate-800 pb-5">
                  <div className="flex items-center gap-2">
                    <Key className="w-5 h-5 text-red-500" />
                    <h3 className="font-bold text-white uppercase tracking-tight text-sm">Session Hosting</h3>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    Generate a secure 6-digit Session ID to allow other club members to log in as Players and view live courts, queue schedules, matches, and local statistics in real-time.
                  </p>

                  {isSessionActive ? (
                    <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex flex-col items-center gap-3">
                      <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Active Session ID</span>
                      <span className="text-4xl font-black text-white font-mono tracking-widest bg-slate-900 px-6 py-2 rounded-xl border border-slate-800">
                        {sessionId}
                      </span>
                      <button
                        onClick={deactivateSession}
                        disabled={sessionGenerating}
                        className="text-xs font-bold text-red-500 hover:text-red-400 uppercase tracking-wider flex items-center gap-1.5 mt-1"
                      >
                        {sessionGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                        Deactivate Session
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={generateSession}
                      disabled={sessionGenerating}
                      className="w-full h-12 bg-red-500 hover:bg-red-400 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                    >
                      {sessionGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                      Generate Active Session ID
                    </button>
                  )}
                </div>

                {/* Courts Configuration */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <Globe className="w-5 h-5 text-emerald-400" />
                    <h3 className="font-bold text-white uppercase tracking-tight text-sm">Courts Config</h3>
                  </div>

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
                    {courts.map((court) => (
                      <div key={court.id} className="flex items-center justify-between p-2.5 bg-slate-950/40 rounded-xl border border-slate-850">
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

              </div>
            ) : (
              /* PLAYER - CONNECT TO SESSIONS */
              <div className="flex flex-col gap-6">
                <div className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-bold text-white uppercase tracking-tight text-sm">Connect to Host Session</h3>
                </div>

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
            )}

          </div>

        </div>

      </div>
    </div>
  );
}
