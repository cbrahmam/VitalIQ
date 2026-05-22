import { X } from 'lucide-react';

const SEVERITY_STYLES = {
  critical: { border: 'border-l-red-400', bg: 'bg-red-400/5', badge: 'bg-red-400/10 text-red-400' },
  warning: { border: 'border-l-amber-400', bg: 'bg-amber-400/5', badge: 'bg-amber-400/10 text-amber-400' },
  info: { border: 'border-l-blue-400', bg: 'bg-blue-400/5', badge: 'bg-blue-400/10 text-blue-400' },
  positive: { border: 'border-l-emerald-400', bg: 'bg-emerald-400/5', badge: 'bg-emerald-400/10 text-emerald-400' },
};

const TYPE_LABELS = {
  BloodWorkInsight: 'Blood Work',
  WearableTrendInsight: 'Wearable',
  CrossSourceCorrelation: 'Correlation',
  SupplementInsight: 'Supplement',
  DailySnapshot: 'Daily',
};

export default function InsightCard({ insight, onDismiss }) {
  const style = SEVERITY_STYLES[insight.severity] || SEVERITY_STYLES.info;
  const typeLabel = TYPE_LABELS[insight.insight_type] || insight.insight_type;

  return (
    <div className={`${style.bg} border border-slate-800 border-l-4 ${style.border} rounded-lg p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.badge}`}>
              {typeLabel}
            </span>
          </div>
          <h3 className="text-sm font-medium text-white mb-1">{insight.title}</h3>
          <p className="text-sm text-slate-400 leading-relaxed">{insight.content}</p>
          {insight.data_sources.length > 0 && (
            <div className="flex gap-1.5 mt-2">
              {insight.data_sources.map((src) => (
                <span key={src} className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-slate-500 rounded">
                  {src}
                </span>
              ))}
            </div>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={() => onDismiss(insight.id)}
            className="text-slate-600 hover:text-slate-400 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
