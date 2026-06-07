import { useState, useEffect, useCallback, useRef } from 'react';
import { Project, Snapshot, Stats } from '../types';
import { snapshotsApi, activitiesApi } from '../api/client';
import UploadZone from '../components/Upload/UploadZone';
import {
  BarChart3,
  FileSpreadsheet,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Plus,
  Upload,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface DashboardProps {
  selectedProject: Project | null;
  onProjectCreate: (name: string) => Promise<Project>;
  onRefresh: () => void;
}

function useCountUp(target: number, dur = 700): number {
  const [n, setN] = useState(target);
  const prev = useRef(target);
  useEffect(() => {
    const from = prev.current, to = target, t0 = performance.now();
    if (from === to) return;
    let raf: number;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setN(Math.round(from + (to - from) * e));
      if (p < 1) raf = requestAnimationFrame(tick); else prev.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, dur]);
  return n;
}

const STAT_HUES = [70, 150, 22, 80] as const;

const STAT_CARDS = [
  { key: 'total',   label: 'Total',       icon: Activity,    hue: 70  },
  { key: 'active',  label: 'Activas',     icon: CheckCircle, hue: 150 },
  { key: 'blocked', label: 'Bloqueadas',  icon: AlertCircle, hue: 22  },
  { key: 'pending', label: 'Pendientes',  icon: Clock,       hue: 80  },
] as const;

export default function Dashboard({ selectedProject, onProjectCreate, onRefresh }: DashboardProps) {
  const [snapshots, setSnapshots]       = useState<Snapshot[]>([]);
  const [stats, setStats]               = useState<Stats | null>(null);
  const [loading, setLoading]           = useState(false);
  const [showUpload, setShowUpload]     = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [creatingProject, setCreatingProject] = useState(false);

  const loadData = useCallback(async () => {
    if (!selectedProject) return;
    setLoading(true);
    try {
      const [snaps, st] = await Promise.all([
        snapshotsApi.list(selectedProject.id),
        activitiesApi.stats({ projectId: selectedProject.id }),
      ]);
      setSnapshots(snaps);
      setStats(st);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedProject]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    setCreatingProject(true);
    try {
      await onProjectCreate(newProjectName.trim());
      setNewProjectName('');
      onRefresh();
      toast.success('Proyecto creado');
    } catch {
      toast.error('Error al crear proyecto');
    } finally {
      setCreatingProject(false);
    }
  };

  if (!selectedProject) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 32 }}>
        <div style={{
          maxWidth: 400, width: '100%', borderRadius: 'var(--r-xl)', padding: '40px 40px',
          textAlign: 'center', background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)',
          border: '1px solid var(--glass-edge)', boxShadow: 'var(--shadow-modal)',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 'var(--r-lg)', display: 'grid', placeItems: 'center',
            margin: '0 auto 20px', background: 'var(--accent-soft)',
          }}>
            <Plus size={28} style={{ color: 'var(--accent)' }} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px', color: 'var(--text)' }}>
            Crea tu primer proyecto
          </h2>
          <p style={{ color: 'var(--text-3)', fontSize: 13, margin: '0 0 22px' }}>
            Comienza creando un proyecto para gestionar tu planificación lookahead
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={newProjectName}
              onChange={e => setNewProjectName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateProject()}
              placeholder="Nombre del proyecto"
              className="inp"
              style={{ flex: 1 }}
            />
            <button
              onClick={handleCreateProject}
              disabled={creatingProject || !newProjectName.trim()}
              className="btn btn-primary"
            >
              {creatingProject ? '...' : 'Crear'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const statValues = {
    total:   stats?.total ?? 0,
    active:  stats?.byStatus.find(s => s.status === 'active')?.count ?? 0,
    blocked: stats?.byStatus.find(s => s.status === 'blocked')?.count ?? 0,
    pending: stats?.byStatus.find(s => s.status === 'pending')?.count ?? 0,
  };

  return (
    <div className="dash">
      {/* Header row */}
      <div className="dash-row">
        <div>
          <h1 className="title" style={{ fontSize: 24, color: 'var(--text)' }}>{selectedProject.name}</h1>
          <p style={{ color: 'var(--text-3)', fontSize: 13, margin: '4px 0 0' }}>Dashboard de planificación lookahead</p>
        </div>
        <span style={{ flex: 1 }} />
        <button className="btn btn-primary" onClick={() => setShowUpload(p => !p)}>
          {showUpload ? <X /> : <Upload />}
          {showUpload ? 'Cerrar' : 'Subir Excel'}
        </button>
      </div>

      {/* Upload panel */}
      {showUpload && (
        <div className="panel" style={{ marginBottom: 18, animation: 'cardIn .35s var(--ease)' }}>
          <div className="panel-h">
            <FileSpreadsheet />
            Cargar archivos Excel
          </div>
          <UploadZone
            project={selectedProject}
            onSuccess={() => { loadData(); setShowUpload(false); }}
          />
        </div>
      )}

      {/* Stat cards */}
      {loading ? (
        <div className="dash-stats">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="dash-stat" style={{ height: 100, opacity: .4 }} />
          ))}
        </div>
      ) : (
        <div className="dash-stats">
          {STAT_CARDS.map(({ key, label, icon: Icon, hue }) => {
            const val = statValues[key];
            return (
              <StatCard key={key} label={label} icon={Icon} value={val} hue={hue} />
            );
          })}
        </div>
      )}

      {/* Main grid */}
      <div className="dash-grid">
        {/* Snapshots panel */}
        <div className="panel">
          <div className="panel-h">
            <FileSpreadsheet />
            Versiones cargadas ({snapshots.length})
          </div>
          {snapshots.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <Upload size={32} style={{ margin: '0 auto 10px', color: 'var(--text-3)', display: 'block', opacity: .4 }} />
              <p style={{ color: 'var(--text-3)', fontSize: 13, margin: '0 0 8px' }}>No hay versiones cargadas</p>
              <button
                onClick={() => setShowUpload(true)}
                style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', cursor: 'pointer', background: 'none', border: 'none' }}
              >
                Subir un archivo Excel
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
              {snapshots.map(s => (
                <div key={s.id} className="version-card">
                  <div className="vc-ico"><FileSpreadsheet /></div>
                  <div>
                    <div className="vc-t">{s.filename}</div>
                    <div className="vc-s">{s.discipline} · {s.week_label}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* By discipline */}
        {stats && stats.byDiscipline.length > 0 && (
          <div className="panel">
            <div className="panel-h">
              <BarChart3 />
              Por disciplina
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {stats.byDiscipline.map(({ discipline, count }) => {
                const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                return (
                  <div key={discipline}>
                    <div className="bar-row-h">
                      <span style={{ color: 'var(--text-2)', fontSize: 13 }}>{discipline}</span>
                      <b style={{ color: 'var(--text)', fontSize: 13 }}>{count}</b>
                    </div>
                    <div className="bar">
                      <i style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Work fronts */}
      {stats && stats.byWorkFront.length > 0 && (
        <div className="panel">
          <div className="panel-h">
            <BarChart3 />
            Por frente de obra
          </div>
          <div className="front-grid">
            {stats.byWorkFront.map(({ work_front, count }, i) => {
              const hue = [70, 250, 30, 150, 285, 22, 190, 310][i % 8];
              return (
                <div key={work_front} className="front-card" style={{ '--ch': hue } as React.CSSProperties}>
                  <div className="fc-t">{work_front}</div>
                  <div className="fc-v">{count}</div>
                  <div className="fc-s">actividades</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, icon: Icon, value, hue }: { label: string; icon: React.ElementType; value: number; hue: number }) {
  const animated = useCountUp(value);
  return (
    <div className="dash-stat" style={{ '--ch': hue } as React.CSSProperties}>
      <div className="dash-stat-h">
        <Icon size={16} />
        {label}
      </div>
      <div className="dash-stat-v">{animated}</div>
    </div>
  );
}
