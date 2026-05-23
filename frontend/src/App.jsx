import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
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

export default function App() {
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
