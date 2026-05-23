import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Activity, User, FlaskConical, Watch, Pill, Brain,
  Upload, ChevronRight, ChevronLeft, Sparkles, Check, Loader2,
} from 'lucide-react';
import useHealthStore from '../store/healthStore';
import * as api from '../api/client';

const COMMON_SUPPLEMENTS = [
  { name: 'Vitamin D3', dosage: '5000 IU', frequency: 'daily', time_of_day: 'morning' },
  { name: 'Omega-3 Fish Oil', dosage: '1000mg', frequency: 'daily', time_of_day: 'morning' },
  { name: 'Magnesium Glycinate', dosage: '400mg', frequency: 'daily', time_of_day: 'evening' },
  { name: 'Vitamin B12', dosage: '1000mcg', frequency: 'daily', time_of_day: 'morning' },
  { name: 'Zinc Glycinate', dosage: '30mg', frequency: 'daily', time_of_day: 'morning' },
  { name: 'Iron Bisglycinate', dosage: '25mg', frequency: 'daily', time_of_day: 'morning' },
  { name: 'Vitamin K2', dosage: '100mcg', frequency: 'daily', time_of_day: 'morning' },
  { name: 'Creatine', dosage: '5g', frequency: 'daily', time_of_day: 'morning' },
  { name: 'Vitamin C', dosage: '1000mg', frequency: 'daily', time_of_day: 'morning' },
  { name: 'Ashwagandha', dosage: '600mg', frequency: 'daily', time_of_day: 'evening' },
];

const STEPS = [
  { icon: User, label: 'Profile', title: 'Set Up Your Profile' },
  { icon: FlaskConical, label: 'Blood Work', title: 'Upload Blood Work' },
  { icon: Watch, label: 'Wearables', title: 'Sync Wearable Data' },
  { icon: Pill, label: 'Supplements', title: 'Enter Your Supplements' },
  { icon: Brain, label: 'Insights', title: 'Generate Your First Insights' },
];

function StepIndicator({ current, total }) {
  return (
    <div className="flex items-center gap-2 justify-center mb-8">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className={`h-1.5 rounded-full transition-all ${
          i < current ? 'w-8 bg-emerald-500' : i === current ? 'w-8 bg-emerald-400' : 'w-4 bg-slate-700'
        }`} />
      ))}
    </div>
  );
}

