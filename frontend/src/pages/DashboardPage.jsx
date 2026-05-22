import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FlaskConical, Pill, Settings, Activity, Brain, Loader2 } from 'lucide-react';
import HealthScoreGauge from '../components/HealthScoreGauge';
import InsightCard from '../components/InsightCard';
import useHealthStore from '../store/healthStore';

const quickActions = [
  { to: '/bloodwork', label: 'Upload Blood Work', desc: 'Parse a lab report PDF', icon: FlaskConical, color: 'text-blue-400' },
  { to: '/supplements', label: 'Manage Supplements', desc: 'Track your stack', icon: Pill, color: 'text-emerald-400' },
  { to: '/settings', label: 'Health Profile', desc: 'Set age, sex, weight', icon: Settings, color: 'text-amber-400' },
];

export default function DashboardPage() {
  const profile = useHealthStore((s) => s.profile);
  const reports = useHealthStore((s) => s.reports);
  const supplements = useHealthStore((s) => s.supplements);
  const healthScore = useHealthStore((s) => s.healthScore);
  const insights = useHealthStore((s) => s.insights);
  const actionItems = useHealthStore((s) => s.actionItems);
  const fetchProfile = useHealthStore((s) => s.fetchProfile);
  const fetchReports = useHealthStore((s) => s.fetchReports);
  const fetchSupplements = useHealthStore((s) => s.fetchSupplements);
  const generateInsights = useHealthStore((s) => s.generateInsights);
  const dismissInsight = useHealthStore((s) => s.dismissInsight);
  const [insightsLoading, setInsightsLoading] = useState(false);

  useEffect(() => {
    fetchProfile();
    fetchReports();
    fetchSupplements();
    if (!healthScore) {
      setInsightsLoading(true);
      generateInsights(false).finally(() => setInsightsLoading(false));
    }
  }, [fetchProfile, fetchReports, fetchSupplements]);

  const topInsights = insights
    .filter((i) => i.severity === 'critical' || i.severity === 'warning')
    .slice(0, 3);

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Activity className="w-8 h-8 text-emerald-400" />
          <h1 className="text-3xl font-bold text-white">VitalIQ</h1>
        </div>
        <p className="text-slate-400">
          {profile?.name ? `Welcome back, ${profile.name}` : 'Your AI health intelligence platform'}
        </p>
      </div>

      {/* Top row: score + data summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {/* Health Score */}
        <Link to="/insights" className="bg-slate-900 border border-slate-800 rounded-lg p-4 hover:border-slate-600 transition-colors flex items-center justify-center">
          {insightsLoading ? (
            <div className="flex flex-col items-center py-4">
              <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
              <span className="text-xs text-slate-500 mt-2">Analyzing...</span>
            </div>
          ) : healthScore ? (
            <HealthScoreGauge score={healthScore.score} />
          ) : (
            <div className="text-center py-4">
              <Brain className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-500">No score yet</p>
            </div>
          )}
        </Link>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <p className="text-2xl font-bold text-white">{reports.length}</p>
          <p className="text-sm text-slate-400">Blood Work Reports</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <p className="text-2xl font-bold text-white">{supplements.length}</p>
          <p className="text-sm text-slate-400">Active Supplements</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <p className="text-2xl font-bold text-white">{actionItems.length}</p>
          <p className="text-sm text-slate-400">Action Items</p>
        </div>
      </div>

      {/* Key insights */}
      {topInsights.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Key Findings</h2>
            <Link to="/insights" className="text-sm text-blue-400 hover:text-blue-300">
              View all {insights.length} insights
            </Link>
          </div>
          <div className="space-y-3">
            {topInsights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} onDismiss={dismissInsight} />
            ))}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {quickActions.map(({ to, label, desc, icon: Icon, color }) => (
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
            Set up your health profile in Settings to get accurate biomarker classification (reference ranges differ by sex).
          </p>
        </div>
      )}
    </div>
  );
}
