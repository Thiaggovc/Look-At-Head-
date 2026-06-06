import { useState, useEffect, useCallback } from 'react';
import { Project, Snapshot, Activity } from '../types';
import { snapshotsApi, activitiesApi } from '../api/client';
import Board from '../components/Board/Board';
import { FileSpreadsheet, ChevronDown, Loader2 } from 'lucide-react';
import clsx from 'clsx';

interface BoardPageProps {
  selectedProject: Project | null;
}

export default function BoardPage({ selectedProject }: BoardPageProps) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string>('');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingActivities, setLoadingActivities] = useState(false);

  const loadSnapshots = useCallback(async () => {
    if (!selectedProject) return;
    setLoading(true);
    try {
      const snaps = await snapshotsApi.list(selectedProject.id);
      setSnapshots(snaps);
      if (!selectedSnapshotId) {
        setSelectedSnapshotId('__all__');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedProject]);

  const loadActivities = useCallback(async () => {
    if (!selectedProject) return;
    setLoadingActivities(true);
    try {
      let acts: Activity[];
      if (selectedSnapshotId === '__all__') {
        acts = await activitiesApi.list({ projectId: selectedProject.id });
      } else if (selectedSnapshotId) {
        acts = await snapshotsApi.getActivities(selectedSnapshotId);
      } else {
        acts = [];
      }
      setActivities(acts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingActivities(false);
    }
  }, [selectedSnapshotId, selectedProject]);

  useEffect(() => { loadSnapshots(); }, [loadSnapshots]);
  useEffect(() => { loadActivities(); }, [loadActivities]);

  if (!selectedProject) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Selecciona un proyecto para ver el tablero</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Cargando snapshots...
      </div>
    );
  }


  return (
    <div className="flex flex-col h-full">
      {/* Snapshot selector */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-4">
        <span className="text-sm text-gray-400 font-medium flex-shrink-0">Versión:</span>
        <div className="relative">
          <select
            value={selectedSnapshotId}
            onChange={e => setSelectedSnapshotId(e.target.value)}
            className="appearance-none bg-gray-800 border border-gray-700 rounded-lg pl-3 pr-8 py-2 text-sm text-gray-200 focus:outline-none focus:border-amber-400 cursor-pointer"
          >
              <option value="__all__">— Todos los registros —</option>
            {snapshots.filter(s => s.filename !== '__manual__').map(s => (
              <option key={s.id} value={s.id}>
                {s.filename} — {s.discipline} ({s.week_label})
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
        {selectedSnapshotId && (
          <span className="text-sm text-gray-500">
            {activities.length} actividades
          </span>
        )}
        {loadingActivities && (
          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        )}
      </div>

      {loadingActivities ? (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Cargando actividades...
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          <Board
            activities={activities}
            projectId={selectedProject.id}
            onRefresh={loadActivities}
          />
        </div>
      )}
    </div>
  );
}
