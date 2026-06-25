import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Authenticating...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.1),transparent_70%)] z-0 pointer-events-none"></div>
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center relative z-10 shadow-2xl">
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
            <span className="text-4xl font-black text-slate-950 italic tracking-tighter">R</span>
          </div>
          <h1 className="text-3xl font-black italic tracking-tighter text-white uppercase mb-2">RallyUp</h1>
          <p className="text-slate-400 text-sm mb-6">Sign in to sync your club's roster and match history to the cloud.</p>
          
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 mb-6">
            <input 
              type="email" 
              placeholder="Email address" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 bg-slate-800/50 border border-slate-700 rounded-xl px-4 text-white focus:outline-none focus:border-emerald-500 transition-colors"
              required
            />
            <input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 bg-slate-800/50 border border-slate-700 rounded-xl px-4 text-white focus:outline-none focus:border-emerald-500 transition-colors"
              required
            />
            {error && <p className="text-rose-500 text-xs text-left">{error}</p>}
            <button 
              type="submit"
              className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition-all active:scale-95"
            >
              {isSignUp ? 'Sign Up' : 'Sign In'}
            </button>
          </form>

          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="h-px bg-slate-800 flex-1"></div>
            <span className="text-xs text-slate-500 uppercase tracking-widest font-bold">Or</span>
            <div className="h-px bg-slate-800 flex-1"></div>
          </div>

          <button 
            onClick={signInWithGoogle}
            className="w-full h-14 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-xl flex items-center justify-center gap-3 transition-all active:scale-95 mb-4"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google" />
            Sign In With Google
          </button>
          
          <button 
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-slate-400 text-sm hover:text-emerald-400 transition-colors"
          >
            {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
