import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, ShieldAlert, Copy, ExternalLink, Check } from 'lucide-react';
import firebaseConfig from '../../firebase-applet-config.json';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [showDomainError, setShowDomainError] = useState(false);
  const [copiedDev, setCopiedDev] = useState(false);
  const [copiedPre, setCopiedPre] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setShowDomainError(false);
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

  const handleGoogleSignIn = async () => {
    setError('');
    setShowDomainError(false);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      if (
        err.code === 'auth/unauthorized-domain' ||
        (err.message && err.message.includes('unauthorized-domain'))
      ) {
        setShowDomainError(true);
        setError('Unauthorized Domain Error');
      } else {
        setError(err.message || 'An error occurred during Google sign-in.');
      }
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Authenticating...</p>
      </div>
    );
  }

  if (!user) {
    const devDomain = window.location.hostname;
    // Guess or generate both common preview domains based on the active domain pattern
    const isDev = devDomain.includes('-dev-');
    const preDomain = isDev ? devDomain.replace('-dev-', '-pre-') : devDomain.replace('-pre-', '-dev-');
    
    const consoleUrl = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings`;

    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.1),transparent_70%)] z-0 pointer-events-none"></div>
        
        {showDomainError ? (
          <div className="bg-slate-900 border border-rose-500/30 rounded-3xl p-6 md:p-8 max-w-lg w-full text-left relative z-10 shadow-2xl">
            <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-center mb-5 text-rose-500">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-black italic tracking-tighter text-white uppercase mb-2">Authorize Domain</h1>
            <p className="text-slate-300 text-sm mb-5 leading-relaxed">
              Google Sign-In is blocked because this web address is not authorized in your Firebase Project (<span className="text-emerald-400 font-mono text-xs">{firebaseConfig.projectId}</span>).
            </p>
            
            <div className="space-y-4 bg-slate-950/60 rounded-2xl border border-slate-800/80 p-4 md:p-5 mb-6 text-sm">
              <p className="font-bold text-slate-200">How to authorize these domains:</p>
              <ol className="list-decimal pl-4 space-y-2 text-slate-400">
                <li>
                  Go to your{' '}
                  <a 
                    href={consoleUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-emerald-400 hover:underline inline-flex items-center gap-1 font-semibold"
                  >
                    Firebase Auth Settings <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>Scroll down to find <span className="text-slate-200 font-semibold">"Authorized domains"</span>.</li>
                <li>
                  Click <span className="text-slate-200 font-semibold">"Add domain"</span> and register these two domains:
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg p-2 md:p-2.5">
                      <code className="text-xs text-slate-300 select-all font-mono break-all">{devDomain}</code>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(devDomain);
                          setCopiedDev(true);
                          setTimeout(() => setCopiedDev(false), 2000);
                        }}
                        className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold uppercase tracking-wider shrink-0 ml-2 flex items-center gap-1"
                      >
                        {copiedDev ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedDev ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg p-2 md:p-2.5">
                      <code className="text-xs text-slate-300 select-all font-mono break-all">{preDomain}</code>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(preDomain);
                          setCopiedPre(true);
                          setTimeout(() => setCopiedPre(false), 2000);
                        }}
                        className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold uppercase tracking-wider shrink-0 ml-2 flex items-center gap-1"
                      >
                        {copiedPre ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedPre ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                </li>
              </ol>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={handleGoogleSignIn}
                className="flex-1 h-12 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition-all active:scale-95 text-center text-sm"
              >
                Try Sign In Again
              </button>
              <button 
                onClick={() => setShowDomainError(false)}
                className="px-5 h-12 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all active:scale-95 text-sm"
              >
                Go Back
              </button>
            </div>
          </div>
        ) : (
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
              onClick={handleGoogleSignIn}
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
        )}
      </div>
    );
  }

  return <>{children}</>;
}
