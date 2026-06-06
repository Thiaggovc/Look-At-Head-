import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';
import { parseExcelFile } from '../services/excelParser';
import { Activity } from '../types';

const router = Router();

const UPLOADS_DIR = path.join(__dirname, '../../data/uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${uuidv4()}`;
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.xlsx', '.xls', '.xlsm'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${ext}. Only Excel files are allowed.`));
    }
  },
});

// POST /api/upload - upload one or more Excel files
router.post('/', upload.array('files', 20), async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  const { projectId, discipline } = req.body;
  if (!projectId) {
    return res.status(400).json({ error: 'projectId is required' });
  }

  // Verify project exists
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const results = [];

  for (const file of files) {
    try {
      const fileDiscipline = discipline || path.basename(file.originalname, path.extname(file.originalname));
      const snapshotId = uuidv4();
      const now = new Date().toISOString();

      // Read and parse the Excel file
      const buffer = fs.readFileSync(file.path);
      const { activities, weekLabel } = parseExcelFile(buffer, fileDiscipline, file.originalname, snapshotId);

      // Save snapshot to DB
      db.prepare(
        'INSERT INTO snapshots (id, project_id, discipline, filename, uploaded_at, week_label) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(snapshotId, projectId, fileDiscipline, file.originalname, now, weekLabel);

      // Save activities to DB
      const insertActivity = db.prepare(`
        INSERT INTO activities (
          id, snapshot_id, work_front, general_title, description, resources,
          scheduled_days, start_date, end_date, duration_days, discipline, status, source_file, fingerprint
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertMany = db.transaction((acts: Activity[]) => {
        for (const a of acts) {
          insertActivity.run(
            a.id,
            a.snapshotId,
            a.workFront,
            a.generalTitle,
            a.description,
            a.resources,
            JSON.stringify(a.scheduledDays),
            a.startDate,
            a.endDate,
            a.durationDays,
            a.discipline,
            a.status,
            a.sourceFile,
            a.fingerprint
          );
        }
      });

      insertMany(activities);

      // Update project updated_at
      db.prepare('UPDATE projects SET updated_at = ? WHERE id = ?').run(now, projectId);

      results.push({
        snapshotId,
        filename: file.originalname,
        discipline: fileDiscipline,
        weekLabel,
        activitiesCount: activities.length,
      });
    } catch (err) {
      console.error('Error processing file:', file.originalname, err);
      results.push({
        filename: file.originalname,
        error: String(err),
      });
    }
  }

  res.status(201).json({ results });
});

export default router;
