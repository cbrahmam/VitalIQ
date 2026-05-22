import { create } from 'zustand';
import * as api from '../api/client';

const useHealthStore = create((set, get) => ({
  // Profile
  profile: null,
  fetchProfile: async () => {
    try {
      const data = await api.getProfile();
      set({ profile: data });
    } catch {
      set({ profile: null });
    }
  },
  saveProfile: async (data) => {
    const result = await api.saveProfile(data);
    set({ profile: result });
    return result;
  },

  // Blood work
  reports: [],
  currentReport: null,
  fetchReports: async () => {
    const data = await api.getBloodWorkReports();
    set({ reports: data });
  },
  fetchReport: async (id) => {
    const data = await api.getBloodWorkReport(id);
    set({ currentReport: data });
    return data;
  },
  uploadBloodWork: async (file) => {
    const result = await api.uploadBloodWork(file);
    await get().fetchReports();
    return result;
  },

  // Supplements
  supplements: [],
  interactions: [],
  supplementHistory: [],
  fetchSupplements: async () => {
    const data = await api.getSupplements();
    set({ supplements: data.supplements, interactions: data.interactions });
  },
  addSupplement: async (data) => {
    const result = await api.addSupplement(data);
    set({ supplements: result.interactions ? await api.getSupplements().then(r => r.supplements) : get().supplements, interactions: result.interactions || [] });
    await get().fetchSupplements();
    return result;
  },
  updateSupplement: async (id, data) => {
    const result = await api.updateSupplement(id, data);
    await get().fetchSupplements();
    return result;
  },
  deleteSupplement: async (id) => {
    await api.deleteSupplement(id);
    await get().fetchSupplements();
  },
  fetchSupplementHistory: async () => {
    const data = await api.getSupplementHistory();
    set({ supplementHistory: data });
  },

  // Wearables
  syncStatus: [],
  latestMetrics: [],
  fetchSyncStatus: async () => {
    try {
      const data = await api.getSyncStatus();
      set({ syncStatus: data });
    } catch {
      set({ syncStatus: [] });
    }
  },
  fetchLatestMetrics: async () => {
    try {
      const data = await api.getWearableLatest();
      set({ latestMetrics: data });
    } catch {
      set({ latestMetrics: [] });
    }
  },
  uploadWearable: async (source, file) => {
    const fn = source === 'apple_health' ? api.uploadAppleHealth
             : source === 'whoop' ? api.uploadWhoop
             : api.uploadGarmin;
    const result = await fn(file);
    await get().fetchSyncStatus();
    await get().fetchLatestMetrics();
    return result;
  },

  // Dashboard
  dashboardData: null,
  fetchDashboard: async () => {
    try {
      const data = await api.getDashboard();
      set({
        dashboardData: data,
        healthScore: data.health_score,
      });
      return data;
    } catch {
      set({ dashboardData: null });
    }
  },

  // Insights
  healthScore: null,
  insights: [],
  actionItems: [],
  askAnswer: null,
  askLoading: false,

  fetchInsights: async () => {
    try {
      const data = await api.getLatestInsights();
      set({ insights: data });
    } catch {
      set({ insights: [] });
    }
  },

  generateInsights: async (force = false) => {
    const data = await api.generateInsights(force);
    set({
      healthScore: data.health_score,
      insights: data.insights,
      actionItems: data.action_items,
    });
    return data;
  },

  dismissInsight: async (id) => {
    await api.dismissInsight(id);
    set((s) => ({ insights: s.insights.filter((i) => i.id !== id) }));
  },

  askQuestion: async (question) => {
    set({ askLoading: true, askAnswer: null });
    try {
      const data = await api.askHealthQuestion(question);
      set({ askAnswer: data, askLoading: false });
      return data;
    } catch (e) {
      set({ askLoading: false });
      throw e;
    }
  },

  // UI state
  toast: null,
  showToast: (message, type = 'success') => {
    set({ toast: { message, type } });
    setTimeout(() => set({ toast: null }), 3000);
  },
}));

export default useHealthStore;
