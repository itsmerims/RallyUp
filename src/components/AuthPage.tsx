import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, Eye, EyeOff, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

import ThemeToggle from './ThemeToggle';
import TermsPage from './TermsPage';
import ClubRulesPage from './ClubRulesPage';

export default function AuthPage() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const navigate = useNavigate();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [authWorking, setAuthWorking] = useState(false);

  const [showTerms, setShowTerms] = useState(false);
  const [showClubRules, setShowClubRules] = useState(false);

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

  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col items-center p-4 md:p-8 overflow-y-auto font-sans text-slate-100">
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(239,68,68,0.03),transparent_70%)] z-0 pointer-events-none"></div>

      <div className="max-w-md w-full flex flex-col items-center relative z-10 pt-8 md:pt-12">
        <div className="flex items-center gap-3 mb-2 shrink-0">
          <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/20">
            <svg className="w-6 h-6 text-[#ffffff]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </div>
          <span className="text-2xl font-black italic tracking-tighter text-white uppercase">RallyUp</span>
        </div>
        <p className="text-slate-400 text-sm text-center max-w-sm mb-6 leading-relaxed shrink-0">
          Track your games, connect with players, and keep the court flowing. Join the RallyUp badminton community for free.
        </p>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 w-full shadow-2xl shadow-black/40 relative">
          <div className="bg-slate-950 p-1 rounded-2xl border border-slate-850 flex gap-1 mb-6 relative">
            <button
              type="button"
              onClick={() => { setIsSignUp(false); setError(''); }}
              className={`flex-1 py-2 rounded-xl font-bold text-sm transition-all duration-200 relative z-10 ${
                !isSignUp
                  ? 'text-white'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsSignUp(true); setError(''); }}
              className={`flex-1 py-2 rounded-xl font-bold text-sm transition-all duration-200 relative z-10 ${
                isSignUp
                  ? 'text-white'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Register
            </button>
            <div className="absolute inset-1 pointer-events-none">
              <motion.div
                className="w-1/2 h-full bg-slate-800 rounded-xl shadow"
                animate={{ x: isSignUp ? '100%' : '0%' }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.form
              key={isSignUp ? 'signup' : 'signin'}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleAuthSubmit}
              className="flex flex-col gap-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">Email Address</label>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 bg-slate-950 border border-slate-800 rounded-xl px-4 text-[#ffffff] placeholder:text-slate-600 focus:outline-none focus:border-red-500 transition-all text-sm"
                  required
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Password</label>
                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={() => alert('Password reset is not enabled. Please contact support.')}
                      className="text-xs font-semibold text-red-400 hover:text-red-300"
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
                    className="w-full h-12 bg-slate-950 border border-slate-800 rounded-xl pl-4 pr-11 text-[#ffffff] placeholder:text-slate-600 focus:outline-none focus:border-red-500 transition-all text-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {isSignUp && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full h-12 bg-slate-950 border border-slate-800 rounded-xl pl-4 pr-11 text-[#ffffff] placeholder:text-slate-600 focus:outline-none focus:border-red-500 transition-all text-sm"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <p className="text-red-400 text-xs font-semibold">{error}</p>
              )}

              <button
                type="submit"
                disabled={authWorking}
                className="w-full h-12 bg-red-500 hover:bg-red-400 disabled:bg-slate-800 disabled:text-slate-600 text-[#ffffff] font-bold rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-red-500/10 flex items-center justify-center gap-2 mt-2"
              >
                {authWorking ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  isSignUp ? 'Create Account' : 'Sign In'
                )}
              </button>
            </motion.form>
          </AnimatePresence>

          <div className="flex items-center justify-between gap-4 my-6">
            <div className="h-px bg-slate-800 flex-1"></div>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-black font-mono">Or continue with</span>
            <div className="h-px bg-slate-800 flex-1"></div>
          </div>

          <button
            onClick={signInWithGoogle}
            type="button"
            className="w-full h-12 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-200 font-semibold rounded-xl flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
            Continue with Google
          </button>

          <p className="text-xs text-slate-500 text-center mt-4 leading-normal">
            <button type="button" onClick={() => navigate('/')} className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors">
              Back to home
            </button>
          </p>

          <p className="text-[10px] text-slate-500 text-center mt-4 leading-normal font-mono">
            By continuing, you agree to RallyUp's{' '}
            <button type="button" onClick={() => setShowTerms(true)} className="text-slate-300 hover:text-white underline underline-offset-2 transition-colors">
              terms and conditions
            </button>
            {' '}and{' '}
            <button type="button" onClick={() => setShowClubRules(true)} className="text-slate-300 hover:text-white underline underline-offset-2 transition-colors">
              club rules
            </button>
            .
          </p>
        </div>
      </div>

      <AnimatePresence>
        {showTerms && (
          <TermsPage onClose={() => setShowTerms(false)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showClubRules && (
          <ClubRulesPage onClose={() => setShowClubRules(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
