import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, Award, Check, MapPin, Shield, User as UserIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SkillTier } from '../types';

import ThemeToggle from './ThemeToggle';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, userProfile, loading, profileLoading, completeProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/', { replace: true });
    }
  }, [user, loading, navigate]);

  // Complete Profile State
  const [profileStep, setProfileStep] = useState(1);
  const [selectedSkill, setSelectedSkill] = useState<SkillTier | null>(null);
  const [country, setCountry] = useState('Philippines');
  const [selectedRole, setSelectedRole] = useState<'PLAYER' | 'QUEUE_MASTER' | null>(null);
  const [error, setError] = useState('');
  const [authWorking, setAuthWorking] = useState(false);

  const countries = [
    'Philippines', 'United States', 'Singapore', 'Malaysia', 'Indonesia', 
    'Japan', 'Canada', 'United Kingdom', 'Australia', 'India', 'Thailand'
  ];

  const handleCompleteProfile = async () => {
    if (!selectedSkill || !country || !selectedRole) return;
    setAuthWorking(true);
    try {
      await completeProfile(selectedSkill, country, selectedRole);
    } catch (err) {
      setError('Failed to save profile. Please try again.');
    } finally {
      setAuthWorking(false);
    }
  };

  if (loading || (user && profileLoading)) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center p-4 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.05),transparent_70%)] z-0 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col items-center">
          <Loader2 className="w-12 h-12 text-red-500 animate-spin mb-4" />
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs font-mono">Syncing your session...</p>
        </div>
      </div>
    );
  }

  // Not signed in — redirected by useEffect above; render null to avoid flash
  if (!user) return null;

  // Signed in but User Profile is not yet completed -> Show Complete Your Profile page
  if (!userProfile || !userProfile.profileCompleted) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center p-4 md:p-8 overflow-y-auto font-sans text-slate-100">
        <div className="absolute top-4 right-4 z-50">
          <ThemeToggle />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.03),transparent_70%)] z-0 pointer-events-none"></div>
        
        <div className="max-w-md w-full flex flex-col items-center relative z-10">
          
          {/* Logo Header */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/20">
              <svg className="w-6 h-6 text-[#ffffff]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </div>
            <span className="text-2xl font-black italic tracking-tighter text-white uppercase">RallyUp</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 w-full shadow-2xl">
            {profileStep === 1 ? (
              <div className="flex flex-col">
                <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-4 text-red-400 border border-red-500/20">
                  <Award className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-black text-white tracking-tight mb-1">Complete Your Profile</h2>
                <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                  Step 1: Choose your skill level and select your country to get customized pairings.
                </p>

                {/* Skill Select 2x2 Grid */}
                <div className="mb-6">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">Skill Level *</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'BEGINNER', label: 'Beginner', desc: 'Just starting out' },
                      { id: 'LOW_INTERMEDIATE', label: 'Low Inter.', desc: 'Regular play' },
                      { id: 'INTERMEDIATE', label: 'Intermediate', desc: 'Competitive club' },
                      { id: 'ADVANCED', label: 'Advanced', desc: 'Tournament level' }
                    ].map((tier) => (
                      <button
                        key={tier.id}
                        type="button"
                        onClick={() => setSelectedSkill(tier.id as SkillTier)}
                        className={`p-3 rounded-2xl border text-left flex flex-col justify-between h-22 transition-all ${
                          selectedSkill === tier.id 
                            ? 'border-emerald-500 bg-emerald-500/10 text-white shadow-lg shadow-emerald-500/10' 
                            : 'border-slate-800 bg-slate-950 hover:border-slate-700 hover:bg-slate-900 text-slate-300'
                        }`}
                      >
                        <div className="flex justify-between items-center w-full">
                          <span className="text-sm font-bold text-white">{tier.label}</span>
                          {selectedSkill === tier.id && <Check className="w-4 h-4 text-emerald-400" />}
                        </div>
                        <span className={`text-[10px] ${selectedSkill === tier.id ? 'text-emerald-400' : 'text-slate-500'}`}>{tier.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Country Dropdown */}
                <div className="mb-6">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5 font-mono">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    Country *
                  </label>
                  <div className="relative">
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full h-12 bg-slate-950 border border-slate-800 rounded-xl px-4 text-sm text-white focus:outline-none focus:border-red-500 appearance-none cursor-pointer"
                    >
                      {countries.map((c) => (
                        <option key={c} value={c} className="bg-slate-950 text-white">{c}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-500">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                      </svg>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!selectedSkill}
                  onClick={() => setProfileStep(2)}
                  className="w-full h-12 bg-red-500 hover:bg-red-400 disabled:bg-slate-800 disabled:text-slate-600 text-[#ffffff] font-bold rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  Save & Continue
                </button>
              </div>
            ) : (
              <div className="flex flex-col">
                <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-4 text-red-400 border border-red-500/20">
                  <Shield className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-black text-white tracking-tight mb-1">Choose Your Role</h2>
                <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                  Step 2: Select your role. Queue Masters host badminton sessions. Players join existing ones.
                </p>

                {/* Role Cards */}
                <div className="flex flex-col gap-4 mb-6">
                  <button
                    type="button"
                    onClick={() => setSelectedRole('PLAYER')}
                    className={`p-4 rounded-2xl border text-left flex items-start gap-3.5 transition-all ${
                      selectedRole === 'PLAYER' 
                        ? 'border-emerald-500 bg-emerald-500/5 text-white ring-2 ring-emerald-500/10' 
                        : 'border-slate-800 bg-slate-950 hover:border-emerald-500/30 hover:bg-slate-900 text-slate-300'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      selectedRole === 'PLAYER' ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-900 text-slate-500'
                    }`}>
                      <UserIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold flex items-center gap-1.5 text-white">
                        Player
                        {selectedRole === 'PLAYER' && <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-1.5 py-0.5 rounded font-black uppercase font-mono">Selected</span>}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                        View active matches, live queues, check local rankings, and see your stats. Join hosted sessions in real-time.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedRole('QUEUE_MASTER')}
                    className={`p-4 rounded-2xl border text-left flex items-start gap-3.5 transition-all ${
                      selectedRole === 'QUEUE_MASTER' 
                        ? 'border-red-500 bg-red-500/5 text-white ring-2 ring-red-500/10' 
                        : 'border-slate-800 bg-slate-950 hover:border-red-500/30 hover:bg-slate-900 text-slate-300'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      selectedRole === 'QUEUE_MASTER' ? 'bg-red-500 text-[#ffffff] font-bold' : 'bg-slate-900 text-slate-500'
                    }`}>
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold flex items-center gap-1.5 text-white">
                        Queue Master
                        {selectedRole === 'QUEUE_MASTER' && <span className="bg-red-500/20 text-red-400 text-[10px] px-1.5 py-0.5 rounded font-black uppercase font-mono">Selected</span>}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                        Host active sessions, configure courts and fees, manage matching algorithms, and have administrative authority.
                      </p>
                    </div>
                  </button>
                </div>

                {error && (
                  <p className="text-red-400 text-xs font-semibold mb-4">{error}</p>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setProfileStep(1)}
                    className="flex-1 h-12 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 font-bold rounded-xl transition-all active:scale-[0.98]"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={!selectedRole || authWorking}
                    onClick={handleCompleteProfile}
                    className="flex-1 h-12 bg-red-500 hover:bg-red-400 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {authWorking ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Complete Setup'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Profile is complete -> proceed to the app
  return <>{children}</>;
}
