import { useState, useEffect } from 'react';
import { Thermometer, Plus, TrendingUp, BarChart3, X, Trash2 } from 'lucide-react';
import useHealthStore from '../store/healthStore';
import * as api from '../api/client';

const SEVERITY_LABELS = ['', 'Barely noticeable', 'Very mild', 'Mild', 'Moderate-low', 'Moderate', 'Moderate-high', 'Significant', 'Severe', 'Very severe', 'Debilitating'];
const SEVERITY_COLORS = ['', 'bg-emerald-500', 'bg-emerald-400', 'bg-lime-400', 'bg-yellow-400', 'bg-amber-400', 'bg-orange-400', 'bg-orange-500', 'bg-red-400', 'bg-red-500', 'bg-red-600'];

export default function SymptomsPage() {
  const { symptoms, symptomSummary, symptomCorrelations, fetchSymptoms, addSymptom, deleteSymptom, fetchSymptomSummary, fetchSymptomCorrelations, showToast } = useHealthStore();
  const [tab, setTab] = useState('log');
  const [showForm, setShowForm] = useState(false);
  const [commonSymptoms, setCommonSymptoms] = useState([]);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    symptom: '',
    severity: 5,
    time_of_day: 'morning',
    notes: '',
  });

  useEffect(() => {
    fetchSymptoms();
    fetchSymptomSummary();
    api.getCommonSymptoms().then(setCommonSymptoms).catch(() => {});
  }, []);

  useEffect(() => {
    if (tab === 'correlations') fetchSymptomCorrelations();
  }, [tab]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.symptom.trim()) return;
    try {
      await addSymptom(form);
      showToast('Symptom logged');
      setForm({ ...form, symptom: '', severity: 5, notes: '' });
      setShowForm(false);
      fetchSymptomSummary();
    } catch {
      showToast('Failed to log symptom', 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteSymptom(id);
      showToast('Entry removed');
      fetchSymptomSummary();
    } catch {
      showToast('Failed to delete', 'error');
    }
  };

  const quickLog = (symptomName) => {
    setForm({ ...form, symptom: symptomName });
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Thermometer className="w-6 h-6 text-rose-400" />
            Symptom Journal
          </h1>
          <p className="text-sm text-slate-400 mt-1">Track symptoms and discover patterns with your health data</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-3 py-2 bg-rose-600 text-white rounded-lg text-sm hover:bg-rose-500 flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Log Symptom
        </button>
      </div>

      <div className="flex gap-1 bg-slate-900 p-1 rounded-lg w-fit">
        {[['log', 'Journal'], ['summary', 'Summary'], ['correlations', 'Correlations']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === key ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-300'}`}>
            {label}
          </button>
        ))}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-2">Quick Select</label>
            <div className="flex flex-wrap gap-2">
              {commonSymptoms.slice(0, 12).map(s => (
                <button key={s} type="button" onClick={() => setForm({ ...form, symptom: s })}
                  className={`px-3 py-1 rounded-full text-xs border transition-colors ${form.symptom === s ? 'bg-rose-600 border-rose-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Symptom</label>
              <input value={form.symptom} onChange={e => setForm({ ...form, symptom: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-rose-500 focus:outline-none"
                placeholder="e.g. Fatigue" required />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Date</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-rose-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Time of Day</label>
              <select value={form.time_of_day} onChange={e => setForm({ ...form, time_of_day: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-rose-500 focus:outline-none">
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
                <option value="evening">Evening</option>
                <option value="night">Night</option>
                <option value="all_day">All Day</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-2">
              Severity: <span className="text-white">{form.severity}/10</span> — <span className="text-slate-500">{SEVERITY_LABELS[form.severity]}</span>
            </label>
            <input type="range" min="1" max="10" value={form.severity} onChange={e => setForm({ ...form, severity: parseInt(e.target.value) })}
              className="w-full accent-rose-500" />
            <div className="flex justify-between text-xs text-slate-600 mt-1">
              <span>Mild</span><span>Moderate</span><span>Severe</span>
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Notes</label>
            <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-rose-500 focus:outline-none"
              placeholder="What were you doing? What did you eat?" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm hover:bg-rose-500">Log Symptom</button>
          </div>
        </form>
      )}

      {tab === 'log' && (
        <>
          {!showForm && symptoms.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <Thermometer className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No symptoms logged yet</p>
              <p className="text-sm mt-1">Start tracking to discover patterns</p>
              <div className="flex flex-wrap gap-2 justify-center mt-4">
                {commonSymptoms.slice(0, 6).map(s => (
                  <button key={s} onClick={() => quickLog(s)} className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-full text-xs text-slate-400 hover:border-rose-500 hover:text-rose-400">
                    + {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {symptoms.map(s => (
                <div key={s.id} className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex items-center gap-4">
                  <div className="text-center shrink-0 w-12">
                    <div className={`w-8 h-8 rounded-full mx-auto flex items-center justify-center text-sm font-bold text-white ${SEVERITY_COLORS[s.severity]}`}>
                      {s.severity}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{s.symptom}</span>
                      {s.time_of_day && <span className="text-xs text-slate-500">{s.time_of_day}</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-500">{s.date}</span>
                      {s.notes && <span className="text-xs text-slate-600">— {s.notes}</span>}
                    </div>
                  </div>
                  <button onClick={() => handleDelete(s.id)} className="text-slate-600 hover:text-red-400 p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'summary' && (
        <div>
          {symptomSummary.length === 0 ? (
            <p className="text-slate-500 text-center py-8">Not enough data for summary. Log symptoms for a few days.</p>
          ) : (
            <div className="space-y-3">
              {symptomSummary.map(s => (
                <div key={s.symptom} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white font-medium">{s.symptom}</h3>
                    <span className="text-xs text-slate-500">{s.occurrences} occurrences</span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-slate-500">Avg Severity</p>
                      <p className="text-lg font-semibold text-white">{s.avg_severity}<span className="text-xs text-slate-500">/10</span></p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Peak</p>
                      <p className="text-lg font-semibold text-white">{s.max_severity}<span className="text-xs text-slate-500">/10</span></p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Period</p>
                      <p className="text-xs text-slate-400 mt-1">{s.first_date} — {s.last_date}</p>
                    </div>
                  </div>
                  <div className="mt-2 h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${SEVERITY_COLORS[Math.round(s.avg_severity)]}`}
                      style={{ width: `${s.avg_severity * 10}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'correlations' && (
        <div className="space-y-6">
          {!symptomCorrelations ? (
            <p className="text-slate-500 text-center py-8">Loading correlations...</p>
          ) : (
            <>
              {symptomCorrelations.correlations?.length > 0 ? (
                <div>
                  <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" /> Symptom-Wearable Correlations
                  </h3>
                  <div className="space-y-2">
                    {symptomCorrelations.correlations.map((c, i) => (
                      <div key={i} className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-white font-medium">{c.symptom} &harr; {c.metric}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${Math.abs(c.correlation) > 0.6 ? 'bg-red-400/10 text-red-400' : 'bg-amber-400/10 text-amber-400'}`}>
                            r = {c.correlation}
                          </span>
                        </div>
                        <p className="text-sm text-slate-400 mt-1">{c.insight}</p>
                        <p className="text-xs text-slate-600 mt-0.5">{c.data_points} data points</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-slate-500 text-center py-4">No significant correlations found yet. Keep logging symptoms alongside wearable data.</p>
              )}

              {symptomCorrelations.patterns?.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" /> Patterns Detected
                  </h3>
                  <div className="space-y-2">
                    {symptomCorrelations.patterns.map((p, i) => (
                      <div key={i} className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex items-center gap-3">
                        <span className="text-xs px-2 py-0.5 bg-violet-400/10 text-violet-400 rounded">{p.pattern.replace(/_/g, ' ')}</span>
                        <span className="text-sm text-slate-300">{p.detail}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
