import { useState, useEffect, useCallback } from 'react';
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

const STAT_CARDS = [
  { key: 'total',   label: 'Total',       icon: Activity,     accent: '#7E92F8', bg: 'rgba(126,146,248,0.12)' },
  { key: 'active',  label: 'Activas',     icon: CheckCircle,  accent: '#28A745', bg: 'rgba(80,209,98,0.12)'   },
  { key: 'blocked', label: 'Bloqueadas',  icon: AlertCircle,  accent: '#D94B4B', bg: 'rgba(245,125,125,0.12)' },
  { key: 'pending', label: 'Pendientes',  icon: Clock,        accent: '#D7A700', bg: 'rgba(244,211,79,0.15)'  },
] as const;

const DISC_COLORS = ['#7E92F8','#A86CF2','#50D162','#F4D34F','#F57D7D','#67D7F5'];

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
      <div className="flex items-center justify-center h-full p-8">
        <div
          className="max-w-md w-full rounded-3xl p-10 text-center"
          style={{
            background: 'rgba(255,255,255,0.88)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.28)',
            boxShadow: '0 12px 32px -4px rgba(0,0,0,0.1)',
          }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: 'rgba(126,146,248,0.15)' }}
          >
            <Plus className="w-8 h-8" style={{ color: '#7E92F8' }} />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Crea tu primer proyecto</h2>
          <p className="text-gray-500 text-sm mb-6">
            Comienza creando un proyecto para gestionar tu planificación lookahead
          </p>
          <div className="flex gap-2">
            <input
              value={newProjectName}
              onChange={e => setNewProjectName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateProject()}
              placeholder="Nombre del proyecto"
              className="input-field flex-1"
            />
            <button
              onClick={handleCreateProject}
              disabled={creatingProject || !newProjectName.trim()}
              className="btn-primary"
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
    <div className="p-6 max-w-7xl mx-auto">

      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{selectedProject.name}</h1>
          <p className="text-gray-400 text-sm mt-1">Dashboard de planificación lookahead</p>
        </div>
        <button
          onClick={() => setShowUpload(p => !p)}
          className="btn-primary flex items-center gap-2"
        >
          {showUpload ? <X className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
          {showUpload ? 'Cerrar' : 'Subir Excel'}
        </button>
      </div>

      {/* Upload panel */}
      {showUpload && (
        <div
          className="rounded-3xl p-6 mb-6 animate-fade-in"
          style={{
            background: 'rgba(255,255,255,0.88)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.28)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
          }}
        >
          <h2 className="text-base font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4" style={{ color: '#7E92F8' }} />
            Cargar archivos Excel
          </h2>
          <UploadZone
            project={selectedProject}
            onSuccess={() => { loadData(); setShowUpload(false); }}
          />
        </div>
      )}

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="rounded-2xl h-24 animate-pulse"
              style={{ background: 'rgba(255,255,255,0.6)' }}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {STAT_CARDS.map(({ key, label, icon: Icon, accent, bg }) => (
            <div
              key={key}
              className="rounded-2xl p-5"
              style={{
                background: bg,
                border: `1px solid ${accent}33`,
                boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
              }}
            >
              <div className="flex items-center gap-2 mb-3" style={{ color: accent }}>
                <Icon className="w-4 h-4" />
                <span className="text-xs font-semibold">{label}</span>
              </div>
              <p className="text-3xl font-bold" style={{ color: accent }}>
                {statValues[key]}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Snapshots */}
        <div
          className="rounded-3xl p-5"
          style={{
            background: 'rgba(255,255,255,0.88)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.28)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.06)',
          }}
        >
          <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4" style={{ color: '#7E92F8' }} />
            Versiones cargadas ({snapshots.length})
          </h2>
          {snapshots.length === 0 ? (
            <div className="text-center py-8">
              <Upload className="w-8 h-8 mx-auto mb-2" style={{ color: '#CBD5E1' }} />
              <p className="text-gray-400 text-sm">No hay versiones cargadas</p>
              <button
                onClick={() => setShowUpload(true)}
                className="text-sm mt-2 font-medium transition-colors"
                style={{ color: '#7E92F8' }}
              >
                Subir un archivo Excel
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {snapshots.map(s => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: 'rgba(126,146,248,0.07)', border: '1px solid rgba(126,146,248,0.15)' }}
                >
                  <FileSpreadsheet className="w-4 h-4 flex-shrink-0" style={{ color: '#28A745' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{s.filename}</p>
                    <p className="text-xs text-gray-400">{s.discipline} · {s.week_label}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* By discipline */}
        {stats && stats.byDiscipline.length > 0 && (
          <div
            className="rounded-3xl p-5"
            style={{
              background: 'rgba(255,255,255,0.88)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.28)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.06)',
            }}
          >
            <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" style={{ color: '#A86CF2' }} />
              Por disciplina
            </h2>
            <div className="space-y-3">
              {stats.byDiscipline.map(({ discipline, count }, i) => {
                const color = DISC_COLORS[i % DISC_COLORS.length];
                const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                return (
                  <div key={discipline}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-gray-600 font-medium">{discipline}</span>
                      <span className="text-gray-400 font-semibold">{count}</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(169,180,255,0.2)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* By work front */}
        {stats && stats.byWorkFront.length > 0 && (
          <div
            className="rounded-3xl p-5 md:col-span-2"
            style={{
              background: 'rgba(255,255,255,0.88)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.28)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.06)',
            }}
          >
            <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" style={{ color: '#7E92F8' }} />
              Por frente de obra
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {stats.byWorkFront.map(({ work_front, count }, i) => {
                const color = DISC_COLORS[i % DISC_COLORS.length];
                return (
                  <div
                    key={work_front}
                    className="rounded-2xl p-4"
                    style={{ background: `${color}14`, border: `1px solid ${color}33` }}
                  >
                    <p className="text-xs font-semibold text-gray-500 truncate mb-1">{work_front}</p>
                    <p className="text-2xl font-bold" style={{ color }}>{count}</p>
                    <p className="text-xs text-gray-400 mt-0.5">actividades</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
