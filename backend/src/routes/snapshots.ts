import { Router, Request, Response } from 'express';
import db from '../db/database';
import { compareVersions } from '../services/versionComparator';
import { Activity } from '../types';

const router = Router();

function rowToActivity(row: Record<string, unknown>): Activity {
  return {
    id: row.id as string,
    workFront: row.work_front as string,
    generalTitle: row.general_title as string,
    description: row.description as string,
    resources: row.resources as string,
    scheduledDays: JSON.parse((row.scheduled_days as string) || '[]'),
    startDate: (row.start_date as string) || null,
    endDate: (row.end_date as string) || null,
    durationDays: row.duration_days as number,
    discipline: row.discipline as string,
    status: row.status as 'active' | 'blocked' | 'pending',
    sourceFile: row.source_file as string,
    snapshotId: row.snapshot_id as string,
    fingerprint: row.fingerprint as string,
  };
}

// GET /api/snapshots?projectId=xxx
router.get('/', (req: Request, res: Response) => {
  try {
    const { projectId } = req.query;
    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }
    const snapshots = db.prepare(
      'SELECT * FROM snapshots WHERE project_id = ? ORDER BY uploaded_at DESC'
    ).all(projectId as string);
    res.json(snapshots);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch snapshots', details: String(err) });
  }
});

// GET /api/snapshots/:id
router.get('/:id', (req: Request, res: Response) => {
  try {
    const snapshot = db.prepare('SELECT * FROM snapshots WHERE id = ?').get(req.params.id);
    if (!snapshot) return res.status(404).json({ error: 'Snapshot not found' });

    const activityRows = db.prepare(
      'SELECT * FROM activities WHERE snapshot_id = ? ORDER BY work_front, general_title, description'
    ).all(req.params.id) as Record<string, unknown>[];

    const activities = activityRows.map(rowToActivity);

    res.json({ ...snapshot, activities });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch snapshot', details: String(err) });
  }
});

// GET /api/snapshots/:id/activities
router.get('/:id/activities', (req: Request, res: Response) => {
  try {
    const { discipline, workFront, status, search } = req.query;
    let query = 'SELECT * FROM activities WHERE snapshot_id = ?';
    const params: unknown[] = [req.params.id];

    if (discipline) { query += ' AND discipline = ?'; params.push(discipline); }
    if (workFront) { query += ' AND work_front = ?'; params.push(workFront); }
    if (status) { query += ' AND status = ?'; params.push(status); }

    query += ' ORDER BY work_front, general_title, description';

    const rows = db.prepare(query).all(...params) as Record<string, unknown>[];
    let activities = rows.map(rowToActivity);

    if (search) {
      const q = (search as string).toLowerCase();
      activities = activities.filter(a =>
        a.description.toLowerCase().includes(q) ||
        a.workFront.toLowerCase().includes(q) ||
        a.resources.toLowerCase().includes(q) ||
        a.generalTitle.toLowerCase().includes(q)
      );
    }

    res.json(activities);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch activities', details: String(err) });
  }
});

// GET /api/snapshots/compare/:idA/:idB - compare two snapshots
router.get('/compare/:idA/:idB', (req: Request, res: Response) => {
  try {
    const { idA, idB } = req.params;

    const snapshotA = db.prepare('SELECT * FROM snapshots WHERE id = ?').get(idA);
    const snapshotB = db.prepare('SELECT * FROM snapshots WHERE id = ?').get(idB);

    if (!snapshotA) return res.status(404).json({ error: 'Snapshot A not found' });
    if (!snapshotB) return res.status(404).json({ error: 'Snapshot B not found' });

    const rowsA = db.prepare('SELECT * FROM activities WHERE snapshot_id = ?').all(idA) as Record<string, unknown>[];
    const rowsB = db.prepare('SELECT * FROM activities WHERE snapshot_id = ?').all(idB) as Record<string, unknown>[];

    const activitiesA = rowsA.map(rowToActivity);
    const activitiesB = rowsB.map(rowToActivity);

    const diff = compareVersions(activitiesA, activitiesB);

    res.json({
      snapshotA,
      snapshotB,
      diff,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to compare snapshots', details: String(err) });
  }
});

// DELETE /api/snapshots/:id
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const result = db.prepare('DELETE FROM snapshots WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Snapshot not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete snapshot', details: String(err) });
  }
});

export default router;
