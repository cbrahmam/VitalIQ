import { useEffect } from 'react';
import { Watch, Smartphone, Heart, Brain, Footprints, Moon } from 'lucide-react';
import WearableSync from '../components/WearableSync';
import useHealthStore from '../store/healthStore';

const METRIC_DISPLAY = {
  resting_hr: { label: 'Resting HR', icon: Heart, color: 'text-red-400', format: (v) => `${Math.round(v)} bpm` },
  hrv: { label: 'HRV', icon: Brain, color: 'text-purple-400', format: (v) => `${Math.round(v)} ms` },
  steps: { label: 'Steps', icon: Footprints, color: 'text-blue-400', format: (v) => v.toLocaleString() },
  sleep_hours: { label: 'Sleep', icon: Moon, color: 'text-indigo-400', format: (v) => `${v.toFixed(1)} hrs` },
};

const sources = [
  {
    source: 'apple_health',
    label: 'Apple Health',
    icon: Smartphone,
    accept: { 'text/xml': ['.xml'], 'application/xml': ['.xml'] },
    description: 'Upload Apple Health export.xml',
  },
  {
    source: 'whoop',
    label: 'Whoop',
    icon: Watch,
    accept: { 'text/csv': ['.csv'] },
    description: 'Upload Whoop CSV export',
  },
  {
    source: 'garmin',
    label: 'Garmin',
    icon: Watch,
    accept: { 'text/csv': ['.csv'] },
    description: 'Upload Garmin CSV export',
  },
];

export default function WearablesPage() {
  const latestMetrics = useHealthStore((s) => s.latestMetrics);
  const fetchSyncStatus = useHealthStore((s) => s.fetchSyncStatus);
  const fetchLatestMetrics = useHealthStore((s) => s.fetchLatestMetrics);

  useEffect(() => {
    fetchSyncStatus();
    fetchLatestMetrics();
  }, [fetchSyncStatus, fetchLatestMetrics]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Watch className="w-7 h-7 text-blue-400" />
        <h1 className="text-2xl font-bold text-white">Wearables</h1>
      </div>

      {/* Quick stats */}
      {latestMetrics.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {Object.entries(METRIC_DISPLAY).map(([key, config]) => {
            const metric = latestMetrics.find((m) => m.metric_type === key);
            if (!metric) return null;
            const Icon = config.icon;
            return (
              <div key={key} className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${config.color}`} />
                  <span className="text-xs text-slate-500">{config.label}</span>
                </div>
                <p className="text-xl font-bold text-white">{config.format(metric.value)}</p>
                <p className="text-xs text-slate-600 mt-1">{metric.date}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload sections */}
      <h2 className="text-lg font-semibold text-white mb-4">Data Sources</h2>
      <div className="space-y-4">
        {sources.map((src) => (
          <WearableSync key={src.source} {...src} />
        ))}
      </div>
    </div>
  );
}
