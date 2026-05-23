import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Onboarding from './components/Onboarding';
import DashboardPage from './pages/DashboardPage';
import InsightsPage from './pages/InsightsPage';
import BloodWorkPage from './pages/BloodWorkPage';
import SupplementsPage from './pages/SupplementsPage';
import WearablesPage from './pages/WearablesPage';
import TrendsPage from './pages/TrendsPage';
import GeneticsPage from './pages/GeneticsPage';
import GoalsPage from './pages/GoalsPage';
import ReportPage from './pages/ReportPage';
import SettingsPage from './pages/SettingsPage';
import * as api from './api/client';

export default function App() {
  const [showOnboarding, setShowOnboarding] = useState(null);

  useEffect(() => {
    api.checkHasData()
      .then(data => setShowOnboarding(!data.has_any))
      .catch(() => setShowOnboarding(false));
  }, []);

  if (showOnboarding === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-slate-700 border-t-emerald-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (showOnboarding) {
    return <Onboarding onComplete={() => setShowOnboarding(false)} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/insights" element={<InsightsPage />} />
          <Route path="/bloodwork" element={<BloodWorkPage />} />
          <Route path="/wearables" element={<WearablesPage />} />
          <Route path="/trends" element={<TrendsPage />} />
          <Route path="/supplements" element={<SupplementsPage />} />
          <Route path="/genetics" element={<GeneticsPage />} />
          <Route path="/goals" element={<GoalsPage />} />
          <Route path="/reports" element={<ReportPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
