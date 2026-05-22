const SCORE_COLORS = [
  { min: 0, max: 40, stroke: '#f87171', label: 'Needs Work' },
  { min: 41, max: 65, stroke: '#fbbf24', label: 'Fair' },
  { min: 66, max: 85, stroke: '#3b82f6', label: 'Good' },
  { min: 86, max: 100, stroke: '#34d399', label: 'Excellent' },
];

function getScoreConfig(score) {
  return SCORE_COLORS.find((c) => score >= c.min && score <= c.max) || SCORE_COLORS[0];
}

export default function HealthScoreGauge({ score, breakdown }) {
  const config = getScoreConfig(score);
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const offset = circumference - progress;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-44 h-44">
        <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
          <circle cx="80" cy="80" r={radius} fill="none" stroke="#1e293b" strokeWidth="10" />
          <circle
            cx="80" cy="80" r={radius} fill="none"
            stroke={config.stroke} strokeWidth="10"
            strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold text-white">{score}</span>
          <span className="text-xs text-slate-400">{config.label}</span>
        </div>
      </div>

      {breakdown && (
        <div className="mt-4 w-full max-w-[200px] space-y-2">
          {[
            { label: 'Blood Work', value: breakdown.bloodwork, max: 40, color: 'bg-blue-400' },
            { label: 'Wearables', value: breakdown.wearables, max: 35, color: 'bg-emerald-400' },
            { label: 'Supplements', value: breakdown.supplements, max: 25, color: 'bg-amber-400' },
          ].map(({ label, value, max, color }) => (
            <div key={label}>
              <div className="flex justify-between text-xs text-slate-400 mb-0.5">
                <span>{label}</span>
                <span>{value}/{max}</span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${color} rounded-full transition-all duration-700`}
                  style={{ width: `${(value / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
