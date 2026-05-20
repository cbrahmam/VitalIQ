import { useState } from 'react';
import { Pill, Edit3, Trash2, X, Check } from 'lucide-react';
import useHealthStore from '../store/healthStore';

export default function SupplementStack() {
  const supplements = useHealthStore((s) => s.supplements);
  const updateSup = useHealthStore((s) => s.updateSupplement);
  const deleteSup = useHealthStore((s) => s.deleteSupplement);
  const showToast = useHealthStore((s) => s.showToast);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});

  const startEdit = (sup) => {
    setEditingId(sup.id);
    setEditData({ dosage: sup.dosage, frequency: sup.frequency, time_of_day: sup.time_of_day });
  };

  const saveEdit = async (id) => {
    try {
      await updateSup(id, editData);
      showToast('Supplement updated');
      setEditingId(null);
    } catch {
      showToast('Failed to update', 'error');
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Remove ${name} from your stack?`)) return;
    try {
      await deleteSup(id);
      showToast(`${name} removed`);
    } catch {
      showToast('Failed to remove', 'error');
    }
  };

  if (!supplements.length) {
    return (
      <div className="text-center py-12 text-slate-500">
        <Pill className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>No supplements yet. Add your first one above.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {supplements.map((sup) => (
        <div key={sup.id} className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="font-medium text-white">{sup.name}</h3>
              {editingId === sup.id ? (
                <div className="flex gap-2 mt-2 flex-wrap">
                  <input
                    value={editData.dosage}
                    onChange={(e) => setEditData({ ...editData, dosage: e.target.value })}
                    className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm w-24"
                    placeholder="Dosage"
                  />
                  <select
                    value={editData.frequency}
                    onChange={(e) => setEditData({ ...editData, frequency: e.target.value })}
                    className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm"
                  >
                    <option value="daily">Daily</option>
                    <option value="twice_daily">Twice Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                  <select
                    value={editData.time_of_day}
                    onChange={(e) => setEditData({ ...editData, time_of_day: e.target.value })}
                    className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm"
                  >
                    <option value="morning">Morning</option>
                    <option value="evening">Evening</option>
                    <option value="with_meals">With Meals</option>
                  </select>
                </div>
              ) : (
                <p className="text-sm text-slate-400 mt-0.5">
                  {sup.dosage} &middot; {sup.frequency.replace('_', ' ')} &middot; {sup.time_of_day.replace('_', ' ')}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 ml-4">
              {editingId === sup.id ? (
                <>
                  <button onClick={() => saveEdit(sup.id)} className="p-1.5 rounded hover:bg-slate-800 text-emerald-400">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => setEditingId(null)} className="p-1.5 rounded hover:bg-slate-800 text-slate-400">
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => startEdit(sup)} className="p-1.5 rounded hover:bg-slate-800 text-slate-400">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(sup.id, sup.name)} className="p-1.5 rounded hover:bg-slate-800 text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
          {sup.notes && <p className="text-xs text-slate-500 mt-2">{sup.notes}</p>}
        </div>
      ))}
    </div>
  );
}
