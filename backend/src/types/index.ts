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
  projectId: string;
  discipline: string;
  filename: string;
  uploadedAt: string;
  weekLabel: string;
  activities: Activity[];
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface VersionDiff {
  added: Activity[];
  removed: Activity[];
  modified: { before: Activity; after: Activity; changes: string[] }[];
  unchanged: Activity[];
}

export interface ParsedExcelData {
  activities: Activity[];
  weekLabel: string;
}
