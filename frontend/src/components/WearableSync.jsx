import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Loader2, CheckCircle2 } from 'lucide-react';
import useHealthStore from '../store/healthStore';
import { formatShort } from '../utils/dateUtils';

export default function WearableSync({ source, label, icon: Icon, accept, description }) {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const uploadWearable = useHealthStore((s) => s.uploadWearable);
  const syncStatus = useHealthStore((s) => s.syncStatus);
  const showToast = useHealthStore((s) => s.showToast);

  const status = syncStatus.find((s) => s.source === source);

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const res = await uploadWearable(source, file);
      setResult(res);
      showToast(`Imported ${res.records_imported} records from ${label}`);
    } catch (err) {
      const msg = err.response?.data?.detail || `Failed to upload ${label} data`;
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setUploading(false);
    }
  }, [uploadWearable, source, label, showToast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles: 1,
    disabled: uploading,
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
      <div className="flex items-center gap-3 mb-3">
        <Icon className="w-6 h-6 text-blue-400" />
        <div>
          <h3 className="font-medium text-white">{label}</h3>
          {status && (
            <p className="text-xs text-slate-500">
              Last synced: {formatShort(status.last_sync_date)} | {status.record_count} records | Data through {status.latest_data_date || '—'}
            </p>
          )}
          {!status && <p className="text-xs text-slate-500">No data synced yet</p>}
        </div>
      </div>

      <div
        {...getRootProps()}
        className={`border border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors text-sm
          ${isDragActive ? 'border-blue-400 bg-blue-400/5' : 'border-slate-700 hover:border-slate-500'}
          ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Processing...</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 text-slate-400">
            <Upload className="w-4 h-4" />
            <span>{isDragActive ? 'Drop file here' : description}</span>
          </div>
        )}
      </div>

      {result && (
        <div className="mt-3 bg-emerald-400/5 border border-emerald-400/20 rounded-lg p-3 text-sm">
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            <span>{result.records_imported} imported, {result.records_skipped} skipped</span>
          </div>
          {result.date_range.start && (
            <p className="text-slate-500 mt-1">
              Date range: {result.date_range.start} to {result.date_range.end}
            </p>
          )}
          {result.metrics_found.length > 0 && (
            <p className="text-slate-500 mt-1">
              Metrics: {result.metrics_found.join(', ')}
            </p>
          )}
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </div>
  );
}
