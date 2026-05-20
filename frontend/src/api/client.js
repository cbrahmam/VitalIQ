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
