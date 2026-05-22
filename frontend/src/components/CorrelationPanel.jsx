import { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import * as api from '../api/client';

function StrengthBar({ strength, r }) {
  const width = Math.abs(r) * 100;
  const color = strength === 'strong' ? 'bg-emerald-400' : strength === 'moderate' ? 'bg-amber-400' : 'bg-slate-500';
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${width}%` }} />
      </div>
      <span className="text-xs text-slate-500">{r.toFixed(2)}</span>
    </div>
  );
}

function CorrelationCard({ corr }) {
  const [expanded, setExpanded] = useState(false);

  const chartData = corr.chart_data?.map((d) => ({
    ...d,
    date: d.date.slice(5),
  })) || [];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {corr.direction === 'positive'
              ? <ArrowUpRight className="w-4 h-4 text-emerald-400" />
              : <ArrowDownRight className="w-4 h-4 text-red-400" />
            }
            <h3 className="text-sm font-medium text-white">{corr.label}</h3>
            <span className={`text-xs px-1.5 py-0.5 rounded ${
              corr.strength === 'strong' ? 'bg-emerald-400/10 text-emerald-400'
              : corr.strength === 'moderate' ? 'bg-amber-400/10 text-amber-400'
              : 'bg-slate-700 text-slate-400'
            }`}>
              {corr.strength}
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-2">{corr.interpretation}</p>
          <StrengthBar strength={corr.strength} r={corr.correlation_coefficient} />
          <p className="text-[10px] text-slate-600 mt-1">{corr.data_points} data points</p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-blue-400 hover:text-blue-300 ml-3 shrink-0"
        >
          {expanded ? 'Hide' : 'Chart'}
        </button>
      </div>

      {expanded && chartData.length > 0 && (
        <div className="mt-4">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="left" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} width={35} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} width={35} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '11px' }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Line yAxisId="left" type="monotone" dataKey={corr.metric_a} stroke="#a78bfa" strokeWidth={1.5} dot={false} />
              <Line yAxisId="right" type="monotone" dataKey={corr.metric_b} stroke="#34d399" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export default function CorrelationPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCorrelations(30)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
      </div>
    );
  }

  const correlations = data?.wearable_correlations || [];
  const links = data?.biomarker_links || [];

  if (correlations.length === 0 && links.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-slate-500">
        Not enough data to compute correlations. Upload more wearable data.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {correlations.map((corr, i) => (
        <CorrelationCard key={i} corr={corr} />
      ))}

      {links.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Biomarker-Wearable Links
          </h3>
          <div className="space-y-2">
            {links.map((link, i) => (
              <div key={i} className="bg-slate-900 border border-slate-800 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-white font-medium">{link.biomarker}</span>
                    <span className={`text-xs ml-2 px-1.5 py-0.5 rounded ${
                      link.biomarker_status === 'critical' ? 'bg-red-400/10 text-red-400'
                      : link.biomarker_status === 'out_of_range' ? 'bg-amber-400/10 text-amber-400'
                      : 'bg-blue-400/10 text-blue-400'
                    }`}>
                      {link.biomarker_value} {link.biomarker_unit}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {link.related_metrics.map((m) => (
                      <span key={m} className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">{m}</span>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-1">{link.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
