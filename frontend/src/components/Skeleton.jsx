export function SkeletonLine({ width = 'w-full', height = 'h-4' }) {
  return <div className={`${width} ${height} bg-slate-800 rounded animate-pulse`} />;
}

export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-3">
      <SkeletonLine width="w-1/3" height="h-3" />
      <SkeletonLine width="w-1/2" height="h-6" />
      {Array.from({ length: lines - 2 }, (_, i) => (
        <SkeletonLine key={i} width={i % 2 === 0 ? 'w-full' : 'w-3/4'} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
      <div className="p-4 border-b border-slate-800">
        <SkeletonLine width="w-1/4" height="h-5" />
      </div>
      <div className="p-4 space-y-3">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex gap-4">
            {Array.from({ length: cols }, (_, j) => (
              <SkeletonLine key={j} width={j === 0 ? 'w-1/4' : 'w-1/6'} height="h-4" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex justify-between">
        <div className="space-y-2">
          <SkeletonLine width="w-32" height="h-8" />
          <SkeletonLine width="w-48" height="h-4" />
        </div>
        <div className="flex gap-2">
          <SkeletonLine width="w-24" height="h-9" />
          <SkeletonLine width="w-28" height="h-9" />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Array.from({ length: 5 }, (_, i) => <SkeletonCard key={i} lines={3} />)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-lg p-4 h-44" />
        ))}
      </div>
    </div>
  );
}
