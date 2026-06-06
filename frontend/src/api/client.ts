// 100% client-side data layer (no backend).
// Data lives in the browser (localStorage) and can be exported/imported
// as a JSON file — e.g. saved to a shared OneDrive folder.

import { Project, Snapshot, Activity, CompareResponse, Stats } from '../types';
import {
  getStore, saveStore, toSnapshot, StoredSnapshot,
  exportAll as storeExportAll, importAll as storeImportAll, clearAll as storeClearAll,
} from '../lib/store';
import { parseExcelFile, fingerprint, uuid } from '../lib/excelParser';
import { compareVersions } from '../lib/versionComparator';

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

const delay = <T>(value: T): Promise<T> => Promise.resolve(value);

function nowIso(): string {
  return new Date().toISOString();
}

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

// ---------------- Projects ----------------
export const projectsApi = {
  list: () => {
    const { projects } = getStore();
    return delay([...projects].sort((a, b) => (b.updated_at).localeCompare(a.updated_at)));
  },
  get: (id: string) => {
    const { projects } = getStore();
    return delay(projects.find(p => p.id === id) ?? null);
  },
  create: (name: string) => {
    const store = getStore();
    const project: Project = {
      id: uuid(),
      name: name.trim(),
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    store.projects.unshift(project);
    saveStore(store);
    return delay(project);
  },
  update: (id: string, name: string) => {
    const store = getStore();
    const p = store.projects.find(x => x.id === id);
    if (!p) throw new Error('Project not found');
    p.name = name.trim();
    p.updated_at = nowIso();
    saveStore(store);
    return delay(p);
  },
  delete: (id: string) => {
    const store = getStore();
    const snapIds = store.snapshots.filter(s => s.project_id === id).map(s => s.id);
    store.projects = store.projects.filter(p => p.id !== id);
    store.snapshots = store.snapshots.filter(s => s.project_id !== id);
    store.activities = store.activities.filter(a => !snapIds.includes(a.snapshotId));
    saveStore(store);
    return delay({ success: true });
  },
};

// ---------------- Snapshots ----------------
function activitiesOfSnapshot(id: string): Activity[] {
  return getStore().activities
    .filter(a => a.snapshotId === id)
    .sort((a, b) =>
      a.workFront.localeCompare(b.workFront) ||
      a.generalTitle.localeCompare(b.generalTitle) ||
      a.description.localeCompare(b.description));
}

export const snapshotsApi = {
  list: (projectId: string) => {
    const { snapshots } = getStore();
    const list = snapshots
      .filter(s => s.project_id === projectId)
      .sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at))
      .map(s => toSnapshot(s));
    return delay(list);
  },
  get: (id: string) => {
    const s = getStore().snapshots.find(x => x.id === id);
    if (!s) throw new Error('Snapshot not found');
    return delay(toSnapshot(s, activitiesOfSnapshot(id)) as Snapshot & { activities: Activity[] });
  },
  getActivities: (id: string, filters?: Record<string, string>) => {
    let acts = activitiesOfSnapshot(id);
    acts = applyFilters(acts, filters);
    return delay(acts);
  },
  compare: (idA: string, idB: string) => {
    const store = getStore();
    const sA = store.snapshots.find(s => s.id === idA);
    const sB = store.snapshots.find(s => s.id === idB);
    if (!sA) throw new Error('Snapshot A not found');
    if (!sB) throw new Error('Snapshot B not found');
    const diff = compareVersions(activitiesOfSnapshot(idA), activitiesOfSnapshot(idB));
    const resp: CompareResponse = {
      snapshotA: toSnapshot(sA),
      snapshotB: toSnapshot(sB),
      diff,
    };
    return delay(resp);
  },
  delete: (id: string) => {
    const store = getStore();
    store.snapshots = store.snapshots.filter(s => s.id !== id);
    store.activities = store.activities.filter(a => a.snapshotId !== id);
    saveStore(store);
    return delay({ success: true });
  },
};

function applyFilters(acts: Activity[], filters?: Record<string, string>): Activity[] {
  if (!filters) return acts;
  let out = acts;
  if (filters.discipline) out = out.filter(a => a.discipline === filters.discipline);
  if (filters.workFront) out = out.filter(a => a.workFront === filters.workFront);
  if (filters.status) out = out.filter(a => a.status === filters.status);
  if (filters.search) {
    const q = filters.search.toLowerCase();
    out = out.filter(a =>
      a.description.toLowerCase().includes(q) ||
      a.workFront.toLowerCase().includes(q) ||
      a.resources.toLowerCase().includes(q) ||
      a.generalTitle.toLowerCase().includes(q));
  }
  return out;
}

