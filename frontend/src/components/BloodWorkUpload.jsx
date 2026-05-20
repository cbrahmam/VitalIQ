import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Loader2 } from 'lucide-react';
import useHealthStore from '../store/healthStore';

export default function BloodWorkUpload({ onUploadComplete }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const uploadBloodWork = useHealthStore((s) => s.uploadBloodWork);
  const showToast = useHealthStore((s) => s.showToast);

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const result = await uploadBloodWork(file);
      showToast(`Parsed ${result.biomarkers.length} biomarkers from ${file.name}`);
      onUploadComplete?.(result);
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to upload blood work';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setUploading(false);
    }
  }, [uploadBloodWork, showToast, onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    disabled: uploading,
  });

  return (
    <div>
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-emerald-400 bg-emerald-400/5' : 'border-slate-700 hover:border-slate-500 bg-slate-900/50'}
          ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
            <p className="text-slate-400">Parsing blood work PDF...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            {isDragActive ? (
              <FileText className="w-10 h-10 text-emerald-400" />
            ) : (
              <Upload className="w-10 h-10 text-slate-500" />
            )}
            <div>
              <p className="text-slate-300 font-medium">
                {isDragActive ? 'Drop your PDF here' : 'Drag & drop a blood work PDF'}
              </p>
              <p className="text-sm text-slate-500 mt-1">or click to browse</p>
            </div>
          </div>
        )}
      </div>
      {error && (
        <p className="mt-3 text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}
