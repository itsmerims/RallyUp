import { motion } from 'motion/react';
import { X, Shield } from 'lucide-react';

interface TermsPageProps {
  onClose: () => void;
}

export default function TermsPage({ onClose }: TermsPageProps) {
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
            <h2 className="text-lg font-black tracking-tight text-white">Terms and Conditions</h2>
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
            Welcome to RallyUp. By accessing or using our platform, you agree to be bound by these Terms and Conditions. If you do not agree, please do not use the service.
          </p>

          <h3 className="text-white font-bold text-sm mt-6">1. Acceptance of Terms</h3>
          <p>
            By creating an account, registering as a Queue Master, joining sessions, or otherwise using RallyUp, you acknowledge that you have read, understood, and agree to be bound by these Terms.
          </p>

          <h3 className="text-white font-bold text-sm mt-6">2. User Accounts</h3>
          <p>
            You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account. You must provide accurate, current, and complete information during registration.
          </p>

          <h3 className="text-white font-bold text-sm mt-6">3. Acceptable Use</h3>
          <p>
            You agree to use RallyUp only for lawful purposes and in accordance with these Terms. You may not use the platform to harm, disrupt, or unfairly advantage yourself over other users. Harassment, cheating, and abuse of the queue system are strictly prohibited.
          </p>

          <h3 className="text-white font-bold text-sm mt-6">4. Queue Master Responsibilities</h3>
          <p>
            Queue Masters are responsible for hosting fair sessions, managing court allocations, and ensuring accurate match reporting. Abuse of administrative privileges may result in account suspension.
          </p>

          <h3 className="text-white font-bold text-sm mt-6">5. Intellectual Property</h3>
          <p>
            All content, trademarks, and intellectual property within RallyUp are owned by the platform. You may not reproduce, distribute, or create derivative works without explicit permission.
          </p>

          <h3 className="text-white font-bold text-sm mt-6">6. Limitation of Liability</h3>
          <p>
            RallyUp is provided &quot;as is&quot; without warranties of any kind. We are not liable for any damages arising from your use of the platform, including but not limited to scheduling conflicts, match disputes, or data loss.
          </p>

          <h3 className="text-white font-bold text-sm mt-6">7. Changes to Terms</h3>
          <p>
            We reserve the right to modify these Terms at any time. Users will be notified of significant changes. Continued use after changes constitute acceptance of the new Terms.
          </p>

          <p className="text-slate-500 text-xs mt-6 pt-4 border-t border-slate-800">
            Last updated: June 2026
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
