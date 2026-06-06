import { Activity } from '../types';

/**
 * Given a list of activities, group them by work front and discipline.
 */
export function groupByWorkFront(activities: Activity[]): Map<string, Activity[]> {
  const map = new Map<string, Activity[]>();
  for (const activity of activities) {
    const key = activity.workFront;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(activity);
  }
  return map;
}

export function groupByDiscipline(activities: Activity[]): Map<string, Activity[]> {
  const map = new Map<string, Activity[]>();
  for (const activity of activities) {
    const key = activity.discipline;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(activity);
  }
  return map;
}

/**
 * Filter activities by various criteria
 */
export function filterActivities(
  activities: Activity[],
  filters: {
    discipline?: string;
    workFront?: string;
    status?: string;
    week?: string;
    search?: string;
  }
): Activity[] {
  return activities.filter(a => {
    if (filters.discipline && a.discipline !== filters.discipline) return false;
    if (filters.workFront && a.workFront !== filters.workFront) return false;
    if (filters.status && a.status !== filters.status) return false;
    if (filters.week && !a.scheduledDays.some(d => d.startsWith(filters.week!))) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (
        !a.description.toLowerCase().includes(q) &&
        !a.workFront.toLowerCase().includes(q) &&
        !a.resources.toLowerCase().includes(q) &&
        !a.generalTitle.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });
}