const MONTHS_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
function formatHuman(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS_ES[m - 1]} ${y}`;
}

// ---------------- Upload (Excel parsed in browser) ----------------
export const uploadApi = {
  uploadFiles: async (
    projectId: string,
    files: File[],
    discipline: string,
    onProgress?: (percent: number) => void,
    window?: { startDate: string; endDate: string }
  ) => {
    const store = getStore();
    const results: Array<{
      snapshotId?: string;
      filename: string;
      discipline?: string;
      weekLabel?: string;
      activitiesCount?: number;
      error?: string;
    }> = [];

    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    const startDate = window && dateRe.test(window.startDate) ? window.startDate : undefined;
    const endDate = window && dateRe.test(window.endDate) ? window.endDate : undefined;

    let i = 0;
    for (const file of files) {
      try {
        const buffer = await readFileAsArrayBuffer(file);
        const snapshotId = uuid();
        const { activities, weekLabel: detectedLabel } = parseExcelFile(
          buffer, discipline, file.name, snapshotId, { startDate, endDate }
        );

        const weekLabel = (startDate && endDate)
          ? `${formatHuman(startDate)} – ${formatHuman(endDate)}`
          : detectedLabel;

        const snapshot: StoredSnapshot = {
          id: snapshotId,
          project_id: projectId,
          discipline,
          filename: file.name,
          uploaded_at: nowIso(),
          week_label: weekLabel,
          lookahead_start: startDate ?? null,
          lookahead_end: endDate ?? null,
        };
        store.snapshots.unshift(snapshot);
        store.activities.push(...activities);

        results.push({
          snapshotId, filename: file.name, discipline,
          weekLabel, activitiesCount: activities.length,
        });
      } catch (err) {
        results.push({ filename: file.name, error: String(err) });
      }
      i++;
      onProgress?.(Math.round((i / files.length) * 100));
    }

    const p = store.projects.find(x => x.id === projectId);
    if (p) p.updated_at = nowIso();
    saveStore(store);

    return { results };
  },
};

// ---------------- Activities ----------------
function projectActivities(projectId: string): Activity[] {
  const store = getStore();
  const snapIds = new Set(store.snapshots.filter(s => s.project_id === projectId).map(s => s.id));
  return store.activities.filter(a => snapIds.has(a.snapshotId));
}

function durationFrom(startDate?: string, endDate?: string): number {
  if (startDate && endDate) {
    return Math.max(0, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1);
  }
  return 0;
}

export const activitiesApi = {
  list: (params: Record<string, string>) => {
    let acts: Activity[];
    if (params.snapshotId) acts = activitiesOfSnapshot(params.snapshotId);
    else if (params.projectId) acts = projectActivities(params.projectId);
    else acts = getStore().activities;
    acts = applyFilters(acts, params);
    acts = [...acts].sort((a, b) =>
      a.workFront.localeCompare(b.workFront) ||
      a.generalTitle.localeCompare(b.generalTitle) ||
      a.description.localeCompare(b.description));
    return delay(acts);
  },

  stats: (params: Record<string, string>) => {
    let acts: Activity[];
    if (params.snapshotId) acts = activitiesOfSnapshot(params.snapshotId);
    else if (params.projectId) acts = projectActivities(params.projectId);
    else acts = getStore().activities;

    const count = <K extends string>(key: (a: Activity) => K) => {
      const m = new Map<K, number>();
      for (const a of acts) m.set(key(a), (m.get(key(a)) ?? 0) + 1);
      return m;
    };

    const byStatusMap = count(a => a.status);
    const byDiscMap = count(a => a.discipline);
    const byWfMap = count(a => a.workFront);

    const stats: Stats = {
      total: acts.length,
      byStatus: [...byStatusMap].map(([status, c]) => ({ status, count: c })),
      byDiscipline: [...byDiscMap].map(([discipline, c]) => ({ discipline, count: c })),
      byWorkFront: [...byWfMap].map(([work_front, c]) => ({ work_front, count: c })),
    };
    return delay(stats);
  },

  get: (id: string) => {
    const a = getStore().activities.find(x => x.id === id);
    if (!a) throw new Error('Activity not found');
    return delay(a);
  },

  create: (data: ActivityInput & { projectId: string }) => {
    const store = getStore();

    // Find or create the "Manual" snapshot for this project
    let snapshot = store.snapshots.find(s => s.project_id === data.projectId && s.filename === '__manual__');
    if (!snapshot) {
      snapshot = {
        id: uuid(),
        project_id: data.projectId,
        discipline: data.discipline || 'General',
        filename: '__manual__',
        uploaded_at: nowIso(),
        week_label: 'Entrada manual',
      };
      store.snapshots.unshift(snapshot);
    }

    const activity: Activity = {
      id: uuid(),
      workFront: data.workFront || '',
      generalTitle: data.generalTitle || data.description || '',
      description: data.description || '',
      resources: data.resources || '',
      scheduledDays: [],
      startDate: data.startDate || null,
      endDate: data.endDate || null,
      durationDays: durationFrom(data.startDate, data.endDate),
      discipline: data.discipline || 'General',
      status: data.status || 'pending',
      sourceFile: '__manual__',
      snapshotId: snapshot.id,
      fingerprint: fingerprint(data.workFront || '', data.generalTitle || '', data.description || ''),
    };
    store.activities.push(activity);

    const p = store.projects.find(x => x.id === data.projectId);
    if (p) p.updated_at = nowIso();
    saveStore(store);
    return delay(activity);
  },

  update: (id: string, data: Partial<ActivityInput>) => {
    const store = getStore();
    const a = store.activities.find(x => x.id === id);
    if (!a) throw new Error('Activity not found');

    if (data.workFront !== undefined) a.workFront = data.workFront;
    if (data.generalTitle !== undefined) a.generalTitle = data.generalTitle;
    if (data.description !== undefined) a.description = data.description;
    if (data.resources !== undefined) a.resources = data.resources;
    if (data.startDate !== undefined) a.startDate = data.startDate || null;
    if (data.endDate !== undefined) a.endDate = data.endDate || null;
    if (data.discipline !== undefined) a.discipline = data.discipline;
    if (data.status !== undefined) a.status = data.status;
    a.durationDays = durationFrom(a.startDate ?? undefined, a.endDate ?? undefined) || a.durationDays;
    a.fingerprint = fingerprint(a.workFront, a.generalTitle, a.description);

    saveStore(store);
    return delay(a);
  },

  remove: (id: string) => {
    const store = getStore();
    store.activities = store.activities.filter(a => a.id !== id);
    saveStore(store);
    return delay({ success: true });
  },
};

// ---------------- Data export / import ----------------
export const dataApi = {
  export: () => storeExportAll(),
  import: (bundle: unknown) => storeImportAll(bundle),
  clear: () => storeClearAll(),
};
