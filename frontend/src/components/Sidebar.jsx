import { NavLink } from 'react-router-dom';
import { Activity, FlaskConical, Pill, Settings, LayoutDashboard, Watch, Brain, BarChart3 } from 'lucide-react';

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/insights', label: 'Insights', icon: Brain },
  { to: '/trends', label: 'Trends', icon: BarChart3 },
  { to: '/bloodwork', label: 'Blood Work', icon: FlaskConical },
  { to: '/wearables', label: 'Wearables', icon: Watch },
  { to: '/supplements', label: 'Supplements', icon: Pill },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  return (
    <aside className="w-60 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Activity className="w-6 h-6 text-emerald-400" />
          <span className="text-xl font-bold text-white tracking-tight">VitalIQ</span>
        </div>
        <p className="text-xs text-slate-500 mt-1">AI Health Intelligence</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
              ${isActive
                ? 'bg-slate-800 text-emerald-400 border-l-2 border-emerald-400'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`
            }
          >
            <Icon className="w-4.5 h-4.5" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-slate-800">
        <p className="text-xs text-slate-600 text-center">v0.1.0</p>
      </div>
    </aside>
  );
}
