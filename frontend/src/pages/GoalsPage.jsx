import { useState, useEffect } from 'react';
import { Target, Plus, Trash2, Check, X } from 'lucide-react';
import useHealthStore from '../store/healthStore';

const METRIC_OPTIONS = [
  { value: 'resting_hr', label: 'Resting Heart Rate', unit: 'bpm' },
  { value: 'hrv', label: 'HRV', unit: 'ms' },
  { value: 'steps', label: 'Daily Steps', unit: 'steps' },
  { value: 'sleep_hours', label: 'Sleep Hours', unit: 'hours' },
  { value: 'body_fat', label: 'Body Fat', unit: '%' },
  { value: 'weight', label: 'Weight', unit: 'kg' },
  { value: 'vo2_max', label: 'VO2 Max', unit: 'mL/kg/min' },
  { value: 'active_calories', label: 'Active Calories', unit: 'kcal' },
  { value: 'workout_minutes', label: 'Workout Minutes', unit: 'min' },
];

const STATUS_STYLES = {
  in_progress: 'bg-blue-500/20 text-blue-300',
  achieved: 'bg-emerald-500/20 text-emerald-300',
  missed: 'bg-red-500/20 text-red-300',
};

function GoalCard({ goal, onUpdate, onDelete }) {
  const progress = goal.current_value && goal.target_value
    ? Math.min(100, (goal.current_value / goal.target_value) * 100)
    : 0;
  const metric = METRIC_OPTIONS.find(m => m.value === goal.metric_type);
  const label = metric?.label || goal.metric_type;
  const unit = metric?.unit || '';

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">{label}</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Target: {goal.target_value} {unit}
            {goal.target_date && ` by ${goal.target_date}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[goal.status] || STATUS_STYLES.in_progress}`}>
            {goal.status.replace('_', ' ')}
          </span>
          <button onClick={() => onDelete(goal.id)} className="text-slate-500 hover:text-red-400 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="mb-3">
        <div className="flex items-end justify-between mb-1">
          <span className="text-2xl font-bold text-white">
            {goal.current_value != null ? goal.current_value : '—'}
          </span>
          <span className="text-sm text-slate-400">{progress.toFixed(0)}%</span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${progress >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
      </div>

      {goal.status === 'in_progress' && (
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Update value"
            className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm text-white"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.target.value) {
                onUpdate(goal.id, { current_value: parseFloat(e.target.value) });
                e.target.value = '';
              }
            }}
          />
          <button onClick={() => onUpdate(goal.id, { status: 'achieved' })}
            className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30 transition-colors"
            title="Mark achieved">
            <Check className="w-4 h-4" />
          </button>
          <button onClick={() => onUpdate(goal.id, { status: 'missed' })}
            className="p-1.5 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
            title="Mark missed">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function GoalsPage() {
  const { goals, fetchGoals, createGoal, updateGoal, deleteGoal, showToast } = useHealthStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ metric_type: 'steps', target_value: '', target_date: '', current_value: '' });
  const [filter, setFilter] = useState('all');

  useEffect(() => { fetchGoals(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createGoal({
        metric_type: form.metric_type,
        target_value: parseFloat(form.target_value),
        target_date: form.target_date || null,
        current_value: form.current_value ? parseFloat(form.current_value) : null,
      });
      setShowForm(false);
      setForm({ metric_type: 'steps', target_value: '', target_date: '', current_value: '' });
      showToast('Goal created');
    } catch (e) {
      showToast('Failed to create goal', 'error');
    }
  };

  const handleUpdate = async (id, data) => {
    try {
      await updateGoal(id, data);
      showToast('Goal updated');
    } catch {
      showToast('Failed to update goal', 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteGoal(id);
      showToast('Goal deleted');
    } catch {
      showToast('Failed to delete goal', 'error');
    }
  };

  const filtered = filter === 'all' ? goals : goals.filter(g => g.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Target className="w-7 h-7 text-blue-400" /> Health Goals
          </h1>
          <p className="text-sm text-slate-400 mt-1">Track your health targets and progress</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> New Goal
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Metric</label>
              <select value={form.metric_type} onChange={e => setForm({ ...form, metric_type: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white">
                {METRIC_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Target Value</label>
              <input type="number" step="any" required value={form.target_value}
                onChange={e => setForm({ ...form, target_value: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white"
                placeholder="e.g. 10000" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Target Date (optional)</label>
              <input type="date" value={form.target_date}
                onChange={e => setForm({ ...form, target_date: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Current Value (optional)</label>
              <input type="number" step="any" value={form.current_value}
                onChange={e => setForm({ ...form, current_value: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white"
                placeholder="e.g. 7500" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Cancel</button>
            <button type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">Create Goal</button>
          </div>
        </form>
      )}

      <div className="flex gap-2">
        {['all', 'in_progress', 'achieved', 'missed'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              filter === f ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}>
            {f === 'all' ? 'All' : f.replace('_', ' ')}
          </button>
        ))}
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(g => (
            <GoalCard key={g.id} goal={g} onUpdate={handleUpdate} onDelete={handleDelete} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-slate-500">
          <Target className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg">No goals {filter !== 'all' ? `with status "${filter.replace('_', ' ')}"` : 'yet'}</p>
          <p className="text-sm mt-1">Create a health goal to start tracking your progress</p>
        </div>
      )}
    </div>
  );
}
