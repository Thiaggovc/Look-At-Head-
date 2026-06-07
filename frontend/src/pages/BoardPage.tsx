import { useState, useEffect, useCallback } from 'react';
import { Project, Snapshot, Activity } from '../types';
import { snapshotsApi, activitiesApi } from '../api/client';
import Board from '../components/Board/Board';
import { FileSpreadsheet, Loader2 } from 'lucide-react';

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-3)' }}>
        <div style={{ textAlign: 'center' }}>
          <FileSpreadsheet size={48} style={{ margin: '0 auto 12px', opacity: .3, display: 'block' }} />
          <p style={{ margin: 0, fontSize: 14 }}>Selecciona un proyecto para ver el tablero</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-3)' }}>
        <Loader2 size={24} style={{ marginRight: 8, animation: 'spin 1s linear infinite' }} />
        Cargando snapshots...
      </div>
    );
  }

  const snapshotSelector = (
    <select
      className="version-pill"
      value={selectedSnapshotId}
      onChange={e => setSelectedSnapshotId(e.target.value)}
    >
      <option value="__all__">— Todos los registros —</option>
      {snapshots.filter(s => s.filename !== '__manual__').map(s => (
        <option key={s.id} value={s.id}>
          {s.filename} — {s.discipline} ({s.week_label})
        </option>
      ))}
    </select>
  );

  return (
    <div className="flex flex-col h-full">
      {loadingActivities ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-3)' }}>
          <Loader2 size={24} style={{ marginRight: 8 }} />
          Cargando actividades...
        </div>
      ) : (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <Board
            activities={activities}
            projectId={selectedProject.id}
            projectName={selectedProject.name}
            onRefresh={loadActivities}
            renderTopbarExtras={snapshotSelector}
          />
        </div>
      )}
    </div>
  );
}
