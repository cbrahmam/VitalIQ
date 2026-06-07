import { useState, useEffect } from 'react';
import { PillBottle, Plus, AlertTriangle, CheckCircle, Info, X, ChevronDown, ChevronUp, History } from 'lucide-react';
import useHealthStore from '../store/healthStore';
import * as api from '../api/client';

const SEVERITY_COLORS = {
  warning: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
  positive: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  info: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
};

const SEVERITY_ICONS = {
  warning: AlertTriangle,
  positive: CheckCircle,
  info: Info,
};

export default function MedicationsPage() {
  const { medications, medicationInteractions, fetchMedications, addMedication, deleteMedication, showToast } = useHealthStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', dosage: '', frequency: 'daily', prescriber: '', notes: '' });
  const [knownMeds, setKnownMeds] = useState([]);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedSections, setExpandedSections] = useState({ depletions: true, interactions: true, biomarkers: false, monitoring: true });

  useEffect(() => { fetchMedications(); }, []);
  useEffect(() => {
    api.getKnownMedications().then(setKnownMeds).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      await addMedication(form);
      setForm({ name: '', dosage: '', frequency: 'daily', prescriber: '', notes: '' });
      setShowForm(false);
      showToast('Medication added');
    } catch {
      showToast('Failed to add medication', 'error');
    }
  };

  const handleDeactivate = async (id, name) => {
    if (!confirm(`Stop tracking ${name}?`)) return;
    try {
      await deleteMedication(id);
      showToast(`${name} deactivated`);
    } catch {
      showToast('Failed to deactivate', 'error');
    }
  };

  const loadHistory = async () => {
    try {
      const data = await api.getMedicationHistory();
      setHistory(data);
      setShowHistory(true);
    } catch {
      showToast('Failed to load history', 'error');
    }
  };

  const toggleSection = (key) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

  const interactions = medicationInteractions || {};
  const hasInteractions = (interactions.med_supplement_interactions?.length > 0 ||
    interactions.nutrient_depletions?.length > 0 ||
    interactions.biomarker_effects?.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <PillBottle className="w-6 h-6 text-violet-400" />
            Medications
          </h1>
          <p className="text-sm text-slate-400 mt-1">Track prescriptions and monitor drug-nutrient interactions</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadHistory} className="px-3 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm hover:bg-slate-700 flex items-center gap-1.5">
            <History className="w-4 h-4" /> History
          </button>
          <button onClick={() => setShowForm(!showForm)} className="px-3 py-2 bg-violet-600 text-white rounded-lg text-sm hover:bg-violet-500 flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Add Medication
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Medication Name</label>
              <input list="known-meds" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none" placeholder="e.g. Metformin" required />
              <datalist id="known-meds">
                {knownMeds.map(m => <option key={m.name} value={m.name}>{m.category}</option>)}
              </datalist>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Dosage</label>
              <input value={form.dosage} onChange={e => setForm({ ...form, dosage: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none" placeholder="e.g. 500mg" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Frequency</label>
              <select value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none">
                <option value="daily">Daily</option>
                <option value="twice_daily">Twice Daily</option>
                <option value="three_times_daily">Three Times Daily</option>
                <option value="weekly">Weekly</option>
                <option value="as_needed">As Needed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Prescriber</label>
              <input value={form.prescriber} onChange={e => setForm({ ...form, prescriber: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none" placeholder="Dr. Smith" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Notes</label>
            <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none" placeholder="Optional notes" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm hover:bg-slate-700">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm hover:bg-violet-500">Add Medication</button>
          </div>
        </form>
      )}

      {medications.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <PillBottle className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No medications tracked yet</p>
          <p className="text-sm mt-1">Add your prescriptions to monitor drug-nutrient interactions</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {medications.map(med => (
            <div key={med.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-white font-medium">{med.name}</h3>
                  <p className="text-sm text-slate-400">{med.dosage} &middot; {med.frequency?.replace(/_/g, ' ')}</p>
                  {med.prescriber && <p className="text-xs text-slate-500 mt-1">Prescribed by {med.prescriber}</p>}
                  {med.notes && <p className="text-xs text-slate-500 mt-1">{med.notes}</p>}
                </div>
                <button onClick={() => handleDeactivate(med.id, med.name)} className="text-slate-600 hover:text-red-400 p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {med.started_date && (
                <p className="text-xs text-slate-600 mt-2">Since {med.started_date.slice(0, 10)}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {hasInteractions && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Interaction Analysis</h2>

          {interactions.nutrient_depletions?.length > 0 && (
            <InteractionSection title="Nutrient Depletions" sectionKey="depletions" expanded={expandedSections.depletions} toggle={toggleSection} count={interactions.nutrient_depletions.length}>
              {interactions.nutrient_depletions.map((d, i) => (
                <InteractionCard key={i} severity={d.is_supplementing ? 'positive' : 'warning'} title={`${d.medication} depletes ${d.nutrient}`} detail={d.recommendation} />
              ))}
            </InteractionSection>
          )}

          {interactions.med_supplement_interactions?.length > 0 && (
            <InteractionSection title="Drug-Supplement Interactions" sectionKey="interactions" expanded={expandedSections.interactions} toggle={toggleSection} count={interactions.med_supplement_interactions.length}>
              {interactions.med_supplement_interactions.map((ix, i) => (
                <InteractionCard key={i} severity={ix.severity} title={`${ix.medication} + ${ix.supplement}`} detail={ix.note} />
              ))}
            </InteractionSection>
          )}

          {interactions.biomarker_effects?.length > 0 && (
            <InteractionSection title="Expected Biomarker Effects" sectionKey="biomarkers" expanded={expandedSections.biomarkers} toggle={toggleSection} count={interactions.biomarker_effects.length}>
              {interactions.biomarker_effects.map((b, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-slate-800 last:border-0">
                  <span className="text-sm text-slate-300">{b.medication}</span>
                  <span className="text-xs text-slate-600">&rarr;</span>
                  <span className="text-sm text-white">{b.biomarker}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${b.expected_effect === 'increase' ? 'bg-emerald-400/10 text-emerald-400' : b.expected_effect === 'decrease' ? 'bg-blue-400/10 text-blue-400' : 'bg-amber-400/10 text-amber-400'}`}>
                    {b.expected_effect.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </InteractionSection>
          )}

          {interactions.monitoring_notes?.length > 0 && (
            <InteractionSection title="Monitoring Reminders" sectionKey="monitoring" expanded={expandedSections.monitoring} toggle={toggleSection} count={interactions.monitoring_notes.length}>
              {interactions.monitoring_notes.map((m, i) => (
                <div key={i} className="py-2 border-b border-slate-800 last:border-0">
                  <p className="text-sm text-white font-medium">{m.medication}</p>
                  <p className="text-sm text-slate-400 mt-0.5">{m.note}</p>
                </div>
              ))}
            </InteractionSection>
          )}
        </div>
      )}

      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowHistory(false)}>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-lg w-full mx-4 max-h-[70vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Medication History</h3>
              <button onClick={() => setShowHistory(false)} className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            {history.length === 0 ? (
              <p className="text-slate-500 text-sm">No history yet</p>
            ) : (
              <div className="space-y-3">
                {history.map(h => (
                  <div key={h.id} className="flex items-center gap-3 text-sm">
                    <span className="text-slate-500 shrink-0 w-20">{h.date?.slice(0, 10)}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${h.action === 'started' ? 'bg-emerald-400/10 text-emerald-400' : h.action === 'stopped' ? 'bg-red-400/10 text-red-400' : 'bg-amber-400/10 text-amber-400'}`}>
                      {h.action}
                    </span>
                    <span className="text-slate-300">{h.medication_name}</span>
                    {h.new_value && <span className="text-slate-500">{h.new_value}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-amber-400/5 border border-amber-400/20 rounded-lg p-3">
        <p className="text-xs text-amber-400/80">
          This tool is for informational purposes only. Always consult your healthcare provider about medication interactions and changes.
        </p>
      </div>
    </div>
  );
}

function InteractionSection({ title, sectionKey, expanded, toggle, count, children }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <button onClick={() => toggle(sectionKey)} className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50">
        <span className="text-sm font-medium text-white">{title} <span className="text-slate-500">({count})</span></span>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </button>
      {expanded && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function InteractionCard({ severity, title, detail }) {
  const Icon = SEVERITY_ICONS[severity] || Info;
  const color = SEVERITY_COLORS[severity] || SEVERITY_COLORS.info;
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border mb-2 last:mb-0 ${color}`}>
      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs opacity-80 mt-0.5">{detail}</p>
      </div>
    </div>
  );
}
