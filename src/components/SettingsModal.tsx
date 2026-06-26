import { useState, useEffect } from 'react';
import { X, Settings, Save } from 'lucide-react';
import { useAppStore } from '../store';
import { useAuth } from '../contexts/AuthContext';
import gsap from 'gsap';
import { FinancialConfig } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { user } = useAuth();
  const { financialConfig, updateFinancialConfig } = useAppStore();
  const [config, setConfig] = useState<FinancialConfig>(financialConfig);

  useEffect(() => {
    setConfig(financialConfig);
  }, [financialConfig, isOpen]);

  useEffect(() => {
    if (isOpen) {
      gsap.fromTo('.settings-modal', 
        { y: 50, opacity: 0, scale: 0.95 },
        { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.5)' }
      );
      gsap.fromTo('.settings-overlay',
        { opacity: 0 },
        { opacity: 1, duration: 0.3 }
      );
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (user) {
      updateFinancialConfig(user.uid, config);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm settings-overlay" onClick={onClose} />
      
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-6 relative z-10 shadow-2xl settings-modal">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
          <X className="w-6 h-6" />
        </button>
        
        <div className="flex items-center gap-3 mb-6">
          <Settings className="w-6 h-6 text-emerald-400" />
          <h2 className="text-xl font-black uppercase italic tracking-tight text-white">System Settings</h2>
        </div>
        
        <form onSubmit={handleSave} className="flex flex-col gap-6">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 block">Financial Mode</label>
            <div className="flex gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setConfig({ ...config, mode: 'Breakdown' })}
                className={`flex-1 h-12 rounded-lg text-sm font-bold transition-all ${
                  config.mode === 'Breakdown' 
                    ? 'bg-slate-800 text-white shadow-sm border border-slate-700' 
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Breakdown
              </button>
              <button
                type="button"
                onClick={() => setConfig({ ...config, mode: 'Fixed' })}
                className={`flex-1 h-12 rounded-lg text-sm font-bold transition-all ${
                  config.mode === 'Fixed' 
                    ? 'bg-slate-800 text-white shadow-sm border border-slate-700' 
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Fixed Rate
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {config.mode === 'Breakdown' ? (
              <>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Court Fee (Total per hr)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">₱</span>
                    <input 
                      type="number" 
                      value={config.courtFee || ''}
                      onChange={(e) => setConfig({ ...config, courtFee: parseFloat(e.target.value) || 0 })}
                      className="w-full h-14 bg-slate-950 border border-slate-700 text-white text-lg rounded-xl focus:ring-emerald-500 focus:border-emerald-500 block pl-10 pr-4 outline-none transition-colors"
                      min="0" step="0.01"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Shuttlecock Fee (Each)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">₱</span>
                    <input 
                      type="number" 
                      value={config.shuttleFee || ''}
                      onChange={(e) => setConfig({ ...config, shuttleFee: parseFloat(e.target.value) || 0 })}
                      className="w-full h-14 bg-slate-950 border border-slate-700 text-white text-lg rounded-xl focus:ring-emerald-500 focus:border-emerald-500 block pl-10 pr-4 outline-none transition-colors"
                      min="0" step="0.01"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Fixed Rate (Per Player)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">₱</span>
                  <input 
                    type="number" 
                    value={config.fixedRate || ''}
                    onChange={(e) => setConfig({ ...config, fixedRate: parseFloat(e.target.value) || 0 })}
                    className="w-full h-14 bg-slate-950 border border-slate-700 text-white text-lg rounded-xl focus:ring-emerald-500 focus:border-emerald-500 block pl-10 pr-4 outline-none transition-colors"
                    min="0" step="0.01"
                  />
                </div>
              </div>
            )}
          </div>

          <button type="submit" className="h-14 w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] active:scale-[0.98] mt-2 flex items-center justify-center gap-2">
            <Save className="w-5 h-5" />
            SAVE SETTINGS
          </button>
        </form>
      </div>
    </div>
  );
}