function ProfileStep({ form, setForm }) {
  return (
    <div className="space-y-4 max-w-sm mx-auto">
      <p className="text-sm text-slate-400 text-center mb-6">
        Your profile helps personalize biomarker ranges and health insights.
      </p>
      <div>
        <label className="block text-xs text-slate-400 mb-1">Name</label>
        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" placeholder="Your name" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Age</label>
          <input type="number" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" placeholder="30" />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Sex</label>
          <div className="flex gap-3 mt-1">
            {['male', 'female'].map(s => (
              <label key={s} className="flex items-center gap-1.5 cursor-pointer">
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
          <label className="block text-xs text-slate-400 mb-1">Height (cm)</label>
          <input type="number" step="0.1" value={form.height_cm} onChange={e => setForm({ ...form, height_cm: e.target.value })}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" placeholder="178" />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Weight (kg)</label>
          <input type="number" step="0.1" value={form.weight_kg} onChange={e => setForm({ ...form, weight_kg: e.target.value })}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" placeholder="77" />
        </div>
      </div>
    </div>
  );
}

function BloodWorkStep({ uploaded, onUpload, uploading }) {
  const onDrop = useCallback((files) => { if (files.length) onUpload(files[0]); }, [onUpload]);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'application/pdf': ['.pdf'] }, maxFiles: 1,
  });

  if (uploaded) {
    return (
      <div className="text-center py-8">
        <Check className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
        <p className="text-slate-300">Blood work uploaded successfully!</p>
        <p className="text-xs text-slate-500 mt-1">{uploaded}</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-slate-400 text-center mb-6">Upload a blood work PDF to parse your biomarkers.</p>
      <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
        isDragActive ? 'border-blue-400 bg-blue-500/10' : 'border-slate-700 hover:border-blue-500/50'
      }`}>
        <input {...getInputProps()} />
        {uploading ? (
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto" />
        ) : (
          <>
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-300">Drop your lab PDF here</p>
            <p className="text-xs text-slate-500 mt-1">Supports standard lab report formats</p>
          </>
        )}
      </div>
    </div>
  );
}

function WearableStep({ uploaded, onUpload, uploading }) {
  const sources = [
    { key: 'apple_health', label: 'Apple Health', ext: '.xml', accept: { 'text/xml': ['.xml'] } },
    { key: 'whoop', label: 'Whoop', ext: '.csv', accept: { 'text/csv': ['.csv'] } },
    { key: 'garmin', label: 'Garmin', ext: '.csv', accept: { 'text/csv': ['.csv'] } },
  ];

  return (
    <div>
      <p className="text-sm text-slate-400 text-center mb-6">Import data from your wearable devices.</p>
      <div className="grid grid-cols-3 gap-4">
        {sources.map(s => {
          const done = uploaded[s.key];
          return (
            <DropCard key={s.key} label={s.label} accept={s.accept}
              done={done} uploading={uploading === s.key}
              onDrop={files => files.length && onUpload(s.key, files[0])} />
          );
        })}
      </div>
    </div>
  );
}

function DropCard({ label, accept, done, uploading, onDrop }) {
  const { getRootProps, getInputProps } = useDropzone({ onDrop, accept, maxFiles: 1 });
  return (
    <div {...getRootProps()} className={`border border-slate-700 rounded-lg p-4 text-center cursor-pointer hover:border-slate-500 transition-colors ${done ? 'bg-emerald-500/10 border-emerald-500/30' : ''}`}>
      <input {...getInputProps()} />
      {uploading ? <Loader2 className="w-6 h-6 text-blue-400 animate-spin mx-auto mb-2" />
        : done ? <Check className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
        : <Upload className="w-6 h-6 text-slate-500 mx-auto mb-2" />}
      <p className="text-sm text-slate-300">{label}</p>
      {done && <p className="text-[10px] text-emerald-400 mt-1">{done}</p>}
    </div>
  );
}

function SupplementStep({ added, onAdd }) {
  return (
    <div>
      <p className="text-sm text-slate-400 text-center mb-6">Quick-add common supplements to your stack.</p>
      <div className="grid grid-cols-2 gap-2">
        {COMMON_SUPPLEMENTS.map(s => {
          const isAdded = added.includes(s.name);
          return (
            <button key={s.name} onClick={() => !isAdded && onAdd(s)}
              disabled={isAdded}
              className={`flex items-center justify-between p-3 rounded-lg border text-left text-sm transition-colors ${
                isAdded ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' :
                'border-slate-700 hover:border-slate-500 text-slate-300'
              }`}>
              <span>{s.name}</span>
              <span className="text-xs text-slate-500">{isAdded ? <Check className="w-4 h-4" /> : s.dosage}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function InsightsStep({ generating, done }) {
  return (
    <div className="text-center py-8">
      {generating ? (
        <>
          <Loader2 className="w-12 h-12 text-emerald-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-300">Analyzing your health data...</p>
          <p className="text-xs text-slate-500 mt-1">Finding patterns and generating insights</p>
        </>
      ) : done ? (
        <>
          <Sparkles className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
          <p className="text-lg font-semibold text-white">Your insights are ready!</p>
          <p className="text-sm text-slate-400 mt-2">Head to the dashboard to see your health overview.</p>
        </>
      ) : (
        <>
          <Brain className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-300">Ready to analyze your data</p>
          <p className="text-xs text-slate-500 mt-1">We'll find patterns, flag risks, and generate personalized insights</p>
        </>
      )}
    </div>
  );
}

export default function Onboarding({ onComplete }) {
  const { saveProfile, uploadBloodWork, uploadWearable, addSupplement, generateInsights, showToast } = useHealthStore();
  const [step, setStep] = useState(0);
  const [profileForm, setProfileForm] = useState({ name: '', age: '', sex: 'male', height_cm: '', weight_kg: '' });
  const [bloodworkResult, setBloodworkResult] = useState(null);
  const [bloodworkUploading, setBloodworkUploading] = useState(false);
  const [wearableResults, setWearableResults] = useState({});
  const [wearableUploading, setWearableUploading] = useState(null);
  const [addedSupplements, setAddedSupplements] = useState([]);
  const [insightsGenerating, setInsightsGenerating] = useState(false);
  const [insightsDone, setInsightsDone] = useState(false);
  const [sampleLoading, setSampleLoading] = useState(false);

  const handleSaveProfile = async () => {
    try {
      await saveProfile({
        name: profileForm.name || null,
        age: profileForm.age ? parseInt(profileForm.age) : null,
        sex: profileForm.sex,
        height_cm: profileForm.height_cm ? parseFloat(profileForm.height_cm) : null,
        weight_kg: profileForm.weight_kg ? parseFloat(profileForm.weight_kg) : null,
      });
    } catch { /* continue anyway */ }
  };

  const handleBloodworkUpload = async (file) => {
    setBloodworkUploading(true);
    try {
      const result = await uploadBloodWork(file);
      setBloodworkResult(`${result.biomarkers?.length || 0} biomarkers parsed`);
    } catch (e) {
      showToast(e.response?.data?.detail || 'Upload failed', 'error');
    } finally {
      setBloodworkUploading(false);
    }
  };

  const handleWearableUpload = async (source, file) => {
    setWearableUploading(source);
    try {
      const result = await uploadWearable(source, file);
      setWearableResults(prev => ({ ...prev, [source]: `${result.records_imported} records` }));
    } catch (e) {
      showToast('Upload failed', 'error');
    } finally {
      setWearableUploading(null);
    }
  };

  const handleAddSupplement = async (supp) => {
    try {
      await addSupplement(supp);
      setAddedSupplements(prev => [...prev, supp.name]);
    } catch {
      showToast('Failed to add supplement', 'error');
    }
  };

  const handleGenerateInsights = async () => {
    setInsightsGenerating(true);
    try {
      await generateInsights(true);
      setInsightsDone(true);
    } catch {
      showToast('Failed to generate insights', 'error');
    } finally {
      setInsightsGenerating(false);
    }
  };

  const handleLoadSample = async () => {
    setSampleLoading(true);
    try {
      await api.loadSampleData();
      showToast('Sample data loaded!');
      onComplete();
    } catch {
      showToast('Failed to load sample data', 'error');
    } finally {
      setSampleLoading(false);
    }
  };

  const handleNext = async () => {
    if (step === 0) await handleSaveProfile();
    if (step === 4 && !insightsDone) {
      await handleGenerateInsights();
      return;
    }
    if (step === 4 && insightsDone) {
      onComplete();
      return;
    }
    setStep(s => s + 1);
  };

  const { icon: StepIcon } = STEPS[step];

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Activity className="w-8 h-8 text-emerald-400" />
            <span className="text-2xl font-bold text-white">VitalIQ</span>
          </div>
          <p className="text-slate-500 text-sm">AI Health Intelligence Platform</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8">
          <StepIndicator current={step} total={STEPS.length} />

          <div className="flex items-center gap-2 justify-center mb-6">
            <StepIcon className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-semibold text-white">{STEPS[step].title}</h2>
          </div>

          {step === 0 && <ProfileStep form={profileForm} setForm={setProfileForm} />}
          {step === 1 && <BloodWorkStep uploaded={bloodworkResult} onUpload={handleBloodworkUpload} uploading={bloodworkUploading} />}
          {step === 2 && <WearableStep uploaded={wearableResults} onUpload={handleWearableUpload} uploading={wearableUploading} />}
          {step === 3 && <SupplementStep added={addedSupplements} onAdd={handleAddSupplement} />}
          {step === 4 && <InsightsStep generating={insightsGenerating} done={insightsDone} />}

          <div className="flex items-center justify-between mt-8">
            {step > 0 ? (
              <button onClick={() => setStep(s => s - 1)} className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            ) : <div />}
            <div className="flex gap-3">
              {step > 0 && step < 4 && (
                <button onClick={() => setStep(s => s + 1)} className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
                  Skip
                </button>
              )}
              <button onClick={handleNext}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors">
                {step === 4
                  ? (insightsDone ? 'Go to Dashboard' : (insightsGenerating ? 'Analyzing...' : 'Generate Insights'))
                  : <>Next <ChevronRight className="w-4 h-4" /></>}
              </button>
            </div>
          </div>
        </div>

        <div className="text-center mt-6">
          <button onClick={handleLoadSample} disabled={sampleLoading}
            className="text-sm text-slate-500 hover:text-emerald-400 transition-colors disabled:opacity-50">
            {sampleLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading sample data...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5" /> Try VitalIQ with sample data
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
