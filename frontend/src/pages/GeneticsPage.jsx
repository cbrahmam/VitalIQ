import { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Dna, Upload, AlertTriangle, Shield, Info, ChevronDown, ChevronRight, Pill } from 'lucide-react';
import useHealthStore from '../store/healthStore';

const RISK_STYLES = {
  elevated: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', badge: 'bg-red-500/20 text-red-300' },
  moderate: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-300' },
  normal: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', badge: 'bg-emerald-500/20 text-emerald-300' },
  protective: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', badge: 'bg-blue-500/20 text-blue-300' },
  unknown: { bg: 'bg-slate-500/10', border: 'border-slate-500/30', text: 'text-slate-400', badge: 'bg-slate-500/20 text-slate-300' },
};

function RiskBadge({ level }) {
  const s = RISK_STYLES[level] || RISK_STYLES.unknown;
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.badge}`}>{level}</span>;
}

function CategorySection({ category, markers }) {
  const [open, setOpen] = useState(true);
  const elevated = markers.filter(m => m.risk_level === 'elevated').length;
  const moderate = markers.filter(m => m.risk_level === 'moderate').length;

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-700/30 transition-colors">
        <div className="flex items-center gap-3">
          {open ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
          <h3 className="text-sm font-semibold text-slate-200 capitalize">{category.replace(/_/g, ' ')}</h3>
          <span className="text-xs text-slate-500">{markers.length} variant{markers.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-2">
          {elevated > 0 && <span className="text-xs bg-red-500/20 text-red-300 px-2 py-0.5 rounded">{elevated} elevated</span>}
          {moderate > 0 && <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded">{moderate} moderate</span>}
        </div>
      </button>
      {open && (
        <div className="border-t border-slate-700/50">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-slate-500 uppercase">
                <th className="text-left px-4 py-2">Gene</th>
                <th className="text-left px-4 py-2">RSID</th>
                <th className="text-left px-4 py-2">Genotype</th>
                <th className="text-left px-4 py-2">Risk</th>
                <th className="text-left px-4 py-2">Description</th>
              </tr>
            </thead>
            <tbody>
              {markers.map(m => {
                const s = RISK_STYLES[m.risk_level] || RISK_STYLES.unknown;
                return (
                  <tr key={m.rsid} className={`border-t border-slate-700/30 ${s.bg}`}>
                    <td className="px-4 py-3 text-sm font-medium text-slate-200">{m.gene}</td>
                    <td className="px-4 py-3 text-sm text-slate-400 font-mono">{m.rsid}</td>
                    <td className="px-4 py-3 text-sm text-slate-300 font-mono font-semibold">{m.genotype}</td>
                    <td className="px-4 py-3"><RiskBadge level={m.risk_level} /></td>
                    <td className="px-4 py-3 text-sm text-slate-400 max-w-md">{m.description}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ImplicationCard({ impl }) {
  const s = RISK_STYLES[impl.risk_level] || RISK_STYLES.unknown;
  return (
    <div className={`rounded-lg border p-4 ${s.bg} ${s.border}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-200">{impl.gene}</span>
          <span className="text-xs font-mono text-slate-400">{impl.rsid} {impl.genotype}</span>
          <RiskBadge level={impl.risk_level} />
        </div>
        {impl.biomarker_status && (
          <span className={`text-xs px-2 py-0.5 rounded ${
            impl.biomarker_status === 'optimal' ? 'bg-emerald-500/20 text-emerald-300' :
            impl.biomarker_status === 'suboptimal' ? 'bg-amber-500/20 text-amber-300' :
            'bg-red-500/20 text-red-300'
          }`}>{impl.biomarker}: {impl.biomarker_value} ({impl.biomarker_status})</span>
        )}
      </div>
      <p className="text-sm text-slate-300 mb-3">{impl.implication}</p>
      {impl.supplement_recommendation && (
        <div className="flex items-start gap-2 bg-slate-900/40 rounded p-3">
          <Pill className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
          <p className="text-xs text-slate-400">{impl.supplement_recommendation}</p>
        </div>
      )}
    </div>
  );
}

