import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserCheck, 
  X, 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  Lock, 
  Send, 
  RotateCcw,
  CheckCircle2
} from 'lucide-react';
import { submitInvestigatorOverride } from '../../risk_api_client';
import { useToast } from '../common/ToastNotification';

export interface InvestigatorOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  domain: string;
  recordId: string;
  originalClassification: string;
  onOverrideSuccess?: (override: any) => void;
}

export const InvestigatorOverrideModal: React.FC<InvestigatorOverrideModalProps> = ({
  isOpen,
  onClose,
  domain,
  recordId,
  originalClassification,
  onOverrideSuccess,
}) => {
  const { toast } = useToast();

  const isInitiallyFraud = originalClassification.toLowerCase().includes('fraud');
  const [overrideClassification, setOverrideClassification] = useState<string>(
    isInitiallyFraud ? 'safe' : 'fraud'
  );
  const [reasonCode, setReasonCode] = useState<string>('OVR-01');
  const [justificationNotes, setJustificationNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const reasonOptions = [
    {
      code: 'OVR-01',
      title: 'Out-of-Band Customer Verification',
      desc: 'Direct customer contact via authenticated voice/OTP confirmed legitimate authorization.',
    },
    {
      code: 'OVR-02',
      title: 'Verified Commercial B2B Invoice',
      desc: 'Validated contractual purchase order, bill of lading, and verified corporate beneficiary.',
    },
    {
      code: 'OVR-03',
      title: 'Collateral & Guarantor Exception',
      desc: 'Credit committee approved application backed by verified secondary collateral reserves.',
    },
    {
      code: 'OVR-04',
      title: 'Algorithmic False-Positive Override',
      desc: 'Model flagged benign seasonal or high-volume surge; certified safe by investigator.',
    },
    {
      code: 'OVR-05',
      title: 'Hardship & Emergency Relief',
      desc: 'Statutory disaster forbearance or financial relief policy applied under institutional rules.',
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (justificationNotes.trim().length < 10) {
      toast({
        title: 'Justification Required',
        description: 'Regulatory audit rules require at least 10 characters of investigative notes.',
        type: 'warning',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const overrideRecord = await submitInvestigatorOverride(
        domain,
        recordId,
        originalClassification,
        overrideClassification,
        reasonCode,
        justificationNotes.trim()
      );

      toast({
        title: 'Investigator Override Recorded',
        description: `Record ${recordId} overridden to '${overrideClassification.toUpperCase()}'. Audit ledger updated.`,
        type: 'success',
      });

      if (onOverrideSuccess) {
        onOverrideSuccess(overrideRecord);
      }
      onClose();
    } catch (err: any) {
      toast({
        title: 'Override Failed',
        description: err?.message || 'Could not record investigator override',
        type: 'warning',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-xl rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 p-6 shadow-2xl text-zinc-900 dark:text-zinc-100 space-y-5"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-white/10">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  Senior Investigator Override
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                    RBAC Operator
                  </span>
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                  Human-in-the-Loop Consensus Adjustment &amp; Audit Trail
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Record Summary Banner */}
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-white/5 font-mono text-xs flex items-center justify-between">
              <div>
                <span className="text-zinc-400 block text-[10px]">Record Target</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100">{recordId}</span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[10px]">Domain</span>
                <span className="font-semibold uppercase text-cyan-600 dark:text-cyan-400">{domain}</span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[10px]">Algorithmic Result</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  isInitiallyFraud ? 'bg-rose-500/10 text-rose-600' : 'bg-emerald-500/10 text-emerald-600'
                }`}>
                  {originalClassification.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Target Override Classification Toggle */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Action / Target Classification:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setOverrideClassification('safe')}
                  className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    overrideClassification === 'safe'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30'
                      : 'border-zinc-200 dark:border-white/10 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Override to Safe / Approved</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOverrideClassification('fraud')}
                  className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    overrideClassification === 'fraud'
                      ? 'border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-1 ring-rose-500/30'
                      : 'border-zinc-200 dark:border-white/10 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  <ShieldAlert className="w-4 h-4 text-rose-500" />
                  <span>Confirm / Escalate to Fraud</span>
                </button>
              </div>
            </div>

            {/* Standardized Reason Code Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Regulatory Override Reason Code:
              </label>
              <select
                value={reasonCode}
                onChange={(e) => setReasonCode(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs font-sans bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-cyan-500"
              >
                {reasonOptions.map((opt) => (
                  <option key={opt.code} value={opt.code} className="dark:bg-zinc-900">
                    [{opt.code}] {opt.title} — {opt.desc}
                  </option>
                ))}
              </select>
            </div>

            {/* Justification Notes Textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Investigator Justification Notes (Mandatory for Audit Trail):
                </label>
                <span className="text-[10px] text-zinc-400 font-mono">Min 10 characters</span>
              </div>
              <textarea
                rows={3}
                required
                value={justificationNotes}
                onChange={(e) => setJustificationNotes(e.target.value)}
                placeholder="Detail out-of-band contact, invoice reference, or committee approval details..."
                className="w-full p-3 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 resize-none font-sans"
              />
            </div>

            {/* Regulatory Non-Repudiation Footer & Submit */}
            <div className="pt-3 border-t border-zinc-200 dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400">
                <Lock className="w-3.5 h-3.5 text-emerald-500" />
                <span>HMAC Stamped Audit Ledger</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || justificationNotes.trim().length < 10}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-linear-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 disabled:opacity-50 transition-all cursor-pointer shadow-sm"
                >
                  <Send className={`w-3.5 h-3.5 ${isSubmitting ? 'animate-spin' : ''}`} />
                  <span>{isSubmitting ? 'Recording Stamp...' : 'Commit Formal Override'}</span>
                </button>
              </div>
            </div>

          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
