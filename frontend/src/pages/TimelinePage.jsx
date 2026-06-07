import { useState, useEffect } from 'react';
import { Calendar, FlaskConical, Pill, Brain, Thermometer, Utensils, Target, PillBottle, Filter } from 'lucide-react';
import * as api from '../api/client';

const TYPE_CONFIG = {
  bloodwork: { icon: FlaskConical, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/30' },
  supplement: { icon: Pill, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30' },
  medication: { icon: PillBottle, color: 'text-violet-400', bg: 'bg-violet-400/10', border: 'border-violet-400/30' },
  insight: { icon: Brain, color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/30' },
  symptom: { icon: Thermometer, color: 'text-rose-400', bg: 'bg-rose-400/10', border: 'border-rose-400/30' },
  food: { icon: Utensils, color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/30' },
  goal: { icon: Target, color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/30' },
};

const ALL_TYPES = Object.keys(TYPE_CONFIG);

export default function TimelinePage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTypes, setActiveTypes] = useState(new Set(ALL_TYPES));
  const [range, setRange] = useState(90);

  useEffect(() => { loadTimeline(); }, [range, activeTypes]);

  const loadTimeline = async () => {
    setLoading(true);
    try {
      const end = new Date().toISOString().slice(0, 10);
      const start = new Date(Date.now() - range * 86400000).toISOString().slice(0, 10);
      const types = activeTypes.size === ALL_TYPES.length ? undefined : [...activeTypes].join(',');
      const data = await api.getFullTimeline(start, end, types);
      setEvents(data.events || []);
    } catch {
      setEvents([]);
    }
    setLoading(false);
  };

  const toggleType = (type) => {
    setActiveTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const grouped = {};
  for (const event of events) {
    grouped[event.date] = grouped[event.date] || [];
    grouped[event.date].push(event);
  }
  const dates = Object.keys(grouped).sort().reverse();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Calendar className="w-6 h-6 text-cyan-400" />
          Health Timeline
        </h1>
        <p className="text-sm text-slate-400 mt-1">All health events in one view — see cause and effect across time</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-slate-900 p-1 rounded-lg">
          {[30, 60, 90, 180].map(d => (
            <button key={d} onClick={() => setRange(d)}
              className={`px-3 py-1 rounded-md text-xs font-medium ${range === d ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-300'}`}>
              {d}d
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {ALL_TYPES.map(type => {
            const cfg = TYPE_CONFIG[type];
            const active = activeTypes.has(type);
            return (
              <button key={type} onClick={() => toggleType(type)}
                className={`px-2.5 py-1 rounded-full text-xs border flex items-center gap-1 transition-colors ${active ? `${cfg.bg} ${cfg.color} ${cfg.border}` : 'bg-slate-900 text-slate-600 border-slate-800'}`}>
                <cfg.icon className="w-3 h-3" />
                {type}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-6 h-6 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin mx-auto" />
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No events in the selected timeframe</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-[19px] top-0 bottom-0 w-px bg-slate-800" />
          <div className="space-y-6">
            {dates.map(date => (
              <div key={date}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-medium text-white z-10 relative">
                    {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <span className="text-xs text-slate-500">
                    {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric' })}
                  </span>
                </div>

                <div className="ml-12 space-y-2">
                  {grouped[date].map((event, i) => {
                    const cfg = TYPE_CONFIG[event.type] || TYPE_CONFIG.insight;
                    const Icon = cfg.icon;
                    return (
                      <div key={i} className={`bg-slate-900 border rounded-lg p-3 flex items-start gap-3 ${event.severity === 'critical' ? 'border-red-500/30' : event.severity === 'warning' ? 'border-amber-500/30' : 'border-slate-800'}`}>
                        <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}>
                          <Icon className={`w-4 h-4 ${cfg.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-medium">{event.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{event.detail}</p>
                        </div>
                        {event.severity && event.severity !== 'info' && (
                          <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${event.severity === 'critical' ? 'bg-red-400/10 text-red-400' : event.severity === 'warning' ? 'bg-amber-400/10 text-amber-400' : 'bg-emerald-400/10 text-emerald-400'}`}>
                            {event.severity}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
