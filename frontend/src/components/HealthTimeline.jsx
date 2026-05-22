import { useState, useEffect } from 'react';
import { FlaskConical, Pill, Brain, Loader2 } from 'lucide-react';
import * as api from '../api/client';

const TYPE_CONFIG = {
  bloodwork: { icon: FlaskConical, color: 'bg-blue-400', label: 'Blood Work' },
  supplement: { icon: Pill, color: 'bg-emerald-400', label: 'Supplement' },
  insight: { icon: Brain, color: 'bg-purple-400', label: 'Insight' },
};

const TYPE_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'bloodwork', label: 'Blood Work' },
  { key: 'supplement', label: 'Supplements' },
  { key: 'insight', label: 'Insights' },
];

export default function HealthTimeline() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    api.getTimeline()
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
      </div>
    );
  }

  const filtered = filter === 'all' ? events : events.filter((e) => e.type === filter);

  if (filtered.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-slate-500">
        No health events found. Upload blood work or wearable data to start your timeline.
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-1 mb-4">
        {TYPE_FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              filter === key ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-800" />

        <div className="space-y-4">
          {filtered.map((event, i) => {
            const config = TYPE_CONFIG[event.type] || TYPE_CONFIG.insight;
            const Icon = config.icon;

            return (
              <div key={event.id || i} className="relative pl-10">
                <div className={`absolute left-2.5 top-3 w-3 h-3 rounded-full ${config.color} ring-2 ring-slate-950`} />

                <div className={`bg-slate-900 border rounded-lg p-3 ${
                  event.severity === 'critical' ? 'border-red-400/30'
                  : event.severity === 'warning' ? 'border-amber-400/30'
                  : 'border-slate-800'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">{config.label}</span>
                    <span className="text-[10px] text-slate-600 ml-auto">{event.date}</span>
                  </div>
                  <h4 className="text-sm font-medium text-white">{event.title}</h4>
                  {event.detail && (
                    <p className="text-xs text-slate-400 mt-0.5">{event.detail}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
