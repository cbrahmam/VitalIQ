import { useState, useEffect } from 'react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceArea, Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import * as api from '../api/client';

const METRIC_CONFIG = {
  resting_hr: { label: 'Resting HR', unit: 'bpm', color: '#f87171', chartType: 'line' },
  hrv: { label: 'HRV', unit: 'ms', color: '#a78bfa', chartType: 'line' },
  steps: { label: 'Steps', unit: '', color: '#3b82f6', chartType: 'bar' },
  sleep_hours: { label: 'Sleep', unit: 'hrs', color: '#818cf8', chartType: 'bar' },
  active_calories: { label: 'Active Calories', unit: 'kcal', color: '#f59e0b', chartType: 'bar' },
  weight: { label: 'Weight', unit: 'kg', color: '#34d399', chartType: 'line' },
  body_fat: { label: 'Body Fat', unit: '%', color: '#fb923c', chartType: 'line' },
  vo2_max: { label: 'VO2 Max', unit: 'mL/kg/min', color: '#14b8a6', chartType: 'line' },
  spo2: { label: 'SpO2', unit: '%', color: '#60a5fa', chartType: 'line' },
  recovery_score: { label: 'Recovery', unit: '', color: '#34d399', chartType: 'line' },
};

const TrendIcon = ({ direction }) => {
  if (direction === 'improving') return <TrendingUp className="w-4 h-4 text-emerald-400" />;
  if (direction === 'declining') return <TrendingDown className="w-4 h-4 text-red-400" />;
  return <Minus className="w-4 h-4 text-slate-400" />;
};

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-medium">
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
        </p>
      ))}
    </div>
  );
}

export default function TrendChart({ metric, days = 30, height = 200, showMA = true, optimalRange }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const config = METRIC_CONFIG[metric] || { label: metric, unit: '', color: '#3b82f6', chartType: 'line' };

  useEffect(() => {
    setLoading(true);
    api.getTrend(metric, days)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [metric, days]);

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4" style={{ height: height + 80 }}>
        <div className="animate-pulse h-full bg-slate-800 rounded" />
      </div>
    );
  }

  if (!data || data.data_points === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex items-center justify-center text-slate-500 text-sm" style={{ height: height + 80 }}>
        No data for {config.label}
      </div>
    );
  }

  const chartData = data.data.map((d) => ({
    ...d,
    date: d.date.slice(5),
  }));

  const Chart = config.chartType === 'bar' ? BarChart : LineChart;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-white">{config.label}</h3>
          <TrendIcon direction={data.trend_direction} />
          <span className={`text-xs ${
            data.change_rate_per_week > 0 ? 'text-emerald-400' : data.change_rate_per_week < 0 ? 'text-red-400' : 'text-slate-400'
          }`}>
            {data.change_rate_per_week > 0 ? '+' : ''}{data.change_rate_per_week}%/wk
          </span>
        </div>
        <div className="text-right">
          <span className="text-lg font-bold text-white">{data.current_value.toFixed(1)}</span>
          <span className="text-xs text-slate-500 ml-1">{config.unit}</span>
        </div>
      </div>

      <div className="text-xs text-slate-500 flex gap-4 mb-2">
        <span>7d avg: {data.avg_7day}</span>
        <span>Min: {data.min_value.toFixed(1)}</span>
        <span>Max: {data.max_value.toFixed(1)}</span>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <Chart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} width={40}
            domain={['auto', 'auto']}
          />
          <Tooltip content={<CustomTooltip />} />

          {optimalRange && (
            <ReferenceArea y1={optimalRange[0]} y2={optimalRange[1]} fill="#34d399" fillOpacity={0.08} />
          )}

          {config.chartType === 'bar' ? (
            <Bar dataKey="value" fill={config.color} radius={[2, 2, 0, 0]} name={config.label} />
          ) : (
            <>
              <Line type="monotone" dataKey="value" stroke={config.color} strokeWidth={2} dot={false} name={config.label} />
              {showMA && (
                <Line type="monotone" dataKey="ma7" stroke="#64748b" strokeWidth={1} strokeDasharray="4 4" dot={false} name="7-day MA" />
              )}
            </>
          )}
        </Chart>
      </ResponsiveContainer>
    </div>
  );
}
