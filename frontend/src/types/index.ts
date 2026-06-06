export interface Activity {
  id: string;
  workFront: string;
  generalTitle: string;
  description: string;
  resources: string;
  scheduledDays: string[];
  startDate: string | null;
  endDate: string | null;
  durationDays: number;
  discipline: string;
  status: 'active' | 'blocked' | 'pending';
  sourceFile: string;
  snapshotId: string;
  fingerprint: string;
}

export interface Snapshot {
  id: string;
  project_id: string;
  discipline: string;
  filename: string;
  uploaded_at: string;
  week_label: string;
  activities?: Activity[];
}

export interface Project {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface VersionDiff {
  added: Activity[];
  removed: Activity[];
  modified: { before: Activity; after: Activity; changes: string[] }[];
  unchanged: Activity[];
}

export interface CompareResponse {
  snapshotA: Snapshot;
  snapshotB: Snapshot;
  diff: VersionDiff;
}

export interface Stats {
  total: number;
  byStatus: { status: string; count: number }[];
  byDiscipline: { discipline: string; count: number }[];
  byWorkFront: { work_front: string; count: number }[];
}

export interface Filters {
  discipline?: string;
  workFront?: string;
  status?: string;
  search?: string;
  groupBy: 'endDate' | 'workFront' | 'discipline' | 'status';
}

export const DISCIPLINE_COLORS: Record<string, { bg: string; text: string; cardBg: string; cardBgDark: string }> = {
  'Estructuras': { bg: 'bg-orange-500', text: 'text-orange-100', cardBg: '#92400e', cardBgDark: '#78350f' },
  'Arquitectura': { bg: 'bg-blue-500', text: 'text-blue-100', cardBg: '#1e3a5f', cardBgDark: '#172d4a' },
  'Instalaciones': { bg: 'bg-green-500', text: 'text-green-100', cardBg: '#14532d', cardBgDark: '#0f3d22' },
  'Electricidad': { bg: 'bg-yellow-500', text: 'text-yellow-900', cardBg: '#713f12', cardBgDark: '#5a3210' },
  'Mecánica': { bg: 'bg-purple-500', text: 'text-purple-100', cardBg: '#3b1f6e', cardBgDark: '#2d1857' },
  'Plomería': { bg: 'bg-cyan-500', text: 'text-cyan-100', cardBg: '#0c4a6e', cardBgDark: '#0a3d5c' },
  'HVAC': { bg: 'bg-teal-500', text: 'text-teal-100', cardBg: '#134e4a', cardBgDark: '#0d3d3a' },
  'Default': { bg: 'bg-slate-500', text: 'text-slate-100', cardBg: '#1e2a3a', cardBgDark: '#172030' },
};

export function getDisciplineColor(discipline: string) {
  return DISCIPLINE_COLORS[discipline] || DISCIPLINE_COLORS['Default'];
}

export const STATUS_CONFIG = {
  active: { label: 'Activa', bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  blocked: { label: 'Bloqueada', bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
  pending: { label: 'Pendiente', bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
};
