import { useState } from 'react';
import { FileText, Download, Copy, Check, Stethoscope } from 'lucide-react';
import * as api from '../api/client';
import useHealthStore from '../store/healthStore';

export default function ReportPage() {
  const { showToast } = useHealthStore();
  const [report, setReport] = useState(null);
  const [doctorSummary, setDoctorSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState('full');

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const data = await api.generateReport();
      setReport(data.report);
      setTab('full');
      showToast('Report generated');
    } catch {
      showToast('Failed to generate report', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDoctorSummary = async () => {
    setLoading(true);
    try {
      const data = await api.getDoctorSummary();
      setDoctorSummary(data);
      setTab('doctor');
      showToast('Doctor summary generated');
    } catch {
      showToast('Failed to generate doctor summary', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    showToast('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (text, filename) => {
    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentText = tab === 'full' ? report : doctorSummary;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FileText className="w-7 h-7 text-cyan-400" /> Health Reports
        </h1>
        <p className="text-sm text-slate-400 mt-1">Generate comprehensive health reports and doctor summaries</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button onClick={handleGenerate} disabled={loading}
          className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6 hover:bg-slate-700/50 transition-colors text-left group disabled:opacity-50">
          <FileText className="w-10 h-10 text-cyan-400 mb-3 group-hover:scale-110 transition-transform" />
          <h3 className="text-sm font-semibold text-white mb-1">Full Health Report</h3>
          <p className="text-xs text-slate-400">
            Comprehensive report with all biomarkers, wearable data, supplements, genetics, goals, and insights
          </p>
        </button>
        <button onClick={handleDoctorSummary} disabled={loading}
          className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6 hover:bg-slate-700/50 transition-colors text-left group disabled:opacity-50">
          <Stethoscope className="w-10 h-10 text-emerald-400 mb-3 group-hover:scale-110 transition-transform" />
          <h3 className="text-sm font-semibold text-white mb-1">Doctor Summary</h3>
          <p className="text-xs text-slate-400">
            Concise summary focused on abnormal and suboptimal results, ready to share with your healthcare provider
          </p>
        </button>
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-slate-600 border-t-cyan-400 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-400">Generating report...</p>
        </div>
      )}

      {(report || doctorSummary) && !loading && (
        <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-700/50 px-4 py-3">
            <div className="flex gap-2">
              {report && (
                <button onClick={() => setTab('full')}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                    tab === 'full' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-white'
                  }`}>
                  <FileText className="w-3.5 h-3.5 inline mr-1" />Full Report
                </button>
              )}
              {doctorSummary && (
                <button onClick={() => setTab('doctor')}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                    tab === 'doctor' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400 hover:text-white'
                  }`}>
                  <Stethoscope className="w-3.5 h-3.5 inline mr-1" />Doctor Summary
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleCopy(currentText)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-700/50 rounded transition-colors">
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button onClick={() => handleDownload(currentText, tab === 'full' ? 'vitaliq-report.md' : 'doctor-summary.md')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-700/50 rounded transition-colors">
                <Download className="w-3.5 h-3.5" /> Download
              </button>
            </div>
          </div>
          <pre className="p-6 text-sm text-slate-300 whitespace-pre-wrap font-mono leading-relaxed overflow-auto max-h-[70vh]">
            {currentText}
          </pre>
        </div>
      )}

      {!report && !doctorSummary && !loading && (
        <div className="text-center py-16 text-slate-500">
          <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg">No reports generated yet</p>
          <p className="text-sm mt-1">Click one of the buttons above to generate a report</p>
        </div>
      )}
    </div>
  );
}
