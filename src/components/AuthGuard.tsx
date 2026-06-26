import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, Eye, EyeOff, Activity, Check, MapPin, Award, Shield, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SkillTier } from '../types';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { 
    user, 
    userProfile, 
    loading, 
    profileLoading, 
    signInWithGoogle, 
    signInWithEmail, 
    signUpWithEmail, 
    completeProfile 
  } = useAuth();

  // Authentication UI State
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [authWorking, setAuthWorking] = useState(false);

  // Complete Profile State
  const [profileStep, setProfileStep] = useState(1);
  const [selectedSkill, setSelectedSkill] = useState<SkillTier | null>(null);
  const [country, setCountry] = useState('Philippines');
  const [selectedRole, setSelectedRole] = useState<'PLAYER' | 'QUEUE_MASTER' | null>(null);

  const countries = [
    'Philippines', 'United States', 'Singapore', 'Malaysia', 'Indonesia', 
    'Japan', 'Canada', 'United Kingdom', 'Australia', 'India', 'Thailand'
  ];

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (isSignUp && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setAuthWorking(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password')) {
        setError('Invalid email or password.');
      } else if (msg.includes('auth/email-already-in-use')) {
        setError('This email is already in use.');
      } else if (msg.includes('auth/weak-password')) {
        setError('Password should be at least 6 characters.');
      } else {
        setError('Authentication failed. Please try again.');
      }
    } finally {
      setAuthWorking(false);
    }
  };

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
      <div className="fixed inset-0 bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-12 h-12 text-red-500 animate-spin mb-4" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Syncing your session...</p>
      </div>
    );
  }

  // Not signed in -> Show the brand new sleek light-themed login/register page (Image 1 & 2 inspired)
  if (!user) {
    return (
      <div className="fixed inset-0 bg-slate-50 flex flex-col items-center justify-center p-4 md:p-8 overflow-y-auto font-sans text-slate-800">
        <div className="max-w-md w-full flex flex-col items-center">
          {/* Logo / Header */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/20">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </div>
            <span className="text-2xl font-black italic tracking-tighter text-slate-900 uppercase">RallyUp</span>
          </div>
          <p className="text-slate-500 text-sm text-center max-w-sm mb-6 leading-relaxed">
            Track your games, connect with players, and keep the court flowing. Join the RallyUp badminton community for free.
          </p>

          {/* White Card Container */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 w-full shadow-xl shadow-slate-100/50 relative">
            
            {/* Custom Tab Switcher */}
            <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-1 mb-6">
              <button
                type="button"
                onClick={() => { setIsSignUp(false); setError(''); }}
                className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${
                  !isSignUp 
                    ? 'bg-white text-slate-900 shadow-md shadow-slate-200/50' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setIsSignUp(true); setError(''); }}
                className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${
                  isSignUp 
                    ? 'bg-white text-slate-900 shadow-md shadow-slate-200/50' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Register
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">
              {isSignUp && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Your Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Juan Dela Cruz" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full h-12 bg-slate-50/50 border border-slate-200 rounded-xl px-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-red-500 focus:bg-white transition-all text-sm"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
                <input 
                  type="email" 
                  placeholder="Enter your email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 bg-slate-50/50 border border-slate-200 rounded-xl px-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-red-500 focus:bg-white transition-all text-sm"
                  required
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Password</label>
                  {!isSignUp && (
                    <button 
                      type="button"
                      onClick={() => alert('Password reset is not enabled. Please contact support.')}
                      className="text-xs font-semibold text-red-500 hover:text-red-600"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    placeholder={isSignUp ? 'Min. 6 characters' : '••••••••'} 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-12 bg-slate-50/50 border border-slate-200 rounded-xl pl-4 pr-11 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-red-500 focus:bg-white transition-all text-sm"
                    required
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {isSignUp && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Confirm Password</label>
                  <div className="relative">
                    <input 
                      type={showConfirmPassword ? 'text' : 'password'} 
                      placeholder="Re-enter password" 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full h-12 bg-slate-50/50 border border-slate-200 rounded-xl pl-4 pr-11 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-red-500 focus:bg-white transition-all text-sm"
                      required
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <p className="text-red-500 text-xs font-semibold">{error}</p>
              )}

              <button 
                type="submit"
                disabled={authWorking}
                className="w-full h-12 bg-red-500 hover:bg-red-600 disabled:bg-slate-300 text-white font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-red-500/10 flex items-center justify-center gap-2 mt-2"
              >
                {authWorking ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  isSignUp ? 'Create Account' : 'Sign In'
                )}
              </button>
            </form>

            <div className="flex items-center justify-between gap-4 my-6">
              <div className="h-px bg-slate-100 flex-1"></div>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Or continue with</span>
              <div className="h-px bg-slate-100 flex-1"></div>
            </div>

            <button 
              onClick={signInWithGoogle}
              type="button"
              className="w-full h-12 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-xl flex items-center justify-center gap-3 transition-all active:scale-95"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
              Continue with Google
            </button>
            
            <p className="text-[10px] text-slate-400 text-center mt-6 leading-normal">
              By continuing, you agree to RallyUp's terms, conditions, and club rules.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Signed in but User Profile is not yet completed -> Show Complete Your Profile page (Image 3 inspired)
  if (!userProfile || !userProfile.profileCompleted) {
    return (
      <div className="fixed inset-0 bg-slate-50 flex flex-col items-center justify-center p-4 md:p-8 overflow-y-auto font-sans text-slate-800">
        <div className="max-w-md w-full flex flex-col items-center">
          
          {/* Logo Header */}
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/20">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </div>
            <span className="text-2xl font-black italic tracking-tighter text-slate-900 uppercase">RallyUp</span>
          </div>

          <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 w-full shadow-xl shadow-slate-100/50">
            {profileStep === 1 ? (
              <div className="flex flex-col">
                <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-4 text-red-500">
                  <Award className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-black text-slate-950 tracking-tight mb-1">Complete Your Profile</h2>
                <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                  Step 1: Choose your skill tier and select your country to get customized pairings.
                </p>

                {/* Skill Select 2x2 Grid */}
                <div className="mb-6">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Skill Level *</label>
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
                        className={`p-3 rounded-2xl border text-left flex flex-col justify-between h-20 transition-all ${
                          selectedSkill === tier.id 
                            ? 'border-emerald-500 bg-emerald-500 text-white shadow-lg shadow-emerald-500/15' 
                            : 'border-slate-100 bg-slate-50 hover:border-slate-300 hover:bg-slate-100/60 text-slate-800'
                        }`}
                      >
                        <div className="flex justify-between items-center w-full">
                          <span className={`text-sm font-bold ${selectedSkill === tier.id ? 'text-white' : 'text-slate-900'}`}>{tier.label}</span>
                          {selectedSkill === tier.id && <Check className="w-4 h-4 text-white" />}
                        </div>
                        <span className={`text-[10px] ${selectedSkill === tier.id ? 'text-emerald-100' : 'text-slate-400'}`}>{tier.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Country Dropdown */}
                <div className="mb-6">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    Country *
                  </label>
                  <div className="relative">
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 text-sm text-slate-900 focus:outline-none focus:border-red-500 focus:bg-white appearance-none cursor-pointer"
                    >
                      {countries.map((c) => (
                        <option key={c} value={c}>{c}</option>
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
                  className="w-full h-12 bg-red-500 hover:bg-red-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  Save & Continue
                </button>
              </div>
            ) : (
              <div className="flex flex-col">
                <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-4 text-red-500">
                  <Shield className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-black text-slate-950 tracking-tight mb-1">Choose Your Role</h2>
                <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                  Step 2: Select your role. Queue Masters host badminton sessions. Players join existing ones.
                </p>

                {/* Role Cards */}
                <div className="flex flex-col gap-4 mb-6">
                  <button
                    type="button"
                    onClick={() => setSelectedRole('PLAYER')}
                    className={`p-4 rounded-2xl border text-left flex items-start gap-3.5 transition-all ${
                      selectedRole === 'PLAYER' 
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/20' 
                        : 'border-slate-100 bg-slate-50 hover:border-slate-300 hover:bg-slate-100/60 text-slate-800'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      selectedRole === 'PLAYER' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      <UserIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold flex items-center gap-1.5">
                        Player
                        {selectedRole === 'PLAYER' && <span className="bg-emerald-100 text-emerald-700 text-[10px] px-1.5 py-0.5 rounded font-black uppercase">Selected</span>}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">
                        View active matches, live queues, check local rankings, and see your stats. Join hosted sessions in real-time.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedRole('QUEUE_MASTER')}
                    className={`p-4 rounded-2xl border text-left flex items-start gap-3.5 transition-all ${
                      selectedRole === 'QUEUE_MASTER' 
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/20' 
                        : 'border-slate-100 bg-slate-50 hover:border-slate-300 hover:bg-slate-100/60 text-slate-800'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      selectedRole === 'QUEUE_MASTER' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold flex items-center gap-1.5">
                        Queue Master
                        {selectedRole === 'QUEUE_MASTER' && <span className="bg-emerald-100 text-emerald-700 text-[10px] px-1.5 py-0.5 rounded font-black uppercase">Selected</span>}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">
                        Host active sessions, configure courts and fees, manage matching algorithms, and have administrative authority.
                      </p>
                    </div>
                  </button>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setProfileStep(1)}
                    className="flex-1 h-12 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all active:scale-95"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={!selectedRole || authWorking}
                    onClick={handleCompleteProfile}
                    className="flex-1 h-12 bg-red-500 hover:bg-red-600 disabled:bg-slate-200 text-white font-bold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
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
