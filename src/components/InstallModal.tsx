import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Smartphone, Monitor, Download, Apple } from 'lucide-react';

export default function InstallModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'ios' | 'android' | 'desktop'>('ios');

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-2xl font-black text-white flex items-center gap-2">
              <Download className="w-6 h-6 text-red-500" />
              Install RallyUp
            </h2>
            <button 
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6">
            <p className="text-slate-400 mb-6">Install RallyUp on your device for the best experience, faster load times, and offline access.</p>

            <div className="flex bg-slate-950 p-1 rounded-xl mb-6">
              <button
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'ios' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                onClick={() => setActiveTab('ios')}
              >
                <Apple className="w-4 h-4" /> iOS
              </button>
              <button
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'android' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                onClick={() => setActiveTab('android')}
              >
                <Smartphone className="w-4 h-4" /> Android
              </button>
              <button
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'desktop' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                onClick={() => setActiveTab('desktop')}
              >
                <Monitor className="w-4 h-4" /> Desktop
              </button>
            </div>

            <div className="space-y-4">
              {activeTab === 'ios' && (
                <div className="text-slate-300 space-y-4">
                  <div className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-red-500 shrink-0">1</div>
                    <p>Open Safari and navigate to RallyUp.</p>
                  </div>
                  <div className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-red-500 shrink-0">2</div>
                    <p>Tap the <strong>Share</strong> button at the bottom of the screen.</p>
                  </div>
                  <div className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-red-500 shrink-0">3</div>
                    <p>Scroll down and tap <strong>Add to Home Screen</strong>.</p>
                  </div>
                </div>
              )}
              {activeTab === 'android' && (
                <div className="text-slate-300 space-y-4">
                  <div className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-red-500 shrink-0">1</div>
                    <p>Open Chrome and navigate to RallyUp.</p>
                  </div>
                  <div className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-red-500 shrink-0">2</div>
                    <p>Tap the <strong>menu icon</strong> (3 dots in upper right-hand corner).</p>
                  </div>
                  <div className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-red-500 shrink-0">3</div>
                    <p>Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.</p>
                  </div>
                </div>
              )}
              {activeTab === 'desktop' && (
                <div className="text-slate-300 space-y-4">
                  <div className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-red-500 shrink-0">1</div>
                    <p>Open Chrome or Edge and navigate to RallyUp.</p>
                  </div>
                  <div className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-red-500 shrink-0">2</div>
                    <p>Click the <strong>Install</strong> icon in the right side of the address bar.</p>
                  </div>
                  <div className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-red-500 shrink-0">3</div>
                    <p>Click <strong>Install</strong> to confirm.</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-8 pt-6 border-t border-slate-800 text-center">
              <button 
                onClick={onClose}
                className="px-6 py-3 bg-red-500 hover:bg-red-400 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-500/20"
              >
                Got it, thanks!
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
