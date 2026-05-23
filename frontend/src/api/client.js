import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

// --- Profile ---
export const getProfile = () => api.get('/profile').then(r => r.data);
export const saveProfile = (data) => api.post('/profile', data).then(r => r.data);

// --- Blood Work ---
export const uploadBloodWork = (file) => {
  const form = new FormData();
  form.append('file', file);
  return api.post('/bloodwork/upload', form).then(r => r.data);
};
export const getBloodWorkReports = () => api.get('/bloodwork').then(r => r.data);
export const getBloodWorkReport = (id) => api.get(`/bloodwork/${id}`).then(r => r.data);
export const getBiomarkerHistory = (name) => api.get(`/biomarkers/${encodeURIComponent(name)}/history`).then(r => r.data);

// --- Supplements ---
export const getSupplements = () => api.get('/supplements').then(r => r.data);
export const addSupplement = (data) => api.post('/supplements', data).then(r => r.data);
export const updateSupplement = (id, data) => api.put(`/supplements/${id}`, data).then(r => r.data);
export const deleteSupplement = (id) => api.delete(`/supplements/${id}`).then(r => r.data);
export const getSupplementHistory = () => api.get('/supplements/history').then(r => r.data);

// --- Wearables ---
const uploadWearableFile = (endpoint, file) => {
  const form = new FormData();
  form.append('file', file);
  return api.post(endpoint, form).then(r => r.data);
};
export const uploadAppleHealth = (file) => uploadWearableFile('/wearables/apple-health', file);
export const uploadWhoop = (file) => uploadWearableFile('/wearables/whoop', file);
export const uploadGarmin = (file) => uploadWearableFile('/wearables/garmin', file);
export const getWearableLatest = () => api.get('/wearables/latest').then(r => r.data);
export const getWearableDaily = (date) => api.get(`/wearables/daily/${date}`).then(r => r.data);
export const getWearableRange = (metric, start, end) => api.get('/wearables/range', { params: { metric, start, end } }).then(r => r.data);
export const getSyncStatus = () => api.get('/wearables/sync-status').then(r => r.data);

// --- Insights ---
export const generateInsights = (force = false) => api.post('/insights/generate', { force }).then(r => r.data);
export const generateDailyInsights = () => api.post('/insights/daily').then(r => r.data);
export const getLatestInsights = () => api.get('/insights/latest').then(r => r.data);
export const getInsightHistory = (type) => api.get('/insights/history', { params: type ? { type } : {} }).then(r => r.data);
export const dismissInsight = (id) => api.post(`/insights/dismiss/${id}`).then(r => r.data);
export const askHealthQuestion = (question) => api.post('/insights/ask', { question }).then(r => r.data);

// --- Dashboard & Trends ---
export const getDashboard = () => api.get('/dashboard').then(r => r.data);
export const getTrend = (metric, days = 30) => api.get(`/trends/${metric}`, { params: { days } }).then(r => r.data);
export const getCorrelations = (days = 30) => api.get('/correlations', { params: { days } }).then(r => r.data);
export const getTimeline = (start, end) => api.get('/timeline', { params: { start, end } }).then(r => r.data);
export const getBiomarkerDeepDive = (name) => api.get(`/biomarkers/${encodeURIComponent(name)}/deep-dive`).then(r => r.data);

// --- Genetics ---
export const uploadGenetics = (file) => {
  const form = new FormData();
  form.append('file', file);
  return api.post('/genetics/upload', form).then(r => r.data);
};
export const getGeneticMarkers = () => api.get('/genetics').then(r => r.data);
export const getGeneticImplications = () => api.get('/genetics/implications').then(r => r.data);

// --- Goals ---
export const getGoals = (status) => api.get('/goals', { params: status ? { status } : {} }).then(r => r.data);
export const createGoal = (data) => api.post('/goals', data).then(r => r.data);
export const updateGoal = (id, data) => api.put(`/goals/${id}`, data).then(r => r.data);
export const deleteGoal = (id) => api.delete(`/goals/${id}`).then(r => r.data);

// --- Reports ---
export const generateReport = () => api.post('/report/generate').then(r => r.data);
export const getDoctorSummary = () => api.get('/report/doctor-summary').then(r => r.data);
