import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, Heart, Brain, Moon, Footprints, TrendingUp, TrendingDown,
  Minus, FlaskConical, Pill, Loader2, RefreshCw, Watch,
} from 'lucide-react';
import HealthScoreGauge from '../components/HealthScoreGauge';
import InsightCard from '../components/InsightCard';
import TrendChart from '../components/TrendChart';
import useHealthStore from '../store/healthStore';

const METRIC_ICONS = { heart: Heart, brain: Brain, moon: Moon, footprints: Footprints };

const RECOVERY_BADGES = {
  fully_recovered: { label: 'Fully Recovered', color: 'bg-emerald-400/10 text-emerald-400' },
  moderate: { label: 'Moderate Recovery', color: 'bg-amber-400/10 text-amber-400' },
  needs_rest: { label: 'Needs Rest', color: 'bg-red-400/10 text-red-400' },
};

function MetricCard({ card }) {
  const Icon = METRIC_ICONS[card.icon] || Heart;
  const trending = card.trend_pct > 2 ? 'up' : card.trend_pct < -2 ? 'down' : 'flat';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-500">{card.label}</span>
        </div>
        <div className="flex items-center gap-1">
          {trending === 'up' && <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />}
          {trending === 'down' && <TrendingDown className="w-3.5 h-3.5 text-red-400" />}
          {trending === 'flat' && <Minus className="w-3.5 h-3.5 text-slate-500" />}
          <span className={`text-[10px] ${
            trending === 'up' ? 'text-emerald-400' : trending === 'down' ? 'text-red-400' : 'text-slate-500'
          }`}>
            {card.trend_pct > 0 ? '+' : ''}{card.trend_pct}%
          </span>
        </div>
      </div>
      <p className="text-2xl font-bold text-white">
        {card.metric === 'steps' ? Math.round(card.value).toLocaleString() : card.value.toFixed(1)}
      </p>
      <p className="text-xs text-slate-600 mt-0.5">
        {card.unit} &middot; 7d avg: {card.avg_7day ?? '—'}
      </p>
    </div>
  );
}

export default function DashboardPage() {
  const profile = useHealthStore((s) => s.profile);
  const healthScore = useHealthStore((s) => s.healthScore);
  const insights = useHealthStore((s) => s.insights);
  const actionItems = useHealthStore((s) => s.actionItems);
  const dashboardData = useHealthStore((s) => s.dashboardData);
  const fetchProfile = useHealthStore((s) => s.fetchProfile);
  const fetchDashboard = useHealthStore((s) => s.fetchDashboard);
  const generateInsights = useHealthStore((s) => s.generateInsights);
  const dismissInsight = useHealthStore((s) => s.dismissInsight);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProfile();
    setLoading(true);
    Promise.all([
      fetchDashboard(),
      insights.length === 0 ? generateInsights(false) : Promise.resolve(),
    ]).finally(() => setLoading(false));
  }, []);

  const metricCards = dashboardData?.metric_cards || [];
  const dailySnapshot = dashboardData?.daily_snapshot;
  const recentInsights = insights
    .filter((i) => i.insight_type !== 'DailySnapshot')
    .slice(0, 5);

  const snapshotMeta = dailySnapshot?.content ? null : null;
  let parsedSnapshot = null;
  if (dailySnapshot) {
    try {
      const raw = typeof dailySnapshot.content === 'string' ? dailySnapshot : dailySnapshot;
      parsedSnapshot = raw;
    } catch { /* ignore */ }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Activity className="w-8 h-8 text-emerald-400" />
            <h1 className="text-3xl font-bold text-white">VitalIQ</h1>
          </div>
          <p className="text-slate-400">
            {profile?.name ? `Welcome back, ${profile.name}` : 'Your AI health intelligence platform'}
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/wearables" className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-lg transition-colors">
            <Watch className="w-3.5 h-3.5" /> Sync Data
          </Link>
          <Link to="/bloodwork" className="flex items-center gap-1.5 text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-3 py-2 rounded-lg transition-colors">
            <FlaskConical className="w-3.5 h-3.5" /> New Blood Work
          </Link>
        </div>
      </div>

      {/* Score + Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <Link to="/insights" className="bg-slate-900 border border-slate-800 rounded-lg p-4 hover:border-slate-600 transition-colors flex items-center justify-center">
          {loading ? (
            <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
          ) : healthScore ? (
            <HealthScoreGauge score={healthScore.score} />
          ) : (
            <div className="text-center py-2">
              <Brain className="w-6 h-6 text-slate-600 mx-auto mb-1" />
              <p className="text-[10px] text-slate-500">No score</p>
            </div>
          )}
        </Link>
        {metricCards.map((card) => (
          <MetricCard key={card.metric} card={card} />
        ))}
      </div>

      {/* Daily Snapshot */}
      {parsedSnapshot && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-white">{parsedSnapshot.title}</h2>
            {parsedSnapshot.severity && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                RECOVERY_BADGES[parsedSnapshot.severity]?.color || 'bg-slate-700 text-slate-400'
              }`}>
                {RECOVERY_BADGES[parsedSnapshot.severity]?.label || parsedSnapshot.severity}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400">{parsedSnapshot.content}</p>
        </div>
      )}

      {/* Trend Charts 2x2 */}
      <h2 className="text-lg font-semibold text-white mb-4">Trends</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <TrendChart metric="resting_hr" days={30} height={160} />
        <TrendChart metric="hrv" days={30} height={160} />
        <TrendChart metric="sleep_hours" days={30} height={160} />
        <TrendChart metric="steps" days={30} height={160} />
      </div>

      {/* Recent Insights */}
      {recentInsights.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Recent Insights</h2>
            <Link to="/insights" className="text-xs text-blue-400 hover:text-blue-300">
              View all ({insights.length})
            </Link>
          </div>
          <div className="space-y-3">
            {recentInsights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} onDismiss={dismissInsight} />
            ))}
          </div>
        </div>
      )}

      {/* Action Items */}
      {actionItems.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Action Items</h2>
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <ul className="space-y-2">
              {actionItems.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                    item.priority === 'critical' ? 'bg-red-400' : 'bg-amber-400'
                  }`} />
                  <div>
                    <span className="text-slate-300">{item.text}</span>
                    <span className="text-[10px] text-slate-600 ml-2">{item.category}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { to: '/bloodwork', label: 'Upload Blood Work', desc: 'Parse a lab report PDF', icon: FlaskConical, color: 'text-blue-400' },
          { to: '/supplements', label: 'Manage Supplements', desc: 'Track your stack', icon: Pill, color: 'text-emerald-400' },
          { to: '/insights', label: 'Health Insights', desc: 'AI analysis & Q&A', icon: Brain, color: 'text-purple-400' },
        ].map(({ to, label, desc, icon: Icon, color }) => (
          <Link
            key={to}
            to={to}
            className="bg-slate-900 border border-slate-800 rounded-lg p-5 hover:border-slate-600 transition-colors block"
          >
            <Icon className={`w-8 h-8 ${color} mb-3`} />
            <h3 className="font-medium text-white">{label}</h3>
            <p className="text-sm text-slate-500 mt-1">{desc}</p>
          </Link>
        ))}
      </div>

      {!profile && (
        <div className="mt-8 bg-amber-400/5 border border-amber-400/20 rounded-lg p-4">
          <p className="text-amber-400 text-sm">
            Set up your health profile in Settings for accurate biomarker classification.
          </p>
        </div>
      )}
    </div>
  );
}
