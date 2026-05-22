import { useEffect, useState } from 'react';
import { Brain, Loader2 } from 'lucide-react';
import InsightsPanel from '../components/InsightsPanel';
import useHealthStore from '../store/healthStore';

export default function InsightsPage() {
  const generateInsights = useHealthStore((s) => s.generateInsights);
  const insights = useHealthStore((s) => s.insights);
  const [initialLoading, setInitialLoading] = useState(false);

  useEffect(() => {
    if (insights.length === 0) {
      setInitialLoading(true);
      generateInsights(false).finally(() => setInitialLoading(false));
    }
  }, []);

  if (initialLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin mb-3" />
        <p className="text-slate-400 text-sm">Analyzing your health data...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Brain className="w-7 h-7 text-purple-400" />
        <h1 className="text-2xl font-bold text-white">Health Insights</h1>
      </div>
      <InsightsPanel />
    </div>
  );
}
