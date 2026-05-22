import { useState, useEffect } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceArea, ReferenceLine,
} from 'recharts';
import { X, Loader2, Pill, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import * as api from '../api/client';
import { getStatusStyle } from '../utils/biomarkerUtils';

export default function BiomarkerDeepDive({ name, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!name) return;
    setLoading(true);
    api.getBiomarkerDeepDive(name)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [name]);

  if (!name) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8">
          <Loader2 className="w-6 h-6 text-blue-400 animate-spin mx-auto" />
          <p className="text-sm text-slate-400 mt-2">Loading biomarker data...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={onClose}>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8">
          <p className="text-sm text-slate-400">No data found for {name}</p>
        </div>
      </div>
    );
  }

  const current = data.current;
  const statusStyle = current ? getStatusStyle(current.status) : null;

  const chartData = data.history.map((h) => ({ date: h.date, value: h.value }));

  // Determine trend
  let trend = 'new';
  if (chartData.length >= 2) {
    const first = chartData[0].value;
    const last = chartData[chartData.length - 1].value;
    if (last > first * 1.05) trend = 'improving';
    else if (last < first * 0.95) trend = 'declining';
    else trend = 'stable';
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-slate-950 border border-slate-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white">{data.name}</h2>
            <p className="text-xs text-slate-500">{data.category} &middot; {data.description}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current value */}
        {current && (
          <div className="p-5 border-b border-slate-800">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-3xl font-bold text-white">{current.value}</span>
                <span className="text-sm text-slate-400 ml-1">{data.unit}</span>
              </div>
              {statusStyle && (
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.color} border ${statusStyle.border}`}>
                  {statusStyle.label}
                </span>
              )}
              <div className="flex items-center gap-1 ml-auto">
                {trend === 'improving' && <TrendingUp className="w-4 h-4 text-emerald-400" />}
                {trend === 'declining' && <TrendingDown className="w-4 h-4 text-red-400" />}
                {trend === 'stable' && <Minus className="w-4 h-4 text-slate-400" />}
                <span className="text-xs text-slate-400 capitalize">{trend}</span>
              </div>
            </div>
            <div className="flex gap-6 mt-2 text-xs text-slate-500">
              <span>Optimal: {data.optimal_range.low} - {data.optimal_range.high} {data.unit}</span>
              <span>Lab: {data.lab_range.low} - {data.lab_range.high} {data.unit}</span>
            </div>
          </div>
        )}

        {/* Chart */}
        {chartData.length > 0 && (
          <div className="p-5 border-b border-slate-800">
            <h3 className="text-sm font-medium text-slate-400 mb-3">History</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} width={45} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <ReferenceArea
                  y1={data.optimal_range.low} y2={data.optimal_range.high}
                  fill="#34d399" fillOpacity={0.08} label={{ value: 'Optimal', fill: '#34d399', fontSize: 10, position: 'insideTopRight' }}
                />
                <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} name={data.name} />

                {/* Supplement start markers */}
                {data.related_supplements.map((s) => (
                  <ReferenceLine
                    key={s.name}
                    x={s.started_date}
                    stroke="#34d399"
                    strokeDasharray="4 4"
                    label={{ value: `Started ${s.name}`, fill: '#34d399', fontSize: 9, position: 'top' }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Supplements */}
        {data.related_supplements.length > 0 && (
          <div className="p-5 border-b border-slate-800">
            <h3 className="text-sm font-medium text-slate-400 mb-3">Active Related Supplements</h3>
            <div className="space-y-2">
              {data.related_supplements.map((s) => (
                <div key={s.name} className="flex items-center gap-2 bg-slate-900 rounded-lg p-2.5">
                  <Pill className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm text-white">{s.name}</span>
                  <span className="text-xs text-slate-500">{s.dosage}</span>
                  {s.started_date && <span className="text-[10px] text-slate-600 ml-auto">Since {s.started_date}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggested supplements */}
        {data.suggested_supplements.length > 0 && current?.status !== 'optimal' && (
          <div className="p-5 border-b border-slate-800">
            <h3 className="text-sm font-medium text-slate-400 mb-2">Suggested Supplements</h3>
            <div className="flex flex-wrap gap-2">
              {data.suggested_supplements.map((s) => (
                <span key={s} className="text-xs bg-blue-400/10 text-blue-400 px-2 py-1 rounded">{s}</span>
              ))}
            </div>
          </div>
        )}

        {/* Related wearable metrics */}
        {data.related_metrics.length > 0 && (
          <div className="p-5">
            <h3 className="text-sm font-medium text-slate-400 mb-2">Related Wearable Metrics</h3>
            <div className="flex flex-wrap gap-2">
              {data.related_metrics.map((m) => (
                <span key={m} className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded">{m}</span>
              ))}
            </div>
            {data.affected_by.length > 0 && (
              <p className="text-xs text-slate-500 mt-2">Affected by: {data.affected_by.join(', ')}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
