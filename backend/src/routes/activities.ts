import { Router, Request, Response } from 'express';
import db from '../db/database';
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

// GET /api/activities?projectId=xxx&snapshotId=xxx
router.get('/', (req: Request, res: Response) => {
  try {
    const { projectId, snapshotId, discipline, workFront, status, search } = req.query;

    let query = `
      SELECT a.* FROM activities a
      JOIN snapshots s ON a.snapshot_id = s.id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (projectId) { query += ' AND s.project_id = ?'; params.push(projectId); }
    if (snapshotId) { query += ' AND a.snapshot_id = ?'; params.push(snapshotId); }
    if (discipline) { query += ' AND a.discipline = ?'; params.push(discipline); }
    if (workFront) { query += ' AND a.work_front = ?'; params.push(workFront); }
    if (status) { query += ' AND a.status = ?'; params.push(status); }

    query += ' ORDER BY a.work_front, a.general_title, a.description';

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

// GET /api/activities/stats?projectId=xxx&snapshotId=xxx
router.get('/stats', (req: Request, res: Response) => {
  try {
    const { projectId, snapshotId } = req.query;

    let whereClause = '1=1';
    const params: unknown[] = [];

    if (snapshotId) {
      whereClause += ' AND a.snapshot_id = ?';
      params.push(snapshotId);
    } else if (projectId) {
      whereClause += ' AND s.project_id = ?';
      params.push(projectId);
    }

    const total = (db.prepare(`
      SELECT COUNT(*) as count FROM activities a JOIN snapshots s ON a.snapshot_id = s.id WHERE ${whereClause}
    `).get(...params) as { count: number }).count;

    const byStatus = db.prepare(`
      SELECT status, COUNT(*) as count FROM activities a JOIN snapshots s ON a.snapshot_id = s.id WHERE ${whereClause} GROUP BY status
    `).all(...params);

    const byDiscipline = db.prepare(`
      SELECT discipline, COUNT(*) as count FROM activities a JOIN snapshots s ON a.snapshot_id = s.id WHERE ${whereClause} GROUP BY discipline
    `).all(...params);

    const byWorkFront = db.prepare(`
      SELECT work_front, COUNT(*) as count FROM activities a JOIN snapshots s ON a.snapshot_id = s.id WHERE ${whereClause} GROUP BY work_front
    `).all(...params);

    res.json({ total, byStatus, byDiscipline, byWorkFront });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats', details: String(err) });
  }
});

// GET /api/activities/:id
router.get('/:id', (req: Request, res: Response) => {
  try {
    const row = db.prepare('SELECT * FROM activities WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;
    if (!row) return res.status(404).json({ error: 'Activity not found' });
    res.json(rowToActivity(row));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch activity', details: String(err) });
  }
});

export default router;
