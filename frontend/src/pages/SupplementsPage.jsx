import { useEffect, useState } from 'react';
import { Pill, Plus, AlertTriangle, ArrowRightLeft, Clock } from 'lucide-react';
import SupplementStack from '../components/SupplementStack';
import useHealthStore from '../store/healthStore';
import { formatShort } from '../utils/dateUtils';

export default function SupplementsPage() {
  const supplements = useHealthStore((s) => s.supplements);
  const interactions = useHealthStore((s) => s.interactions);
  const supplementHistory = useHealthStore((s) => s.supplementHistory);
  const fetchSupplements = useHealthStore((s) => s.fetchSupplements);
  const fetchSupplementHistory = useHealthStore((s) => s.fetchSupplementHistory);
  const addSupplement = useHealthStore((s) => s.addSupplement);
  const showToast = useHealthStore((s) => s.showToast);

  const [showForm, setShowForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [form, setForm] = useState({
    name: '', dosage: '', frequency: 'daily', time_of_day: 'morning', notes: '',
  });

  useEffect(() => {
    fetchSupplements();
  }, [fetchSupplements]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.name || !form.dosage) return;
    try {
      await addSupplement(form);
      showToast(`${form.name} added to your stack`);
      setForm({ name: '', dosage: '', frequency: 'daily', time_of_day: 'morning', notes: '' });
      setShowForm(false);
    } catch {
      showToast('Failed to add supplement', 'error');
    }
  };

  const toggleHistory = () => {
    if (!showHistory) fetchSupplementHistory();
    setShowHistory(!showHistory);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Pill className="w-7 h-7 text-emerald-400" />
          <h1 className="text-2xl font-bold text-white">Supplements</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={toggleHistory}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
          >
            <Clock className="w-4 h-4" /> History
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30"
          >
            <Plus className="w-4 h-4" /> Add Supplement
          </button>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleAdd} className="bg-slate-900 border border-slate-800 rounded-lg p-5 mb-6">
          <h3 className="font-medium text-white mb-4">Add New Supplement</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Supplement name"
              required
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm col-span-2"
            />
            <input
              value={form.dosage}
              onChange={(e) => setForm({ ...form, dosage: e.target.value })}
              placeholder="Dosage (e.g., 25mg)"
              required
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
            />
            <select
              value={form.frequency}
              onChange={(e) => setForm({ ...form, frequency: e.target.value })}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
            >
              <option value="daily">Daily</option>
              <option value="twice_daily">Twice Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <select
              value={form.time_of_day}
              onChange={(e) => setForm({ ...form, time_of_day: e.target.value })}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
            >
              <option value="morning">Morning</option>
              <option value="evening">Evening</option>
              <option value="with_meals">With Meals</option>
            </select>
            <input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Notes (optional)"
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm col-span-2"
            />
            <button
              type="submit"
              className="bg-emerald-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-emerald-700"
            >
              Add
            </button>
          </div>
        </form>
      )}

      {/* Interaction warnings */}
      {interactions.length > 0 && (
        <div className="mb-6 space-y-2">
          {interactions.map((w, i) => (
            <div key={i} className={`rounded-lg p-3 flex items-start gap-3 ${
              w.interaction_type === 'inhibits_absorption'
                ? 'bg-amber-400/5 border border-amber-400/20'
                : 'bg-emerald-400/5 border border-emerald-400/20'
            }`}>
              {w.interaction_type === 'inhibits_absorption'
                ? <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                : <ArrowRightLeft className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />}
              <div className="text-sm">
                <p className={w.interaction_type === 'inhibits_absorption' ? 'text-amber-300' : 'text-emerald-300'}>
                  <strong>{w.supplement_a}</strong> {w.interaction_type === 'inhibits_absorption' ? 'may inhibit' : 'enhances'} absorption of <strong>{w.supplement_b}</strong>
                </p>
                <p className="text-slate-500 mt-0.5">{w.recommendation}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Supplement list */}
      <SupplementStack />

      {/* History */}
      {showHistory && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-white mb-3">Change History</h2>
          {supplementHistory.length === 0 ? (
            <p className="text-slate-500 text-sm">No history yet.</p>
          ) : (
            <div className="space-y-2">
              {supplementHistory.map((h) => (
                <div key={h.id} className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">
                      <strong>{h.supplement_name}</strong> — {h.action.replace('_', ' ')}
                    </span>
                    <span className="text-slate-500 text-xs">{formatShort(h.date)}</span>
                  </div>
                  {h.old_value && h.new_value && (
                    <p className="text-slate-500 mt-1">{h.old_value} &rarr; {h.new_value}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
