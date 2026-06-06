import { Project, Snapshot, Activity } from '../types';

const STORAGE_KEY = 'lookahead_data_v1';
const EXPORT_VERSION = 1;

// Snapshot as stored locally (metadata only; activities are kept in a flat list)
export interface StoredSnapshot {
  id: string;
  project_id: string;
  discipline: string;
  filename: string;
  uploaded_at: string;
  week_label: string;
  lookahead_start?: string | null;
  lookahead_end?: string | null;
}

interface StoreData {
  projects: Project[];
  snapshots: StoredSnapshot[];
  activities: Activity[];
}

const empty: StoreData = { projects: [], snapshots: [], activities: [] };

let cache: StoreData | null = null;

function read(): StoreData {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) { cache = { ...empty }; return cache; }
    const parsed = JSON.parse(raw);
    cache = {
      projects: parsed.projects ?? [],
      snapshots: parsed.snapshots ?? [],
      activities: parsed.activities ?? [],
    };
  } catch {
    cache = { ...empty };
  }
  return cache;
}

function write(data: StoreData): void {
  cache = data;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getStore(): StoreData {
  return read();
}

export function saveStore(data: StoreData): void {
  write(data);
}

export function toSnapshot(s: StoredSnapshot, activities?: Activity[]): Snapshot {
  return {
    id: s.id,
    project_id: s.project_id,
    discipline: s.discipline,
    filename: s.filename,
    uploaded_at: s.uploaded_at,
    week_label: s.week_label,
    ...(activities ? { activities } : {}),
  };
}

// ---- Export / Import ----

export interface ExportBundle {
  app: 'lookahead-planning';
  version: number;
  exportedAt: string;
  data: StoreData;
}

export function exportAll(): ExportBundle {
  return {
    app: 'lookahead-planning',
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    data: read(),
  };
}

export function importAll(bundle: unknown): { projects: number; activities: number } {
  const b = bundle as Partial<ExportBundle>;
  if (!b || b.app !== 'lookahead-planning' || !b.data) {
    throw new Error('Archivo no válido. Debe ser un export de Lookahead Planning.');
  }
  const data: StoreData = {
    projects: b.data.projects ?? [],
    snapshots: b.data.snapshots ?? [],
    activities: b.data.activities ?? [],
  };
  write(data);
  return { projects: data.projects.length, activities: data.activities.length };
}

export function clearAll(): void {
  write({ projects: [], snapshots: [], activities: [] });
}
