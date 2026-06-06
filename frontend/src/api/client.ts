import axios from 'axios';
import { Project, Snapshot, Activity, CompareResponse, Stats } from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
});

// Projects
export const projectsApi = {
  list: () => api.get<Project[]>('/projects').then(r => r.data),
  get: (id: string) => api.get<Project>(`/projects/${id}`).then(r => r.data),
  create: (name: string) => api.post<Project>('/projects', { name }).then(r => r.data),
  update: (id: string, name: string) => api.put<Project>(`/projects/${id}`, { name }).then(r => r.data),
  delete: (id: string) => api.delete(`/projects/${id}`).then(r => r.data),
};

// Snapshots
export const snapshotsApi = {
  list: (projectId: string) =>
    api.get<Snapshot[]>('/snapshots', { params: { projectId } }).then(r => r.data),
  get: (id: string) =>
    api.get<Snapshot & { activities: Activity[] }>(`/snapshots/${id}`).then(r => r.data),
  getActivities: (id: string, filters?: Record<string, string>) =>
    api.get<Activity[]>(`/snapshots/${id}/activities`, { params: filters }).then(r => r.data),
  compare: (idA: string, idB: string) =>
    api.get<CompareResponse>(`/snapshots/compare/${idA}/${idB}`).then(r => r.data),
  delete: (id: string) => api.delete(`/snapshots/${id}`).then(r => r.data),
};

// Upload
export const uploadApi = {
  uploadFiles: (
    projectId: string,
    files: File[],
    discipline: string,
    onProgress?: (percent: number) => void,
    window?: { startDate: string; endDate: string }
  ) => {
    const formData = new FormData();
    formData.append('projectId', projectId);
    formData.append('discipline', discipline);
    if (window) {
      formData.append('startDate', window.startDate);
      formData.append('endDate', window.endDate);
    }
    files.forEach(f => formData.append('files', f));
    return api.post<{
      results: Array<{
        snapshotId?: string;
        filename: string;
        discipline?: string;
        weekLabel?: string;
        activitiesCount?: number;
        error?: string;
      }>;
    }>('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: e => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded * 100) / e.total));
        }
      },
    }).then(r => r.data);
  },
};

export interface ActivityInput {
  workFront: string;
  generalTitle: string;
  description: string;
  resources: string;
  startDate: string;
  endDate: string;
  discipline: string;
  status: 'active' | 'blocked' | 'pending';
}

// Activities
export const activitiesApi = {
  list: (params: Record<string, string>) =>
    api.get<Activity[]>('/activities', { params }).then(r => r.data),
  stats: (params: Record<string, string>) =>
    api.get<Stats>('/activities/stats', { params }).then(r => r.data),
  get: (id: string) => api.get<Activity>(`/activities/${id}`).then(r => r.data),
  create: (data: ActivityInput & { projectId: string }) =>
    api.post<Activity>('/activities', data).then(r => r.data),
  update: (id: string, data: Partial<ActivityInput>) =>
    api.put<Activity>(`/activities/${id}`, data).then(r => r.data),
  remove: (id: string) =>
    api.delete(`/activities/${id}`).then(r => r.data),
};

export default api;
