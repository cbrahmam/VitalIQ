import { useState } from 'react';
import { BarChart3, GitBranch, Clock } from 'lucide-react';
import TrendChart from '../components/TrendChart';
import CorrelationPanel from '../components/CorrelationPanel';
import HealthTimeline from '../components/HealthTimeline';

const TABS = [
  { key: 'trends', label: 'Trends', icon: BarChart3 },
  { key: 'correlations', label: 'Correlations', icon: GitBranch },
  { key: 'timeline', label: 'Timeline', icon: Clock },
];

const METRICS = [
  { key: 'resting_hr', label: 'Resting HR' },
  { key: 'hrv', label: 'HRV' },
  { key: 'sleep_hours', label: 'Sleep' },
  { key: 'steps', label: 'Steps' },
  { key: 'active_calories', label: 'Calories' },
  { key: 'weight', label: 'Weight' },
  { key: 'recovery_score', label: 'Recovery' },
];

export default function TrendsPage() {
  const [activeTab, setActiveTab] = useState('trends');
  const [days, setDays] = useState(30);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <BarChart3 className="w-7 h-7 text-blue-400" />
        <h1 className="text-2xl font-bold text-white">Trends & Correlations</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg transition-colors ${
              activeTab === key
                ? 'bg-blue-500/20 text-blue-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'trends' && (
        <div>
          {/* Date range selector */}
          <div className="flex gap-2 mb-4">
            {[7, 14, 30, 60, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                  days === d ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {METRICS.map(({ key }) => (
              <TrendChart key={`${key}-${days}`} metric={key} days={days} height={180} />
            ))}
          </div>
        </div>
      )}

      {activeTab === 'correlations' && <CorrelationPanel />}
      {activeTab === 'timeline' && <HealthTimeline />}
    </div>
  );
}
