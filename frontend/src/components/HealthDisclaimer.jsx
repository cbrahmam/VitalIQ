import { AlertTriangle } from 'lucide-react';

export default function HealthDisclaimer({ compact = false }) {
  if (compact) {
    return (
      <p className="text-[10px] text-slate-600 flex items-center gap-1">
        <AlertTriangle className="w-3 h-3 shrink-0" />
        For informational purposes only. Consult your healthcare provider.
      </p>
    );
  }

  return (
    <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 flex items-start gap-2">
      <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
      <p className="text-xs text-amber-300/80">
        These insights are for informational purposes only. Consult your healthcare
        provider before making any changes to your health regimen.
      </p>
    </div>
  );
}
