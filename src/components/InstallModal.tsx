import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { X, Download, Share2, Home, Monitor, Menu, ArrowLeft, Smartphone, Globe, Check, ChevronRight } from 'lucide-react';
import gsap from 'gsap';

type Platform = 'ios' | 'android' | 'desktop' | 'unknown';

function detectPlatform(): Platform {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  if (/windows|mac/.test(ua)) return 'desktop';
  return 'unknown';
}

interface InstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
  isInstallable: boolean;
}

const steps: Record<Platform, { icon: any; title: string; desc: string }[]> = {
  ios: [
    { icon: Globe, title: 'Open Safari', desc: 'Launch Safari browser (Chrome and other browsers do not support PWA installation on iOS).' },
    { icon: Share2, title: 'Tap the Share button', desc: 'Located at the bottom of the screen — a square with an upward arrow.' },
    { icon: Home, title: 'Scroll down & tap Add to Home Screen', desc: 'In the share sheet, scroll down past the app icons and select "Add to Home Screen".' },
    { icon: Check, title: 'Tap Add', desc: 'In the top-right corner of the confirmation dialog, tap "Add". RallyUp will appear on your home screen.' },
  ],
  android: [
    { icon: Globe, title: 'Open Chrome', desc: 'Launch the Chrome browser on your Android device.' },
    { icon: Menu, title: 'Tap the menu icon', desc: 'Three vertical dots in the top-right corner of the browser.' },
    { icon: Download, title: 'Tap Install App', desc: 'In the menu, select "Install app" or "Add to Home screen".' },
    { icon: Check, title: 'Confirm installation', desc: 'Tap "Install" in the pop-up dialog. RallyUp will be added to your home screen.' },
  ],
  desktop: [
    { icon: Globe, title: 'Open Chrome or Edge', desc: 'Use Chrome, Edge, or any Chromium-based browser.' },
    { icon: Monitor, title: 'Find the Install icon', desc: 'Look in the right side of the address bar for a monitor icon with a downward arrow.' },
    { icon: Download, title: 'Click Install', desc: 'Click the install icon in the address bar.' },
    { icon: Check, title: 'Confirm in the dialog', desc: 'Click "Install" in the pop-up dialog. RallyUp will open as a standalone app window.' },
  ],
  unknown: [
    { icon: Globe, title: 'Open your browser', desc: 'Use Chrome, Edge, or Safari.' },
    { icon: Download, title: 'Look for install option', desc: 'Check the address bar for an install icon or the browser menu for "Install app".' },
    { icon: Check, title: 'Follow the prompts', desc: 'Confirm the installation when prompted by your browser.' },
  ],
};

