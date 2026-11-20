import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  X, 
  Printer, 
  Download, 
  ShieldCheck, 
  Scale, 
  AlertTriangle, 
  Building2, 
  Clock, 
  CheckCircle2,
  Lock,
  ExternalLink
} from 'lucide-react';
import { useToast } from '../common/ToastNotification';

export interface FcraNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  notice: any | null;
}

export const FcraNoticeModal: React.FC<FcraNoticeModalProps> = ({
  isOpen,
  onClose,
  notice,
}) => {
  const { toast } = useToast();

  if (!isOpen || !notice) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(notice, null, 2));
    const dl = document.createElement('a');
    dl.setAttribute('href', dataStr);
    dl.setAttribute('download', `${notice.notice_id || 'FCRA_Notice'}.json`);
    document.body.appendChild(dl);
    dl.click();
    document.body.removeChild(dl);
    toast({ title: 'Notice Downloaded', description: 'JSON compliance document saved.', type: 'info' });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-3xl my-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 p-6 sm:p-8 shadow-2xl text-zinc-900 dark:text-zinc-100 space-y-6 print:p-0 print:border-none print:shadow-none"
        >
          {/* Header Action Bar (Hidden on Print) */}
          <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-white/10 print:hidden">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  Official Adverse Action Notice
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                    FCRA § 615(a) / ECOA Reg B
                  </span>
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                  Standardized 12 CFR Part 1002.9 Consumer Disclosure Document
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
                title="Print official notice"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Print Notice</span>
              </button>
              <button
                onClick={handleDownloadJSON}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
                title="Download JSON compliance record"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">JSON Record</span>
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* DOCUMENT BODY (PRINTABLE FORM) */}
          <div className="space-y-6 font-sans text-xs leading-relaxed text-zinc-800 dark:text-zinc-200">
            
            {/* Institution & Notice Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-zinc-200/80 dark:border-white/5">
              <div>
                <div className="text-base font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                  {notice.institution_name}
                </div>
                <div className="text-zinc-500 dark:text-zinc-400 font-mono text-[11px] mt-0.5">
                  Consortium Risk Underwriting &amp; Automated Evaluation Division
                </div>
              </div>
              <div className="sm:text-right font-mono text-[11px] text-zinc-500 dark:text-zinc-400 space-y-0.5">
                <div>Date Issued: <strong className="text-zinc-900 dark:text-zinc-100">{notice.date_issued}</strong></div>
                <div>Notice Reference: <strong className="text-zinc-900 dark:text-zinc-100">{notice.notice_id}</strong></div>
                <div>Target Record: <strong className="text-cyan-600 dark:text-cyan-400">{notice.applicant?.record_reference_id}</strong></div>
              </div>
            </div>

            {/* Applicant & Action Statement */}
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-900 dark:text-zinc-100 font-mono text-[11px]">
                  RE: Notification of Adverse Risk Determination
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                  {notice.adverse_action?.status || 'Adverse Action Taken'}
                </span>
              </div>
              <p>
                Dear <strong>{notice.applicant?.name || 'Applicant'}</strong>:
              </p>
              <p className="text-zinc-600 dark:text-zinc-300">
                Thank you for your recent submission. We regret to inform you that after careful review by our multi-institutional risk evaluation model, your application or transaction cannot be approved at this time under standard underwriting thresholds.
              </p>
            </div>

            {/* Principal Reasons Under ECOA / Regulation B */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 font-mono text-xs flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Principal Reason(s) for Adverse Action (CFPB / ECOA Ordered)
                </h3>
                <span className="text-[10px] text-zinc-400 font-mono">12 CFR § 1002.9(a)(2)</span>
              </div>

              <div className="rounded-xl border border-zinc-200 dark:border-white/10 overflow-hidden divide-y divide-zinc-200 dark:divide-white/5">
                {notice.principal_reasons?.map((r: any) => (
                  <div key={r.rank} className="p-3 bg-white dark:bg-zinc-900/60 flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      {r.rank}
                    </div>
                    <div className="flex-1 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          Code {r.reason_code}
                        </span>
                        <span className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100">
                          {r.category}
                        </span>
                      </div>
                      <p className="text-zinc-600 dark:text-zinc-300 text-xs">
                        {r.principal_reason}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Model & Underwriting Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200/60 dark:border-white/5 font-mono text-[11px]">
              <div>
                <span className="text-zinc-400 block text-[10px]">Model Score</span>
                <span className="font-bold text-rose-600 dark:text-rose-400 text-sm">
                  {notice.adverse_action?.evaluated_risk_score} / 100
                </span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[10px]">Approval Threshold</span>
                <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                  &lt; {notice.adverse_action?.decision_threshold}%
                </span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[10px]">Model Version</span>
                <span className="font-semibold text-zinc-700 dark:text-zinc-300 truncate block">
                  {notice.adverse_action?.model_version}
                </span>
              </div>
            </div>

            {/* Statutory Legal Disclosures */}
            <div className="p-3.5 rounded-xl bg-zinc-100/70 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-white/5 space-y-2 text-[11px] text-zinc-600 dark:text-zinc-400">
              <div className="font-mono font-bold text-zinc-800 dark:text-zinc-200 uppercase text-[10px]">
                Statutory Rights &amp; Non-Discrimination Protections
              </div>
              <div className="whitespace-pre-line leading-relaxed font-sans text-xs">
                {notice.legal_statutory_disclosure}
              </div>
            </div>

            {/* Consumer Dispute Rights Block */}
            <div className="p-3.5 rounded-xl border border-cyan-500/20 bg-cyan-500/5 dark:bg-cyan-500/10 space-y-1.5 text-xs">
              <div className="font-semibold text-cyan-900 dark:text-cyan-200 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-cyan-500" />
                <span>How to Exercise Your Consumer Dispute Rights</span>
              </div>
              <p className="text-zinc-600 dark:text-zinc-300 text-[11px]">
                You have the right to request a free written copy of the collaborative assessment data within <strong>{notice.consumer_dispute_rights?.free_report_window_days || 60} days</strong> of receiving this notice. If you believe any underlying information is inaccurate, contact our compliance dispute officer at:
              </p>
              <div className="flex flex-wrap items-center gap-4 pt-1 font-mono text-[11px] text-cyan-700 dark:text-cyan-300">
                <span>Email: {notice.consumer_dispute_rights?.contact_email}</span>
                <span>Toll-Free: {notice.consumer_dispute_rights?.toll_free_dispute_phone}</span>
              </div>
            </div>

            {/* Cryptographic Seal & Provenance Stamp */}
            <div className="pt-3 border-t border-zinc-200 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono text-[10px] text-zinc-500 dark:text-zinc-400">
              <div className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-500" />
                <span>HMAC-SHA256 Digital Seal:</span>
                <span className="text-zinc-800 dark:text-zinc-200 truncate max-w-[180px] sm:max-w-[260px]">
                  {notice.hmac_seal}
                </span>
              </div>
              <div className="text-zinc-400">
                Input Hash: {notice.input_vector_fingerprint?.slice(0, 16)}...
              </div>
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
