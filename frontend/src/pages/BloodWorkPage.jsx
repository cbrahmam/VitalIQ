import { useEffect, useState } from 'react';
import { FlaskConical, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import BloodWorkUpload from '../components/BloodWorkUpload';
import SparklineChart from '../components/SparklineChart';
import BiomarkerDeepDive from '../components/BiomarkerDeepDive';
import useHealthStore from '../store/healthStore';
import { groupByCategory, getStatusStyle, categoryLabels } from '../utils/biomarkerUtils';
import { formatValue } from '../utils/formatters';
import { formatShort } from '../utils/dateUtils';
import * as api from '../api/client';

function StatusBadge({ status }) {
  const style = getStatusStyle(status);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.color} border ${style.border}`}>
      {style.label}
    </span>
  );
}

function BiomarkerRow({ bm, onNameClick }) {
  const [history, setHistory] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!loaded) {
      api.getBiomarkerHistory(bm.name).then((data) => {
        setHistory(data);
        setLoaded(true);
      }).catch(() => setLoaded(true));
    }
  }, [bm.name, loaded]);

  const sparkData = history && history.length >= 2
    ? history.map((h) => ({ value: h.value }))
    : null;

  const statusStyle = getStatusStyle(bm.status);
  const sparkColor = statusStyle.color.includes('emerald') ? '#34d399'
    : statusStyle.color.includes('blue') ? '#3b82f6'
    : statusStyle.color.includes('amber') ? '#fbbf24'
    : statusStyle.color.includes('red') ? '#f87171'
    : statusStyle.color.includes('purple') ? '#a78bfa'
    : '#3b82f6';

  return (
    <tr className="border-b border-slate-800/50 hover:bg-slate-800/30">
      <td className="py-2.5 px-4">
        <button onClick={() => onNameClick?.(bm.name)} className="text-slate-200 hover:text-blue-400 transition-colors text-left">
          {bm.name}
        </button>
      </td>
      <td className="py-2.5 px-4 text-right font-mono text-white">
        {formatValue(bm.value, bm.unit)}
      </td>
      <td className="py-2.5 px-4 text-right text-slate-500 font-mono text-xs">
        {bm.lab_reference_low != null && bm.lab_reference_high != null
          ? `${bm.lab_reference_low} - ${bm.lab_reference_high}`
          : '—'}
      </td>
      <td className="py-2.5 px-4 text-right text-slate-500 font-mono text-xs">
        {bm.optimal_low != null && bm.optimal_high != null
          ? `${bm.optimal_low} - ${bm.optimal_high}`
          : '—'}
      </td>
      <td className="py-2.5 px-4 text-center">
        <StatusBadge status={bm.status} />
      </td>
      <td className="py-2.5 px-4 text-center">
        {sparkData ? (
          <div className="inline-block">
            <SparklineChart data={sparkData} color={sparkColor} width={60} height={20} />
          </div>
        ) : (
          <span className="text-xs text-slate-600">—</span>
        )}
      </td>
    </tr>
  );
}

function BiomarkerTable({ biomarkers, onNameClick }) {
  const groups = groupByCategory(biomarkers);

  return (
    <div className="space-y-6">
      {groups.map(({ category, label, biomarkers: items }) => (
        <div key={category}>
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">{label}</h3>
          <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500">
                  <th className="text-left py-2 px-4 font-medium">Biomarker</th>
                  <th className="text-right py-2 px-4 font-medium">Value</th>
                  <th className="text-right py-2 px-4 font-medium">Ref Range</th>
                  <th className="text-right py-2 px-4 font-medium">Optimal</th>
                  <th className="text-center py-2 px-4 font-medium">Status</th>
                  <th className="text-center py-2 px-4 font-medium">Trend</th>
                </tr>
              </thead>
              <tbody>
                {items.map((bm) => (
                  <BiomarkerRow key={bm.id || bm.name} bm={bm} onNameClick={onNameClick} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function BloodWorkPage() {
  const reports = useHealthStore((s) => s.reports);
  const fetchReports = useHealthStore((s) => s.fetchReports);
  const fetchReport = useHealthStore((s) => s.fetchReport);
  const [latestResult, setLatestResult] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [expandedReportId, setExpandedReportId] = useState(null);
  const [deepDiveBiomarker, setDeepDiveBiomarker] = useState(null);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleUploadComplete = (result) => {
    setLatestResult(result);
    setExpandedReportId(null);
  };

  const handleExpandReport = async (reportId) => {
    if (expandedReportId === reportId) {
      setExpandedReportId(null);
      setSelectedReport(null);
      return;
    }
    const data = await fetchReport(reportId);
    setSelectedReport(data);
    setExpandedReportId(reportId);
    setLatestResult(null);
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <FlaskConical className="w-7 h-7 text-blue-400" />
        <h1 className="text-2xl font-bold text-white">Blood Work</h1>
      </div>

      <BloodWorkUpload onUploadComplete={handleUploadComplete} />

      {/* Just-uploaded result */}
      {latestResult && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Parsed Results</h2>
              <div className="flex gap-4 mt-1 text-sm text-slate-400">
                {latestResult.lab_name && <span>Lab: {latestResult.lab_name}</span>}
                {latestResult.report_date && <span>Date: {latestResult.report_date}</span>}
                <span>Confidence: {latestResult.parse_confidence}</span>
                <span>{latestResult.biomarkers.length} biomarkers</span>
              </div>
            </div>
          </div>

          {latestResult.warnings.length > 0 && (
            <div className="bg-amber-400/5 border border-amber-400/20 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2 text-amber-400 text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium">Parse Warnings</span>
              </div>
              <ul className="mt-2 text-sm text-amber-300/70 space-y-1">
                {latestResult.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}

          <BiomarkerTable biomarkers={latestResult.biomarkers} onNameClick={setDeepDiveBiomarker} />
        </div>
      )}

      {/* Previous reports */}
      {reports.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-white mb-4">Previous Reports</h2>
          <div className="space-y-2">
            {reports.map((report) => (
              <div key={report.id}>
                <button
                  onClick={() => handleExpandReport(report.id)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-4 hover:border-slate-600 transition-colors text-left flex items-center justify-between"
                >
                  <div>
                    <p className="text-white font-medium">
                      {report.lab_name || 'Unknown Lab'} — {report.report_date || 'No date'}
                    </p>
                    <p className="text-sm text-slate-500">
                      {report.biomarker_count} biomarkers &middot; Uploaded {formatShort(report.upload_date)}
                    </p>
                  </div>
                  {expandedReportId === report.id
                    ? <ChevronUp className="w-5 h-5 text-slate-500" />
                    : <ChevronDown className="w-5 h-5 text-slate-500" />}
                </button>
                {expandedReportId === report.id && selectedReport && (
                  <div className="mt-3">
                    <BiomarkerTable biomarkers={selectedReport.biomarkers} onNameClick={setDeepDiveBiomarker} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <BiomarkerDeepDive name={deepDiveBiomarker} onClose={() => setDeepDiveBiomarker(null)} />
    </div>
  );
}
