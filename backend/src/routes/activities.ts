import { Router, Request, Response } from 'express';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
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
      SELECT a.status as status, COUNT(*) as count FROM activities a JOIN snapshots s ON a.snapshot_id = s.id WHERE ${whereClause} GROUP BY a.status
    `).all(...params);

    const byDiscipline = db.prepare(`
      SELECT a.discipline as discipline, COUNT(*) as count FROM activities a JOIN snapshots s ON a.snapshot_id = s.id WHERE ${whereClause} GROUP BY a.discipline
    `).all(...params);

    const byWorkFront = db.prepare(`
      SELECT a.work_front as work_front, COUNT(*) as count FROM activities a JOIN snapshots s ON a.snapshot_id = s.id WHERE ${whereClause} GROUP BY a.work_front
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

// POST /api/activities  – create a single activity manually
router.post('/', (req: Request, res: Response) => {
  try {
    const { projectId, workFront, generalTitle, description, resources, startDate, endDate, discipline, status } = req.body;
    if (!projectId) return res.status(400).json({ error: 'projectId is required' });

    // Find or create the "Manual" snapshot for this project
    let snapshot = db.prepare(
      "SELECT * FROM snapshots WHERE project_id = ? AND filename = '__manual__'"
    ).get(projectId) as Record<string, unknown> | undefined;

    if (!snapshot) {
      const sid = uuidv4();
      const now = new Date().toISOString();
      db.prepare(
        "INSERT INTO snapshots (id, project_id, discipline, filename, uploaded_at, week_label) VALUES (?, ?, ?, ?, ?, ?)"
      ).run(sid, projectId, discipline || 'General', '__manual__', now, 'Entrada manual');
      snapshot = db.prepare('SELECT * FROM snapshots WHERE id = ?').get(sid) as Record<string, unknown>;
    }

    const id = uuidv4();
    const fp = createHash('md5').update(`${workFront || ''}|${generalTitle || ''}|${description || ''}`).digest('hex');

    const dur = (startDate && endDate)
      ? Math.max(0, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1)
      : 0;

    db.prepare(`
      INSERT INTO activities (id, snapshot_id, work_front, general_title, description, resources,
        scheduled_days, start_date, end_date, duration_days, discipline, status, source_file, fingerprint)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, snapshot.id as string,
      workFront || '', generalTitle || description || '', description || '',
      resources || '', '[]',
      startDate || null, endDate || null, dur,
      discipline || 'General', status || 'pending',
      '__manual__', fp
    );

    db.prepare('UPDATE projects SET updated_at = ? WHERE id = ?').run(new Date().toISOString(), projectId);

    const created = db.prepare('SELECT * FROM activities WHERE id = ?').get(id) as Record<string, unknown>;
    res.status(201).json(rowToActivity(created));
  } catch (err) {
    res.status(500).json({ error: 'Failed to create activity', details: String(err) });
  }
});

// PUT /api/activities/:id  – update an activity
router.put('/:id', (req: Request, res: Response) => {
  try {
    const existing = db.prepare('SELECT * FROM activities WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;
    if (!existing) return res.status(404).json({ error: 'Activity not found' });

    const { workFront, generalTitle, description, resources, startDate, endDate, discipline, status } = req.body;

    const wf   = workFront   ?? existing.work_front;
    const gt   = generalTitle ?? existing.general_title;
    const desc = description  ?? existing.description;
    const res2 = resources    ?? existing.resources;
    const sd   = startDate !== undefined ? (startDate || null) : existing.start_date;
    const ed   = endDate   !== undefined ? (endDate   || null) : existing.end_date;
    const disc = discipline  ?? existing.discipline;
    const stat = status      ?? existing.status;
    const dur  = (sd && ed)
      ? Math.max(0, Math.round((new Date(ed as string).getTime() - new Date(sd as string).getTime()) / 86400000) + 1)
      : existing.duration_days;
    const fp   = createHash('md5').update(`${wf}|${gt}|${desc}`).digest('hex');

    db.prepare(`
      UPDATE activities SET
        work_front=?, general_title=?, description=?, resources=?,
        start_date=?, end_date=?, duration_days=?, discipline=?, status=?, fingerprint=?
      WHERE id=?
    `).run(wf, gt, desc, res2, sd, ed, dur, disc, stat, fp, req.params.id);

    // update project timestamp
    const snap = db.prepare('SELECT * FROM snapshots WHERE id = ?').get(existing.snapshot_id as string) as Record<string, unknown>;
    if (snap) db.prepare('UPDATE projects SET updated_at = ? WHERE id = ?').run(new Date().toISOString(), snap.project_id);

    const updated = db.prepare('SELECT * FROM activities WHERE id = ?').get(req.params.id) as Record<string, unknown>;
    res.json(rowToActivity(updated));
  } catch (err) {
    res.status(500).json({ error: 'Failed to update activity', details: String(err) });
  }
});

// DELETE /api/activities/:id
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const existing = db.prepare('SELECT * FROM activities WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Activity not found' });
    db.prepare('DELETE FROM activities WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete activity', details: String(err) });
  }
});

export default router;
