import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { X, Download, Share2, Home } from 'lucide-react';
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

export default function InstallModal({ isOpen, onClose, deferredPrompt, isInstallable }: InstallModalProps) {
  const platform = detectPlatform();
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && cardRef.current) {
      gsap.fromTo(cardRef.current, 
        { y: 40, opacity: 0, scale: 0.96 },
        { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.7)' }
      );
    }
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
              className="w-full h-14 bg-red-500 hover:bg-red-400 text-white font-black rounded-2xl transition-all shadow-lg shadow-red-500/20 active:scale-[0.98] flex items-center justify-center gap-3 text-lg"
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
                  <span className="text-lg font-black text-slate-400">&#x2395;</span>
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-white">Install icon</p>
                  <p className="text-xs text-slate-400">in the address bar</p>
                </div>
              </div>
              <div className="flex items-center gap-4 bg-slate-950/50 border border-slate-800 rounded-2xl p-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <Download className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-white">Click Install</p>
                  <p className="text-xs text-slate-400">to confirm</p>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleClose}
            className="mt-6 text-sm text-slate-500 hover:text-slate-300 font-medium transition-colors"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
