import { useEffect, useState } from 'react';
import { Settings, Download, Trash2, AlertTriangle, Database, RefreshCw } from 'lucide-react';
import useHealthStore from '../store/healthStore';
import * as api from '../api/client';

const DATA_SOURCES = [
  { key: 'bloodwork', label: 'Blood Work', desc: 'Lab reports and biomarker data' },
  { key: 'wearables', label: 'Wearable Data', desc: 'Apple Health, Whoop, Garmin records' },
  { key: 'supplements', label: 'Supplements', desc: 'Active supplements and history' },
  { key: 'genetics', label: 'Genetics', desc: 'Genetic markers from 23andMe' },
  { key: 'insights', label: 'AI Insights', desc: 'Generated health insights' },
  { key: 'goals', label: 'Goals', desc: 'Health goals and progress' },
];

export default function SettingsPage() {
  const profile = useHealthStore((s) => s.profile);
  const fetchProfile = useHealthStore((s) => s.fetchProfile);
  const saveProfileAction = useHealthStore((s) => s.saveProfile);
  const showToast = useHealthStore((s) => s.showToast);

  const [form, setForm] = useState({ name: '', age: '', sex: 'male', height_cm: '', weight_kg: '' });
  const [saving, setSaving] = useState(false);
  const [dataStatus, setDataStatus] = useState(null);
  const [clearConfirm, setClearConfirm] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [sampleLoading, setSampleLoading] = useState(false);

  useEffect(() => { fetchProfile(); loadDataStatus(); }, []);

  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name || '',
        age: profile.age || '',
        sex: profile.sex || 'male',
        height_cm: profile.height_cm || '',
        weight_kg: profile.weight_kg || '',
      });
    }
  }, [profile]);

  const loadDataStatus = async () => {
    try {
      const data = await api.checkHasData();
      setDataStatus(data);
    } catch { /* ignore */ }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveProfileAction({
        ...form,
        age: form.age ? parseInt(form.age) : null,
        height_cm: form.height_cm ? parseFloat(form.height_cm) : null,
        weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
      });
      showToast('Profile saved');
    } catch {
      showToast('Failed to save profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await api.exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vitaliq-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Data exported');
    } catch {
      showToast('Export failed', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleClearSource = async (source) => {
    try {
      await api.clearSourceData(source);
      showToast(`${source} data cleared`);
      setClearConfirm(null);
      await loadDataStatus();
    } catch {
      showToast('Failed to clear data', 'error');
    }
  };

  const handleClearAll = async () => {
    try {
      await api.clearAllData();
      showToast('All data cleared');
      setClearConfirm(null);
      await loadDataStatus();
      await fetchProfile();
    } catch {
      showToast('Failed to clear data', 'error');
    }
  };

  const handleLoadSample = async () => {
    setSampleLoading(true);
    try {
      await api.loadSampleData();
      showToast('Sample data loaded!');
      await loadDataStatus();
      await fetchProfile();
    } catch {
      showToast('Failed to load sample data', 'error');
    } finally {
      setSampleLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Settings className="w-7 h-7 text-amber-400" />
        <h1 className="text-2xl font-bold text-white">Settings</h1>
      </div>

      {/* Health Profile */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 max-w-lg">
        <h2 className="text-lg font-semibold text-white mb-1">Health Profile</h2>
        <p className="text-sm text-slate-400 mb-6">Your profile determines biomarker reference ranges.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Name</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" placeholder="Your name" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Age</label>
              <input type="number" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" placeholder="32" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Sex</label>
              <div className="flex gap-4 mt-1">
                {['male', 'female'].map(s => (
                  <label key={s} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="sex" value={s} checked={form.sex === s}
                      onChange={() => setForm({ ...form, sex: s })} className="accent-emerald-500" />
                    <span className="text-sm text-slate-300 capitalize">{s}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Height (cm)</label>
              <input type="number" step="0.1" value={form.height_cm} onChange={e => setForm({ ...form, height_cm: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" placeholder="178" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Weight (kg)</label>
              <input type="number" step="0.1" value={form.weight_kg} onChange={e => setForm({ ...form, weight_kg: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" placeholder="77" />
            </div>
          </div>
          <button type="submit" disabled={saving}
            className="w-full bg-emerald-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>

      {/* Data Management */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-1">Data Management</h2>
        <p className="text-sm text-slate-400 mb-6">Manage your health data sources. All data is stored locally.</p>

        <div className="space-y-3 mb-6">
          {DATA_SOURCES.map(ds => (
            <div key={ds.key} className="flex items-center justify-between py-3 border-b border-slate-800 last:border-0">
              <div>
                <p className="text-sm text-slate-200">{ds.label}</p>
                <p className="text-xs text-slate-500">{ds.desc}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded ${
                  dataStatus?.[`has_${ds.key}`] ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-400'
                }`}>
                  {dataStatus?.[`has_${ds.key}`] ? 'Has data' : 'Empty'}
                </span>
                {clearConfirm === ds.key ? (
                  <div className="flex gap-2">
                    <button onClick={() => handleClearSource(ds.key)}
                      className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30">Confirm</button>
                    <button onClick={() => setClearConfirm(null)}
                      className="text-xs px-2 py-1 text-slate-400 hover:text-white">Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setClearConfirm(ds.key)}
                    className="text-xs text-slate-500 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 flex-wrap">
          <button onClick={handleExport} disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg transition-colors disabled:opacity-50">
            <Download className="w-4 h-4" /> {exporting ? 'Exporting...' : 'Export All Data (JSON)'}
          </button>
          <button onClick={handleLoadSample} disabled={sampleLoading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-sm rounded-lg transition-colors disabled:opacity-50">
            <Database className="w-4 h-4" /> {sampleLoading ? 'Loading...' : 'Load Sample Data'}
          </button>
          {clearConfirm === 'all' ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-400">Delete ALL data?</span>
              <button onClick={handleClearAll}
                className="text-xs px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700">Yes, Clear All</button>
              <button onClick={() => setClearConfirm(null)}
                className="text-xs px-3 py-1.5 text-slate-400 hover:text-white">Cancel</button>
            </div>
          ) : (
            <button onClick={() => setClearConfirm('all')}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm rounded-lg transition-colors">
              <Trash2 className="w-4 h-4" /> Clear All Data
            </button>
          )}
        </div>
      </div>

      {/* About */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-1">About VitalIQ</h2>
        <p className="text-sm text-slate-400 mt-2">Version 0.1.0</p>
        <p className="text-sm text-slate-500 mt-2">
          VitalIQ is an AI health intelligence platform that integrates blood work, wearable data,
          supplements, and genetics to provide personalized health insights.
        </p>
        <div className="mt-4 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-300">
              This tool is for informational purposes only and does not constitute medical advice.
              Always consult your healthcare provider before making changes to your health regimen.
            </p>
          </div>
        </div>
        <p className="text-xs text-slate-600 mt-4">All data is stored locally on your device. No data is sent to third parties.</p>
      </div>
    </div>
  );
}
