import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, ArrowRight, Activity, MapPin, Award, Users, ChevronRight, Zap, Shield, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import InstallModal from './InstallModal';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

type PageState = 'home' | 'about' | 'how-it-works' | 'rankings';

export default function LandingPage() {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [activePage, setActivePage] = useState<PageState>('home');
  const [showInstallModal, setShowInstallModal] = useState(false);
  const logoRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if first time user to show modal
    const hasVisited = localStorage.getItem('rallyup_has_visited');
    if (!hasVisited) {
      const timer = setTimeout(() => {
        setShowInstallModal(true);
        localStorage.setItem('rallyup_has_visited', 'true');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    if (logoRef.current) {
      gsap.to(logoRef.current, {
        y: -6, duration: 2, ease: 'sine.inOut', yoyo: true, repeat: -1,
      });
    }
  }, []);

  useEffect(() => {
    if (chartRef.current) {
      const bars = chartRef.current.querySelectorAll('.stat-bar');
      gsap.fromTo(bars,
        { height: '0%' },
        {
          height: (i) => `${[40, 70, 45, 90, 65, 85, 100][i]}%`,
          duration: 1.2, stagger: 0.08, ease: 'back.out(1)',
          scrollTrigger: { trigger: chartRef.current, start: 'top 85%' },
        }
      );
    }
  }, [activePage]);

  useEffect(() => {
    if (counterRef.current) {
      const counters = counterRef.current.querySelectorAll('.num-counter');
      const targets = [68, 124, 12, 3400];
      counters.forEach((el, i) => {
        const target = targets[i] || 0;
        const val = { n: 0 };
        gsap.to(val, {
          n: target,
          duration: 2,
          ease: 'power2.out',
          scrollTrigger: { trigger: counterRef.current, start: 'top 85%' },
          onUpdate: () => {
            el.textContent = Math.round(val.n);
          },
        });
      });
    }
  }, [activePage]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') return;
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
    setShowInstallModal(true);
  };



  const renderContent = () => {
    switch (activePage) {
      case 'about':
        return (
          <div className="max-w-4xl mx-auto px-4 py-24 text-center">
            <h1 className="text-5xl font-black mb-8">About RallyUp</h1>
            <p className="text-xl text-slate-400 leading-relaxed mb-8">
              RallyUp was born out of the chaos of local badminton club nights. We saw organizers 
              struggling with paper queues, players waiting for hours for mismatched games, and 
              communities disconnected. We built RallyUp to bring order to the courts, connect players, 
              and make every match count.
            </p>
            <button onClick={() => setActivePage('home')} className="text-red-500 hover:text-red-400 font-bold">
              &larr; Back to Home
            </button>
          </div>
        );
      case 'how-it-works':
        return (
          <div className="max-w-4xl mx-auto px-4 py-24">
            <h1 className="text-5xl font-black mb-12 text-center">How It Works</h1>
            <div className="space-y-12">
              <div className="flex gap-6 items-start">
                <div className="w-12 h-12 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center font-black text-xl shrink-0">1</div>
                <div>
                  <h3 className="text-2xl font-bold mb-2">Join a Session</h3>
                  <p className="text-slate-400">Find active club sessions nearby or join your home club's event. Check in digitally—no more shouting your name to the organizer.</p>
                </div>
              </div>
              <div className="flex gap-6 items-start">
                <div className="w-12 h-12 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center font-black text-xl shrink-0">2</div>
                <div>
                  <h3 className="text-2xl font-bold mb-2">Enter the Queue</h3>
                  <p className="text-slate-400">The smart queue system pairs you with players of similar skill levels. You'll get notified when your court is ready.</p>
                </div>
              </div>
              <div className="flex gap-6 items-start">
                <div className="w-12 h-12 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center font-black text-xl shrink-0">3</div>
                <div>
                  <h3 className="text-2xl font-bold mb-2">Play and Record</h3>
                  <p className="text-slate-400">Play your match and log the results. Watch your stats grow and climb the local leaderboards.</p>
                </div>
              </div>
            </div>
            <div className="mt-12 text-center">
              <button onClick={() => setActivePage('home')} className="text-red-500 hover:text-red-400 font-bold">
                &larr; Back to Home
              </button>
            </div>
          </div>
        );
      case 'rankings':
        return (
          <div className="max-w-4xl mx-auto px-4 py-24 text-center">
            <h1 className="text-5xl font-black mb-8">Global Rankings</h1>
            <p className="text-xl text-slate-400 leading-relaxed mb-8">
              Rankings are calculated based on your match history, win rate, and the skill level of your opponents.
              Sign in to see your current standing and local club leaderboards!
            </p>
            <button onClick={navigate('/signin')} className="px-8 py-3 bg-red-500 hover:bg-red-400 text-[#ffffff] font-bold rounded-xl mb-8">
              Sign In to View Rankings
            </button>
            <div>
              <button onClick={() => setActivePage('home')} className="text-slate-500 hover:text-white font-bold transition-colors">
                &larr; Back to Home
              </button>
            </div>
          </div>
        );
      case 'home':
      default:
        return (
          <>
            {/* Hero Section */}
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 flex flex-col items-center">
              <div className="flex flex-col items-center text-center mt-12 mb-16 max-w-3xl">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 mb-6"
                  ref={logoRef}
                >
                  <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/20">
                    <svg className="w-7 h-7 text-[#ffffff]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </div>
                  <span className="text-3xl font-black italic tracking-tighter text-white uppercase">RallyUp</span>
                </motion.div>
                
                <motion.h1 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-5xl md:text-7xl font-black tracking-tight text-white mb-6 leading-tight"
                >
                  Never Miss a <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">Match</span>
                </motion.h1>
                
                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl leading-relaxed"
                >
                  The ultimate badminton community platform. Track your games, manage queues seamlessly, and connect with players of your skill tier.
                </motion.p>
                
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
                >
                <button 
                  onClick={navigate('/signin')}
                  className="px-8 py-4 bg-red-500 hover:bg-red-400 text-[#ffffff] font-bold rounded-2xl transition-all active:scale-[0.98] shadow-xl shadow-red-500/20 flex items-center justify-center gap-2 text-lg"
                >
                  Open App <ArrowRight className="w-5 h-5" />
                </button>
                  
                  <button 
                    onClick={handleInstallClick}
                    className="px-8 py-4 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white font-bold rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-lg shadow-xl"
                  >
                    <Download className="w-5 h-5" /> Install App
                  </button>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="mt-8 flex items-center justify-center gap-6 text-xs text-slate-500 font-mono"
                >
                  <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> No account required</span>
                  <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Free to use</span>
                </motion.div>
              </div>

              {/* Feature Grid */}
              <motion.div 
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl mb-32"
              >
                <motion.div whileHover={{ y: -4 }} className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 backdrop-blur-sm transition-shadow duration-300 hover:shadow-xl hover:shadow-emerald-500/5">
                  <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6 border border-emerald-500/20">
                    <Activity className="w-6 h-6 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">Live Queues</h3>
                  <p className="text-slate-400 leading-relaxed">
                    Real-time court management. See exactly who's playing, who's next, and estimated wait times.
                  </p>
                </motion.div>

                <motion.div whileHover={{ y: -4 }} className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 backdrop-blur-sm transition-shadow duration-300 hover:shadow-xl hover:shadow-blue-500/5">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/20">
                    <Users className="w-6 h-6 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">Skill Matching</h3>
                  <p className="text-slate-400 leading-relaxed">
                    Find players at your level. From beginners to advanced, enjoy competitive and balanced games.
                  </p>
                </motion.div>

                <motion.div whileHover={{ y: -4 }} className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 backdrop-blur-sm transition-shadow duration-300 hover:shadow-xl hover:shadow-purple-500/5">
                  <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-6 border border-purple-500/20">
                    <MapPin className="w-6 h-6 text-purple-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">Local Clubs</h3>
                  <p className="text-slate-400 leading-relaxed">
                    Discover and join badminton communities in your area. Participate in regular club sessions.
                  </p>
                </motion.div>
              </motion.div>

              {/* Find Your Tribe Section */}
              <div className="w-full max-w-5xl mb-32 flex flex-col md:flex-row items-center gap-12">
                <div className="flex-1">
                  <h2 className="text-4xl md:text-5xl font-black mb-6">Find your tribe. <br/><span className="text-red-500">Run your club.</span></h2>
                  <p className="text-lg text-slate-400 mb-6 leading-relaxed">
                    Whether you're a casual player looking for weekend hits, or a club organizer trying to manage 50 people across 4 courts, RallyUp gives you the tools to make it seamless.
                  </p>
                  <ul className="space-y-4">
                    <li className="flex items-center gap-3 text-slate-300">
                      <CheckCircle2 className="w-5 h-5 text-red-500" /> Digital check-ins and member tracking
                    </li>
                    <li className="flex items-center gap-3 text-slate-300">
                      <CheckCircle2 className="w-5 h-5 text-red-500" /> Instant broadcasts to club members
                    </li>
                    <li className="flex items-center gap-3 text-slate-300">
                      <CheckCircle2 className="w-5 h-5 text-red-500" /> Automated skill-based matchmaking
                    </li>
                  </ul>
                </div>
                <div className="flex-1 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-orange-500"></div>
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-950 border border-slate-800/50">
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold">
                          {String.fromCharCode(64 + i)}
                        </div>
                        <div className="flex-1">
                          <div className="h-4 w-24 bg-slate-800 rounded mb-2"></div>
                          <div className="h-3 w-16 bg-slate-800/50 rounded"></div>
                        </div>
                        <div className="px-3 py-1 text-xs font-bold bg-green-500/10 text-green-400 rounded-full">
                          Court {i}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Match Tracking Section */}
              <div className="w-full max-w-5xl mb-32 flex flex-col md:flex-row-reverse items-center gap-12">
                <div className="flex-1">
                  <h2 className="text-4xl md:text-5xl font-black mb-6">Every match, <br/><span className="text-red-500">on the record.</span></h2>
                  <p className="text-lg text-slate-400 mb-6 leading-relaxed">
                    Stop arguing over who won last week. RallyUp tracks your head-to-head records, win streaks, and overall performance. Watch your stats evolve as you play.
                  </p>
                  <button onClick={() => setActivePage('rankings')} className="text-red-500 hover:text-red-400 font-bold flex items-center gap-2">
                    View Global Rankings <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div ref={counterRef} className="flex-1 bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
                  <div className="flex justify-between items-end mb-8">
                    <div>
                      <div className="text-sm text-slate-500 font-bold uppercase tracking-wider mb-1">Win Rate</div>
                      <div className="text-4xl font-black text-white"><span className="num-counter">0</span>%</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-slate-500 font-bold uppercase tracking-wider mb-1">Matches</div>
                      <div className="text-4xl font-black text-white"><span className="num-counter">0</span></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800">
                      <div className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Active Clubs</div>
                      <div className="text-3xl font-black text-white"><span className="num-counter">0</span>+</div>
                    </div>
                    <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800">
                      <div className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Matches Tracked</div>
                      <div className="text-3xl font-black text-white"><span className="num-counter">0</span>+</div>
                    </div>
                  </div>
                  <div ref={chartRef} className="flex items-end gap-2 h-32 border-b border-slate-800 pb-1">
                    {[40, 70, 45, 90, 65, 85, 100].map((h, i) => (
                      <div key={i} className="flex-1 bg-red-500/20 rounded-t-sm relative group">
                        <div 
                          className="stat-bar absolute bottom-0 left-0 w-full bg-gradient-to-t from-red-500 to-orange-500 rounded-t-sm transition-all duration-500" 
                          style={{ height: '0%' }}
                        />
                        <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] text-slate-500 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i]}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Organizer Section */}
              <div className="w-full max-w-5xl mb-32 text-center bg-slate-900/50 border border-slate-800 rounded-3xl p-12 backdrop-blur-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <Zap className="w-32 h-32 text-red-500" />
                </div>
                <h2 className="text-4xl md:text-5xl font-black mb-6 relative z-10">Run a chaotic club night <br/><span className="text-red-500">like clockwork.</span></h2>
                <p className="text-lg text-slate-400 mb-8 max-w-2xl mx-auto relative z-10">
                  Are you a club organizer? Stop managing spreadsheets and whiteboards. Let RallyUp handle the queue, track payments, and organize fair matches so you can actually enjoy playing.
                </p>
                <button onClick={navigate('/signin')} className="px-8 py-4 bg-white text-slate-950 hover:bg-slate-200 font-bold rounded-2xl transition-all relative z-10">
                  Start Your Club
                </button>
              </div>

              {/* Testimonials */}
              <div className="w-full max-w-5xl mb-32">
                <h2 className="text-3xl font-black text-center mb-12">What clubs & players are saying</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <motion.div whileHover={{ y: -4 }} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl transition-shadow hover:shadow-xl hover:shadow-red-500/5">
                    <div className="flex text-yellow-500 mb-4">
                      {[1,2,3,4,5].map(i => <svg key={i} className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>)}
                    </div>
                    <p className="text-slate-300 mb-4">"RallyUp completely transformed how we run our Wednesday night sessions. What used to be 2 hours of me shouting names is now fully automated."</p>
                    <p className="font-bold text-[#ffffff]">— David L., Club Organizer</p>
                  </motion.div>
                  <motion.div whileHover={{ y: -4 }} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl transition-shadow hover:shadow-xl hover:shadow-red-500/5">
                    <div className="flex text-yellow-500 mb-4">
                      {[1,2,3,4,5].map(i => <svg key={i} className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>)}
                    </div>
                    <p className="text-slate-300 mb-4">"Finally I can see how long the wait is before I leave my house. The skill matching is incredibly accurate too."</p>
                    <p className="font-bold text-white">— Sarah T., Intermediate Player</p>
                  </motion.div>
                  <motion.div whileHover={{ y: -4 }} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl transition-shadow hover:shadow-xl hover:shadow-red-500/5">
                    <div className="flex text-yellow-500 mb-4">
                      {[1,2,3,4,5].map(i => <svg key={i} className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>)}
                    </div>
                    <p className="text-slate-300 mb-4">"I went from dreading queue management to actually enjoying club nights. The auto-matchmaker is a lifesaver for our 40-person sessions."</p>
                    <p className="font-bold text-white">— Mike R., Session Organizer</p>
                  </motion.div>
                </div>
              </div>

              {/* Bottom CTA */}
              <div className="w-full text-center mb-24">
                <h2 className="text-5xl font-black mb-8">Ready when you are. <br/>Show up. Get a fair game.</h2>
                <button 
                  onClick={navigate('/signin')}
                  className="px-10 py-5 bg-red-500 hover:bg-red-400 text-[#ffffff] font-bold rounded-2xl transition-all shadow-xl shadow-red-500/20 text-xl"
                >
                  Join RallyUp Now
                </button>
              </div>

            </div>
          </>
        );
    }
  };

  return (
    <div className="h-full overflow-y-auto w-full bg-slate-950 text-slate-100 font-sans overflow-x-hidden selection:bg-red-500/30 custom-scrollbar flex flex-col">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(239,68,68,0.1),transparent_50%)] z-0 pointer-events-none fixed"></div>
      
      {/* Header NavBar */}
      <div className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActivePage('home')}>
            <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-[#ffffff]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </div>
            <span className="font-black italic tracking-tighter text-white uppercase">RallyUp</span>
          </div>
          
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
            <button onClick={() => setActivePage('how-it-works')} className="hover:text-white transition-colors">How it works</button>
            <button onClick={() => setActivePage('rankings')} className="hover:text-white transition-colors">Rankings</button>
            <button onClick={() => setActivePage('about')} className="hover:text-white transition-colors">About</button>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 mr-2">
              <span>Install ShuttleFlow on your device</span>
              <button 
                onClick={() => setShowInstallModal(true)}
                className="text-red-500 hover:text-red-400 font-bold underline"
              >
                Click Here
              </button>
            </div>
            <button 
              onClick={navigate('/signin')}
              className="px-4 py-2 text-sm font-bold bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition-all text-white"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
      
      <InstallModal isOpen={showInstallModal} onClose={() => setShowInstallModal(false)} deferredPrompt={deferredPrompt} isInstallable={isInstallable} />
      
      {/* Sticky Install Banner for mobile */}
      <AnimatePresence>
        {!showInstallModal && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 px-4 py-3 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 bg-red-500 rounded-xl flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-[#ffffff]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">Install RallyUp</p>
                <p className="text-[10px] text-slate-400 truncate">Get the app for the best experience</p>
              </div>
            </div>
            <button
              onClick={handleInstallClick}
              className="px-5 py-2.5 bg-red-500 hover:bg-red-400 text-[#ffffff] font-bold rounded-xl text-sm shrink-0 transition-all active:scale-95"
            >
              Install
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="flex-1 w-full relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={activePage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Global Footer */}
      <footer className="w-full bg-slate-950 border-t border-slate-800 py-12 relative z-10 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#ffffff]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </div>
                <span className="font-black italic tracking-tighter text-white uppercase">RallyUp</span>
              </div>
              <p className="text-slate-500 max-w-sm mb-6">
                The modern operating system for badminton clubs, recreational queues, and skill-based matchmaking.
              </p>
            </div>
            
            <div>
              <h4 className="font-bold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><button onClick={() => setActivePage('how-it-works')} className="hover:text-white transition-colors">How it works</button></li>
                <li><button onClick={() => setActivePage('rankings')} className="hover:text-white transition-colors">Rankings</button></li>
                <li><button className="hover:text-white transition-colors cursor-not-allowed">What's new</button></li>
                <li><button onClick={navigate('/signin')} className="hover:text-white transition-colors">Open app</button></li>
                <li><button onClick={() => setActivePage('about')} className="hover:text-white transition-colors">About</button></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold text-white mb-4">Contact</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><a href="mailto:hello@rallyup.app" className="hover:text-white transition-colors">Email</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Facebook</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Twitter</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono text-slate-600">
            <div>MADE FOR THE COURTS. V2.0.0.</div>
            <div>© {new Date().getFullYear()} RallyUp. Made with love by <a href="https://rimsportfolio.vercel.app/" target="_blank" rel="noopener noreferrer" className="text-red-500 hover:text-red-400 transition-colors">Rims Bigata</a>.</div>
          </div>
        </div>
      </footer>

    </div>
  );
}

