import { motion } from 'motion/react';
import { X, Shield } from 'lucide-react';

interface ClubRulesPageProps {
  onClose: () => void;
}

export default function ClubRulesPage({ onClose }: ClubRulesPageProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl"
      >
        <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center">
              <Shield className="w-4 h-4 text-red-400" />
            </div>
            <h2 className="text-lg font-black tracking-tight text-white">Club Rules</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 text-sm text-slate-300 leading-relaxed custom-scrollbar">
          <p>
            These club rules ensure a fair, enjoyable, and organized experience for all RallyUp participants — both players and Queue Masters.
          </p>

          <h3 className="text-white font-bold text-sm mt-6">1. Fair Play</h3>
          <p>
            All players are expected to compete with good sportsmanship. Unsportsmanlike behavior, including but not limited to verbal abuse, cheating, or deliberate disruption of matches, will not be tolerated.
          </p>

          <h3 className="text-white font-bold text-sm mt-6">2. Queue Etiquette</h3>
          <p>
            Players must join the queue only when ready to play. If you are not present when your match is called, you may be moved to the back of the queue or marked as absent. Queue Masters have the discretion to manage queue order in the interest of fairness.
          </p>

          <h3 className="text-white font-bold text-sm mt-6">3. Court Booking</h3>
          <p>
            Courts are allocated on a first-come, first-served basis unless otherwise specified by the Queue Master. Please vacate the court promptly after your match concludes to keep the schedule running smoothly.
          </p>

          <h3 className="text-white font-bold text-sm mt-6">4. Match Reporting</h3>
          <p>
            All match scores must be reported accurately. Inaccurate or fraudulent score reporting may result in penalties, including temporary suspension from the platform.
          </p>

          <h3 className="text-white font-bold text-sm mt-6">5. Payment and Fees</h3>
          <p>
            Where applicable, players are expected to settle court fees, shuttle fees, or fixed session rates promptly. Queue Masters may set their own fee structures, which will be clearly communicated before participation.
          </p>

          <h3 className="text-white font-bold text-sm mt-6">6. Respect for Queue Masters</h3>
          <p>
            Queue Masters volunteer or are designated to organize sessions. Please respect their decisions regarding court allocation, match scheduling, and rule enforcement. Disputes should be raised calmly and constructively.
          </p>

          <h3 className="text-white font-bold text-sm mt-6">7. Privacy and Conduct</h3>
          <p>
            Personal information shared within the platform must not be used for purposes outside of RallyUp. Harassment, spamming, or any form of abuse toward other users is strictly forbidden.
          </p>

          <h3 className="text-white font-bold text-sm mt-6">8. Consequences of Violations</h3>
          <p>
            Violation of these rules may result in warnings, temporary suspension, or permanent removal from the platform at the discretion of RallyUp administration.
          </p>

          <p className="text-slate-500 text-xs mt-6 pt-4 border-t border-slate-800">
            Last updated: June 2026
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
