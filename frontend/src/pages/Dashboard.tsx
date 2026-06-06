import { useState, useEffect, useCallback } from 'react';
import { Project, Snapshot, Stats } from '../types';
import { snapshotsApi, activitiesApi, uploadApi } from '../api/client';
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
import clsx from 'clsx';
import toast from 'react-hot-toast';

interface DashboardProps {
  selectedProject: Project | null;
  onProjectCreate: (name: string) => Promise<Project>;
  onRefresh: () => void;
}

export default function Dashboard({ selectedProject, onProjectCreate, onRefresh }: DashboardProps) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
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

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    setCreatingProject(true);
    try {
      await onProjectCreate(newProjectName.trim());
      setNewProjectName('');
      onRefresh();
      toast.success('Proyecto creado exitosamente');
    } catch (err) {
      toast.error('Error al crear proyecto');
    } finally {
      setCreatingProject(false);
    }
  };

  if (!selectedProject) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="max-w-md w-full bg-gray-900 border border-gray-700 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-indigo-600/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8 text-indigo-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Crea tu primer proyecto</h2>
          <p className="text-gray-400 text-sm mb-6">
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

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{selectedProject.name}</h1>
          <p className="text-gray-400 text-sm mt-1">
            Dashboard de planificación lookahead
          </p>
        </div>
        <button
          onClick={() => setShowUpload(p => !p)}
          className={clsx('btn-primary flex items-center gap-2', showUpload && 'bg-indigo-700')}
        >
          {showUpload ? <X className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
          {showUpload ? 'Cerrar' : 'Subir Excel'}
        </button>
      </div>

      {/* Upload zone */}
      {showUpload && (
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 mb-6 animate-fade-in">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
            Cargar archivos Excel
          </h2>
          <UploadZone
            project={selectedProject}
            onSuccess={() => {
              loadData();
              setShowUpload(false);
            }}
          />
        </div>
      )}

      {/* Stats cards */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-xl p-4 animate-pulse h-24" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={<Activity className="w-5 h-5" />}
            label="Total Actividades"
            value={stats.total}
            color="text-indigo-400"
            bg="bg-indigo-500/10"
          />
          <StatCard
            icon={<CheckCircle className="w-5 h-5" />}
            label="Activas"
            value={stats.byStatus.find(s => s.status === 'active')?.count || 0}
            color="text-green-400"
            bg="bg-green-500/10"
          />
          <StatCard
            icon={<AlertCircle className="w-5 h-5" />}
            label="Bloqueadas"
            value={stats.byStatus.find(s => s.status === 'blocked')?.count || 0}
            color="text-red-400"
            bg="bg-red-500/10"
          />
          <StatCard
            icon={<Clock className="w-5 h-5" />}
            label="Pendientes"
            value={stats.byStatus.find(s => s.status === 'pending')?.count || 0}
            color="text-yellow-400"
            bg="bg-yellow-500/10"
          />
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Snapshots list */}
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5">
          <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
            Versiones cargadas ({snapshots.length})
          </h2>
          {snapshots.length === 0 ? (
            <div className="text-center py-8">
              <Upload className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No hay versiones cargadas</p>
              <button
                onClick={() => setShowUpload(true)}
                className="text-indigo-400 hover:text-indigo-300 text-sm mt-2 transition-colors"
              >
                Subir un archivo Excel
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {snapshots.map(s => (
                <div key={s.id} className="flex items-center gap-3 p-2.5 bg-gray-800 rounded-lg">
                  <FileSpreadsheet className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 truncate">{s.filename}</p>
                    <p className="text-xs text-gray-500">{s.discipline} · {s.week_label}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* By discipline */}
        {stats && stats.byDiscipline.length > 0 && (
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5">
            <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-400" />
              Por disciplina
            </h2>
            <div className="space-y-3">
              {stats.byDiscipline.map(({ discipline, count }) => (
                <div key={discipline}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300">{discipline}</span>
                    <span className="text-gray-400">{count}</span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all"
                      style={{ width: `${stats.total > 0 ? (count / stats.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* By work front */}
        {stats && stats.byWorkFront.length > 0 && (
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 md:col-span-2">
            <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-purple-400" />
              Por frente de obra
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {stats.byWorkFront.map(({ work_front, count }) => (
                <div key={work_front} className="bg-gray-800 rounded-lg p-3">
                  <p className="text-sm font-medium text-gray-200 truncate">{work_front}</p>
                  <p className="text-2xl font-bold text-indigo-400 mt-1">{count}</p>
                  <p className="text-xs text-gray-500">actividades</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
  bg,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  bg: string;
}) {
  return (
    <div className={clsx('rounded-xl p-4 border', bg, 'border-transparent')}>
      <div className={clsx('flex items-center gap-2 mb-2', color)}>
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className={clsx('text-3xl font-bold', color)}>{value}</p>
    </div>
  );
}