export default function InstallModal({ isOpen, onClose, deferredPrompt, isInstallable }: InstallModalProps) {
  const platform = detectPlatform();
  const cardRef = useRef<HTMLDivElement>(null);
  const [showDetailed, setShowDetailed] = useState(false);

  useEffect(() => {
    if (isOpen && cardRef.current) {
      gsap.fromTo(cardRef.current, 
        { y: 40, opacity: 0, scale: 0.96 },
        { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.7)' }
      );
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) setShowDetailed(false);
  }, [isOpen]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') onClose();
  };

  const handleClose = () => {
    if (cardRef.current) {
      gsap.to(cardRef.current, {
        y: 40, opacity: 0, scale: 0.96, duration: 0.3, ease: 'power2.in',
        onComplete: onClose,
      });
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={handleClose}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
      />
      <div
        ref={cardRef}
        className="relative bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500" />

        {showDetailed ? (
          /* ─── DETAILED GUIDE VIEW ─── */
          <div className="p-6 pt-8 flex flex-col">
            <button
              onClick={() => setShowDetailed(false)}
              className="self-start flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" /> Back to quick guide
            </button>
            <h2 className="text-xl font-black text-white mb-1">Step-by-Step Guide</h2>
            <p className="text-xs text-slate-500 mb-6">
              {platform === 'ios' ? 'Installing on iOS (Safari)' : platform === 'android' ? 'Installing on Android (Chrome)' : 'Installing on Desktop (Chrome/Edge)'}
            </p>
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1 custom-scrollbar">
              {(steps[platform] || steps.unknown).map((step, i) => {
                const Icon = step.icon;
                return (
                  <div key={i} className="flex gap-4 items-start bg-slate-950/50 border border-slate-800 rounded-2xl p-4">
                    <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-4.5 h-4.5 text-red-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="w-5 h-5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-black flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <p className="text-sm font-bold text-white">{step.title}</p>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed pl-7">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              onClick={handleClose}
              className="mt-6 text-sm text-slate-500 hover:text-slate-300 font-medium transition-colors"
            >
              Got it
            </button>
          </div>
        ) : (
          /* ─── QUICK GUIDE VIEW ─── */
          <div className="p-6 pt-8 flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mb-4">
              <Download className="w-7 h-7 text-red-400" />
            </div>

            <h2 className="text-2xl font-black text-white mb-2">Install RallyUp</h2>
            <p className="text-slate-400 text-sm mb-6 max-w-xs">
              Get the best experience with offline access, faster load times, and a dedicated app.
            </p>

            <button
              onClick={handleClose}
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {isInstallable && deferredPrompt ? (
              <button
                onClick={handleInstall}
                className="w-full h-14 bg-red-500 hover:bg-red-400 text-[#ffffff] font-black rounded-2xl transition-all shadow-lg shadow-red-500/20 active:scale-[0.98] flex items-center justify-center gap-3 text-lg"
              >
                <Download className="w-5 h-5" />
                Install Now
              </button>
            ) : platform === 'ios' ? (
              <div className="w-full space-y-4">
                <div className="flex items-center gap-4 bg-slate-950/50 border border-slate-800 rounded-2xl p-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                    <Share2 className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-white">Tap Share</p>
                    <p className="text-xs text-slate-400">in the Safari toolbar</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 bg-slate-950/50 border border-slate-800 rounded-2xl p-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <Home className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-white">Add to Home Screen</p>
                    <p className="text-xs text-slate-400">Scroll down and tap</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  You must use Safari browser on iOS to install PWAs.
                </p>
              </div>
            ) : platform === 'android' ? (
              <div className="w-full space-y-4">
                <div className="flex items-center gap-4 bg-slate-950/50 border border-slate-800 rounded-2xl p-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">
                    <span className="text-lg font-black text-slate-400">&#8942;</span>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-white">Tap the menu</p>
                    <p className="text-xs text-slate-400">3 dots in the top-right corner</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 bg-slate-950/50 border border-slate-800 rounded-2xl p-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <Download className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-white">Install App</p>
                    <p className="text-xs text-slate-400">or Add to Home screen</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full space-y-4">
                <div className="flex items-center gap-4 bg-slate-950/50 border border-slate-800 rounded-2xl p-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">
                    <Monitor className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-white">Look in the address bar</p>
                    <p className="text-xs text-slate-400">for the Install icon <Monitor className="w-3 h-3 inline-block text-slate-500" /></p>
                  </div>
                </div>
                <div className="flex items-center gap-4 bg-slate-950/50 border border-slate-800 rounded-2xl p-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <Download className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-white">Click Install</p>
                    <p className="text-xs text-slate-400">then confirm in the pop-up dialog</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Works in Chrome, Edge, or any Chromium-based browser.
                </p>
              </div>
            )}

            <button
              onClick={() => setShowDetailed(true)}
              className="mt-4 text-sm text-red-400 hover:text-red-300 font-medium transition-colors flex items-center gap-1"
            >
              View detailed guide <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleClose}
              className="mt-3 text-sm text-slate-500 hover:text-slate-300 font-medium transition-colors"
            >
              Maybe later
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