export default function GeneticsPage() {
  const { geneticMarkers, geneticImplications, geneticDisclaimer, fetchGeneticMarkers, fetchGeneticImplications, uploadGenetics, showToast } = useHealthStore();
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [tab, setTab] = useState('markers');

  useEffect(() => {
    fetchGeneticMarkers();
    fetchGeneticImplications();
  }, []);

  const onDrop = useCallback(async (files) => {
    if (!files.length) return;
    setUploading(true);
    setUploadResult(null);
    try {
      const result = await uploadGenetics(files[0]);
      setUploadResult(result);
      await fetchGeneticImplications();
      showToast(`Uploaded ${result.markers_found} genetic markers`);
    } catch (e) {
      showToast(e.response?.data?.detail || 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/plain': ['.txt'], 'text/tab-separated-values': ['.tsv'] },
    maxFiles: 1,
  });

  const grouped = {};
  geneticMarkers.forEach(m => {
    if (!grouped[m.category]) grouped[m.category] = [];
    grouped[m.category].push(m);
  });

  const elevatedCount = geneticMarkers.filter(m => m.risk_level === 'elevated').length;
  const moderateCount = geneticMarkers.filter(m => m.risk_level === 'moderate').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Dna className="w-7 h-7 text-purple-400" /> Genetics
        </h1>
        <p className="text-sm text-slate-400 mt-1">Upload your 23andMe raw data for genetic insights</p>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
        <p className="text-sm text-amber-200">{geneticDisclaimer || 'Genetic insights are for educational purposes only. Consult a genetic counselor for medical decisions.'}</p>
      </div>

      <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
        isDragActive ? 'border-purple-400 bg-purple-500/10' : 'border-slate-700 hover:border-purple-500/50 hover:bg-slate-800/50'
      }`}>
        <input {...getInputProps()} />
        <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3" />
        {uploading ? (
          <p className="text-slate-300">Processing genetic data...</p>
        ) : (
          <>
            <p className="text-slate-300">Drop your 23andMe raw data file here, or click to browse</p>
            <p className="text-xs text-slate-500 mt-1">Accepts .txt or .tsv files from 23andMe</p>
          </>
        )}
      </div>

      {uploadResult && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
          <p className="text-sm text-emerald-300 font-medium">Upload Complete</p>
          <p className="text-sm text-slate-400 mt-1">
            Found {uploadResult.markers_found} recognized genetic markers across{' '}
            {Object.keys(uploadResult.categories || {}).length} categories
          </p>
        </div>
      )}

      {geneticMarkers.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-4">
              <p className="text-xs text-slate-500 uppercase mb-1">Total Markers</p>
              <p className="text-2xl font-bold text-white">{geneticMarkers.length}</p>
            </div>
            <div className="bg-red-500/10 rounded-lg border border-red-500/30 p-4">
              <p className="text-xs text-slate-500 uppercase mb-1">Elevated Risk</p>
              <p className="text-2xl font-bold text-red-400">{elevatedCount}</p>
            </div>
            <div className="bg-amber-500/10 rounded-lg border border-amber-500/30 p-4">
              <p className="text-xs text-slate-500 uppercase mb-1">Moderate Risk</p>
              <p className="text-2xl font-bold text-amber-400">{moderateCount}</p>
            </div>
          </div>

          <div className="flex gap-2 border-b border-slate-700 pb-2">
            <button onClick={() => setTab('markers')}
              className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${tab === 'markers' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-slate-400 hover:text-slate-200'}`}>
              <Dna className="w-4 h-4 inline mr-1.5" />Markers ({geneticMarkers.length})
            </button>
            <button onClick={() => setTab('implications')}
              className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${tab === 'implications' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-slate-400 hover:text-slate-200'}`}>
              <Info className="w-4 h-4 inline mr-1.5" />Implications ({geneticImplications.length})
            </button>
          </div>

          {tab === 'markers' && (
            <div className="space-y-4">
              {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([cat, markers]) => (
                <CategorySection key={cat} category={cat} markers={markers} />
              ))}
            </div>
          )}

          {tab === 'implications' && (
            <div className="space-y-4">
              {geneticImplications.length > 0 ? (
                geneticImplications.map((impl, i) => <ImplicationCard key={i} impl={impl} />)
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No actionable implications found.</p>
                  <p className="text-xs mt-1">Upload blood work data to see genetic-biomarker cross-references.</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {geneticMarkers.length === 0 && !uploading && !uploadResult && (
        <div className="text-center py-16 text-slate-500">
          <Dna className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg">No genetic data uploaded yet</p>
          <p className="text-sm mt-1">Upload your 23andMe raw data file to see personalized genetic insights</p>
        </div>
      )}
    </div>
  );
}
