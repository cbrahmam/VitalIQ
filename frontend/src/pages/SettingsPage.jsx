import { useEffect, useState } from 'react';
import { Settings } from 'lucide-react';
import useHealthStore from '../store/healthStore';

export default function SettingsPage() {
  const profile = useHealthStore((s) => s.profile);
  const fetchProfile = useHealthStore((s) => s.fetchProfile);
  const saveProfileAction = useHealthStore((s) => s.saveProfile);
  const showToast = useHealthStore((s) => s.showToast);

  const [form, setForm] = useState({
    name: '', age: '', sex: 'male', height_cm: '', weight_kg: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

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

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-7 h-7 text-amber-400" />
        <h1 className="text-2xl font-bold text-white">Settings</h1>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 max-w-lg">
        <h2 className="text-lg font-semibold text-white mb-4">Health Profile</h2>
        <p className="text-sm text-slate-400 mb-6">
          Your profile determines biomarker reference ranges. Sex is especially important as ranges differ significantly.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
              placeholder="Your name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Age</label>
              <input
                type="number"
                value={form.age}
                onChange={(e) => setForm({ ...form, age: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
                placeholder="32"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Sex</label>
              <div className="flex gap-4 mt-1">
                {['male', 'female'].map((s) => (
                  <label key={s} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="sex"
                      value={s}
                      checked={form.sex === s}
                      onChange={() => setForm({ ...form, sex: s })}
                      className="accent-emerald-500"
                    />
                    <span className="text-sm text-slate-300 capitalize">{s}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Height (cm)</label>
              <input
                type="number"
                step="0.1"
                value={form.height_cm}
                onChange={(e) => setForm({ ...form, height_cm: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
                placeholder="178"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                value={form.weight_kg}
                onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
                placeholder="77"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-emerald-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>
    </div>
  );
}
