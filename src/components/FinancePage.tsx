import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { useAuth } from '../contexts/AuthContext';
import { Coins, Check, Receipt, CreditCard, Sparkles, Save, ShieldAlert, ArrowUpRight } from 'lucide-react';
import { FinancialConfig } from '../types';

export default function FinancePage() {
  const { user } = useAuth();
  const { 
    players, 
    courts, 
    matches, 
    financialConfig, 
    updateFinancialConfig, 
    togglePlayerPaid 
  } = useAppStore();

  const [config, setConfig] = useState<FinancialConfig>(financialConfig);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setConfig(financialConfig);
  }, [financialConfig]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (user) {
      updateFinancialConfig(user.uid, config);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  // Financial calculations
  const totalShuttlesUsed = matches.reduce((acc, m) => acc + (m.shuttlecocksUsed || 0), 0);
  const totalMatchesCount = matches.length;
  
  // Let's assume court fee is billed per court configured
  // For safety, we can define total court cost as number of active matches * courtFee, or a general estimation
  const totalCourtCosts = totalMatchesCount * (config.courtFee || 0);
  const totalShuttleCosts = totalShuttlesUsed * (config.shuttleFee || 0);
  const totalSessionCost = config.mode === 'Fixed' 
    ? players.length * (config.fixedRate || 0)
    : totalCourtCosts + totalShuttleCosts;

  const totalCollected = config.mode === 'Fixed'
    ? players.filter(p => p.hasPaid).length * (config.fixedRate || 0)
    : players.filter(p => p.hasPaid).reduce((acc, p) => acc + (players.length > 0 ? totalSessionCost / players.length : 0), 0);

  const pendingCollection = totalSessionCost - totalCollected;

  const getIndividualCost = () => {
    if (config.mode === 'Fixed') {
      return config.fixedRate || 0;
    }
    if (players.length === 0) return 0;
    return totalSessionCost / players.length;
  };

  return (
    <div className="flex-1 bg-slate-950 p-4 md:p-8 overflow-y-auto relative flex flex-col h-full font-sans text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.05),transparent_70%)] z-0 pointer-events-none" />

      <div className="relative z-10 max-w-5xl w-full mx-auto flex-1 flex flex-col gap-6">
        
        {/* Header Title */}
        <div className="shrink-0">
          <div className="flex items-center gap-2 mb-1">
            <Coins className="w-5 h-5 text-emerald-400" />
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Queue Master Finance Command</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter text-white">Finance & Billing</h1>
        </div>

        {/* Top billing cards stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Total Session Cost</span>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-black text-white font-mono">₱{totalSessionCost.toFixed(2)}</span>
            </div>
            <span className="text-[9px] text-slate-400 mt-1">Based on {totalMatchesCount} matches & {totalShuttlesUsed} shuttles</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Cost Per Player</span>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-black text-teal-400 font-mono">₱{getIndividualCost().toFixed(2)}</span>
            </div>
            <span className="text-[9px] text-slate-400 mt-1">Split evenly across {players.length} players</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Total Collected</span>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-black text-emerald-400 font-mono">₱{totalCollected.toFixed(2)}</span>
            </div>
            <span className="text-[9px] text-slate-400 mt-1">{players.filter(p => p.hasPaid).length} of {players.length} players paid</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Remaining Balances</span>
            <div className="mt-2 flex items-baseline gap-1">
              <span className={`text-3xl font-black font-mono ${pendingCollection > 0 ? 'text-amber-500' : 'text-slate-400'}`}>
                ₱{pendingCollection.toFixed(2)}
              </span>
            </div>
            <span className="text-[9px] text-slate-400 mt-1">Pending payments in current session</span>
          </div>
        </div>

        {/* Split Section: Inputs vs Ledger */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1 min-h-0">
          
          {/* Configurator Form */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 lg:col-span-5 flex flex-col gap-6">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-white uppercase tracking-tight text-sm">Pricing Calculator</h3>
            </div>

            <form onSubmit={handleSave} className="flex flex-col gap-6">
              {/* Financial Mode Selector */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5 block">Financial Mode</label>
                <div className="flex gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, mode: 'Breakdown' })}
                    className={`flex-1 h-11 rounded-lg text-xs font-bold transition-all uppercase ${
                      config.mode === 'Breakdown' 
                        ? 'bg-slate-850 text-white shadow border border-slate-700/60' 
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Breakdown
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, mode: 'Fixed' })}
                    className={`flex-1 h-11 rounded-lg text-xs font-bold transition-all uppercase ${
                      config.mode === 'Fixed' 
                        ? 'bg-slate-850 text-white shadow border border-slate-700/60' 
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Fixed Rate
                  </button>
                </div>
              </div>

              {/* Dynamic Inputs depending on selected mode */}
              <div className="space-y-4">
                {config.mode === 'Breakdown' ? (
                  <>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Court Fee (Total per match)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₱</span>
                        <input 
                          type="number" 
                          value={config.courtFee || ''}
                          onChange={(e) => setConfig({ ...config, courtFee: parseFloat(e.target.value) || 0 })}
                          className="w-full h-12 bg-slate-950 border border-slate-800 text-white text-sm rounded-xl focus:ring-emerald-500 focus:border-emerald-500 block pl-9 pr-4 outline-none transition-colors"
                          placeholder="Rate per match"
                          min="0" step="0.01"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Shuttlecock Fee (Each)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₱</span>
                        <input 
                          type="number" 
                          value={config.shuttleFee || ''}
                          onChange={(e) => setConfig({ ...config, shuttleFee: parseFloat(e.target.value) || 0 })}
                          className="w-full h-12 bg-slate-950 border border-slate-800 text-white text-sm rounded-xl focus:ring-emerald-500 focus:border-emerald-500 block pl-9 pr-4 outline-none transition-colors"
                          placeholder="Price per shuttle"
                          min="0" step="0.01"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Fixed Rate (Per Player)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₱</span>
                      <input 
                        type="number" 
                        value={config.fixedRate || ''}
                        onChange={(e) => setConfig({ ...config, fixedRate: parseFloat(e.target.value) || 0 })}
                        className="w-full h-12 bg-slate-950 border border-slate-800 text-white text-sm rounded-xl focus:ring-emerald-500 focus:border-emerald-500 block pl-9 pr-4 outline-none transition-colors"
                        placeholder="Fixed session price"
                        min="0" step="0.01"
                      />
                    </div>
                  </div>
                )}
              </div>

              <button 
                type="submit" 
                className={`h-12 w-full font-black text-xs uppercase rounded-xl transition-all shadow-md flex items-center justify-center gap-2 ${
                  saveSuccess 
                    ? 'bg-teal-500 text-slate-950 shadow-teal-500/10' 
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/10 active:scale-[0.98]'
                }`}
              >
                {saveSuccess ? (
                  <>
                    <Check className="w-4.5 h-4.5" />
                    PRICING RATES UPDATED!
                  </>
                ) : (
                  <>
                    <Save className="w-4.5 h-4.5" />
                    SAVE PRICING SETTINGS
                  </>
                )}
              </button>
            </form>

            <div className="border-t border-slate-800/80 pt-4 mt-2">
              <div className="flex gap-2.5 items-start text-xs text-slate-400 bg-slate-950/30 p-3 rounded-2xl border border-slate-850">
                <ShieldAlert className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Calculations are fully real-time. Any changes to match count, shuttlecocks used, or roster size will automatically re-calculate the session ledgers.
                </p>
              </div>
            </div>
          </div>

          {/* Session Player Billing Ledger */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 lg:col-span-7 flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white uppercase tracking-tight text-sm">Player Ledger</h3>
              </div>
              <span className="text-[10px] bg-slate-950 border border-slate-800 text-slate-400 font-bold uppercase px-2.5 py-1 rounded-lg">
                {players.length} Registered
              </span>
            </div>

            {players.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-950/20 rounded-2xl border border-slate-850">
                <Receipt className="w-10 h-10 text-slate-600 mb-2" />
                <h4 className="text-white font-bold text-sm mb-1">Roster is empty</h4>
                <p className="text-slate-500 text-xs max-w-sm">
                  Add players to the session roster in your main dashboard sidebar to start tracking billing.
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto pr-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/50 text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                      <th className="py-2.5 px-3">Player</th>
                      <th className="py-2.5 px-3 text-center">Games</th>
                      <th className="py-2.5 px-3 text-right">Individual Share</th>
                      <th className="py-2.5 px-3 text-right">Payment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/20">
                    {players.map((p, index) => {
                      const share = getIndividualCost();
                      return (
                        <tr key={`${p.id}-${index}`} className="hover:bg-slate-850/20 transition-colors">
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[9px] font-bold uppercase shrink-0">
                                {p.name.substring(0, 2)}
                              </div>
                              <span className="font-bold text-xs text-slate-200 truncate max-w-[120px]">{p.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-xs text-slate-400">
                            {p.stats?.gamesPlayed || 0}
                          </td>
                          <td className="py-3 px-3 font-mono text-xs text-right text-teal-400 font-bold">
                            ₱{share.toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => {
                                if (user) togglePlayerPaid(user.uid, p.id);
                              }}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all flex items-center gap-1.5 ml-auto border ${
                                p.hasPaid 
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                                  : 'bg-slate-950 hover:bg-slate-800 text-slate-500 border-slate-800'
                              }`}
                            >
                              <Check className={`w-3.5 h-3.5 ${p.hasPaid ? 'stroke-[3]' : 'opacity-30'}`} />
                              <span>{p.hasPaid ? 'Paid' : 'Unpaid'}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
