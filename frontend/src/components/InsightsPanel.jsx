import { useState } from 'react';
import { RefreshCw, Loader2, AlertTriangle } from 'lucide-react';
import HealthScoreGauge from './HealthScoreGauge';
import InsightCard from './InsightCard';
import AskQuestion from './AskQuestion';
import useHealthStore from '../store/healthStore';

const TYPE_TABS = [
  { key: 'all', label: 'All' },
  { key: 'BloodWorkInsight', label: 'Blood Work' },
  { key: 'WearableTrendInsight', label: 'Wearables' },
  { key: 'CrossSourceCorrelation', label: 'Correlations' },
  { key: 'SupplementInsight', label: 'Supplements' },
];

export default function InsightsPanel() {
  const healthScore = useHealthStore((s) => s.healthScore);
  const insights = useHealthStore((s) => s.insights);
  const actionItems = useHealthStore((s) => s.actionItems);
  const generateInsights = useHealthStore((s) => s.generateInsights);
  const dismissInsight = useHealthStore((s) => s.dismissInsight);
  const showToast = useHealthStore((s) => s.showToast);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await generateInsights(true);
      showToast('Insights refreshed');
    } catch {
      showToast('Failed to generate insights', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filtered = activeTab === 'all'
    ? insights
    : insights.filter((i) => i.insight_type === activeTab);

  return (
    <div className="space-y-6">
      {/* Disclaimer */}
      <div className="bg-amber-400/5 border border-amber-400/20 rounded-lg px-4 py-2.5 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
        <p className="text-xs text-amber-400">
          These insights are for informational purposes only. Consult your healthcare provider before making any changes.
        </p>
      </div>

      {/* Score + Actions row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {healthScore && (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 flex justify-center">
            <HealthScoreGauge score={healthScore.score} breakdown={healthScore.breakdown} />
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">Action Items</h3>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              Refresh
            </button>
          </div>
          {actionItems.length === 0 ? (
            <p className="text-sm text-slate-500">No action items. Generate insights to get started.</p>
          ) : (
            <ul className="space-y-2">
              {actionItems.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                    item.priority === 'critical' ? 'bg-red-400' : 'bg-amber-400'
                  }`} />
                  <span className="text-slate-300">{item.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {TYPE_TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors whitespace-nowrap ${
              activeTab === key
                ? 'bg-blue-500/20 text-blue-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {label}
            {key !== 'all' && (
              <span className="ml-1 text-slate-600">
                {insights.filter((i) => i.insight_type === key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Insight cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-slate-500 text-sm">
            {insights.length === 0
              ? 'No insights yet. Click "Refresh" to generate insights from your data.'
              : 'No insights in this category.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((insight) => (
            <InsightCard key={insight.id} insight={insight} onDismiss={dismissInsight} />
          ))}
        </div>
      )}

      {/* Ask question */}
      <AskQuestion />
    </div>
  );
}
