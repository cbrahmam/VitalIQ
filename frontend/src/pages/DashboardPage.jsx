import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FlaskConical, Pill, Settings, Activity } from 'lucide-react';
import useHealthStore from '../store/healthStore';

const quickActions = [
  { to: '/bloodwork', label: 'Upload Blood Work', desc: 'Parse a lab report PDF', icon: FlaskConical, color: 'text-blue-400' },
  { to: '/supplements', label: 'Manage Supplements', desc: 'Track your stack', icon: Pill, color: 'text-emerald-400' },
  { to: '/settings', label: 'Health Profile', desc: 'Set age, sex, weight', icon: Settings, color: 'text-amber-400' },
];

export default function DashboardPage() {
  const profile = useHealthStore((s) => s.profile);
  const reports = useHealthStore((s) => s.reports);
  const supplements = useHealthStore((s) => s.supplements);
  const fetchProfile = useHealthStore((s) => s.fetchProfile);
  const fetchReports = useHealthStore((s) => s.fetchReports);
  const fetchSupplements = useHealthStore((s) => s.fetchSupplements);

  useEffect(() => {
    fetchProfile();
    fetchReports();
    fetchSupplements();
  }, [fetchProfile, fetchReports, fetchSupplements]);

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Activity className="w-8 h-8 text-emerald-400" />
          <h1 className="text-3xl font-bold text-white">VitalIQ</h1>
        </div>
        <p className="text-slate-400">
          {profile?.name ? `Welcome back, ${profile.name}` : 'Your AI health intelligence platform'}
        </p>
      </div>

      {/* Data summary */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <p className="text-2xl font-bold text-white">{reports.length}</p>
          <p className="text-sm text-slate-400">Blood Work Reports</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <p className="text-2xl font-bold text-white">{supplements.length}</p>
          <p className="text-sm text-slate-400">Active Supplements</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <p className="text-2xl font-bold text-white">{profile ? 'Set' : 'Not Set'}</p>
          <p className="text-sm text-slate-400">Health Profile</p>
        </div>
      </div>

      {/* Quick actions */}
      <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {quickActions.map(({ to, label, desc, icon: Icon, color }) => (
          <Link
            key={to}
            to={to}
            className="bg-slate-900 border border-slate-800 rounded-lg p-5 hover:border-slate-600 transition-colors block"
          >
            <Icon className={`w-8 h-8 ${color} mb-3`} />
            <h3 className="font-medium text-white">{label}</h3>
            <p className="text-sm text-slate-500 mt-1">{desc}</p>
          </Link>
        ))}
      </div>

      {!profile && (
        <div className="mt-8 bg-amber-400/5 border border-amber-400/20 rounded-lg p-4">
          <p className="text-amber-400 text-sm">
            Set up your health profile in Settings to get accurate biomarker classification (reference ranges differ by sex).
          </p>
        </div>
      )}
    </div>
  );
}
