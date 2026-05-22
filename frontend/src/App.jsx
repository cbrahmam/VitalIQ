import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import InsightsPage from './pages/InsightsPage';
import BloodWorkPage from './pages/BloodWorkPage';
import SupplementsPage from './pages/SupplementsPage';
import WearablesPage from './pages/WearablesPage';
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
          <Route path="/supplements" element={<SupplementsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
