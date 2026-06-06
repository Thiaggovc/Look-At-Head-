import { Activity, VersionDiff } from '../types';

function getChangedFields(before: Activity, after: Activity): string[] {
  const changes: string[] = [];
  if (before.resources !== after.resources) changes.push('resources');
  if (before.status !== after.status) changes.push('status');
  if (before.startDate !== after.startDate) changes.push('startDate');
  if (before.endDate !== after.endDate) changes.push('endDate');
  if (before.durationDays !== after.durationDays) changes.push('durationDays');
  if (JSON.stringify([...before.scheduledDays].sort()) !== JSON.stringify([...after.scheduledDays].sort())) {
    changes.push('scheduledDays');
  }
  if (before.workFront !== after.workFront) changes.push('workFront');
  if (before.generalTitle !== after.generalTitle) changes.push('generalTitle');
  return changes;
}

export function compareVersions(oldActivities: Activity[], newActivities: Activity[]): VersionDiff {
  const oldMap = new Map<string, Activity>();
  const newMap = new Map<string, Activity>();

  for (const a of oldActivities) oldMap.set(a.fingerprint, a);
  for (const a of newActivities) newMap.set(a.fingerprint, a);

  const added: Activity[] = [];
  const removed: Activity[] = [];
  const modified: { before: Activity; after: Activity; changes: string[] }[] = [];
  const unchanged: Activity[] = [];

  for (const [fp, newActivity] of newMap) {
    if (!oldMap.has(fp)) {
      added.push(newActivity);
    } else {
      const oldActivity = oldMap.get(fp)!;
      const changes = getChangedFields(oldActivity, newActivity);
      if (changes.length > 0) modified.push({ before: oldActivity, after: newActivity, changes });
      else unchanged.push(newActivity);
    }
  }

  for (const [fp, oldActivity] of oldMap) {
    if (!newMap.has(fp)) removed.push(oldActivity);
  }

  return { added, removed, modified, unchanged };
}
