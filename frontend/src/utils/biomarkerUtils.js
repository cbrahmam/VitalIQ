export const statusConfig = {
  optimal:      { color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30', label: 'Optimal' },
  normal:       { color: 'text-blue-400',    bg: 'bg-blue-400/10',    border: 'border-blue-400/30',    label: 'Normal' },
  suboptimal:   { color: 'text-amber-400',   bg: 'bg-amber-400/10',   border: 'border-amber-400/30',   label: 'Suboptimal' },
  out_of_range: { color: 'text-red-400',     bg: 'bg-red-400/10',     border: 'border-red-400/30',     label: 'Out of Range' },
  critical:     { color: 'text-purple-400',  bg: 'bg-purple-400/10',  border: 'border-purple-400/30',  label: 'Critical' },
  unknown:      { color: 'text-slate-400',   bg: 'bg-slate-400/10',   border: 'border-slate-400/30',   label: 'Unknown' },
};

export function getStatusStyle(status) {
  return statusConfig[status] || statusConfig.unknown;
}

export const categoryOrder = [
  'iron', 'vitamins', 'lipids', 'thyroid', 'liver', 'kidney',
  'metabolic', 'hormones', 'blood_count', 'inflammation', 'minerals',
];

export const categoryLabels = {
  iron: 'Iron Panel',
  vitamins: 'Vitamins',
  lipids: 'Lipid Profile',
  thyroid: 'Thyroid Function',
  liver: 'Liver Function',
  kidney: 'Kidney Function',
  metabolic: 'Metabolic Panel',
  hormones: 'Hormones',
  blood_count: 'Complete Blood Count',
  inflammation: 'Inflammation Markers',
  minerals: 'Minerals',
  other: 'Other',
};

export function groupByCategory(biomarkers) {
  const groups = {};
  for (const bm of biomarkers) {
    const cat = bm.category || 'other';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(bm);
  }
  return categoryOrder
    .filter(cat => groups[cat])
    .map(cat => ({ category: cat, label: categoryLabels[cat], biomarkers: groups[cat] }))
    .concat(
      Object.keys(groups)
        .filter(cat => !categoryOrder.includes(cat))
        .map(cat => ({ category: cat, label: categoryLabels[cat] || cat, biomarkers: groups[cat] }))
    );
}
