import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import useHealthStore from '../store/healthStore';

export default function Layout() {
  const toast = useHealthStore((s) => s.toast);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-6">
          <Outlet />
        </div>
      </main>
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg z-50 text-sm font-medium
          ${toast.type === 'error' ? 'bg-red-500/90 text-white' : 'bg-emerald-500/90 text-white'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
