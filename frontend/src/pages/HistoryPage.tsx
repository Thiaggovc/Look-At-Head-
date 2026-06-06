import { useState, useEffect, useCallback } from 'react';
import { Project, Snapshot, CompareResponse } from '../types';
import { snapshotsApi } from '../api/client';
import VersionList from '../components/VersionHistory/VersionList';
import ComparisonView from '../components/VersionHistory/ComparisonView';
import { History, Loader2, X, FileSpreadsheet } from 'lucide-react';
import toast from 'react-hot-toast';

interface HistoryPageProps {
  selectedProject: Project | null;
}

export default function HistoryPage({ selectedProject }: HistoryPageProps) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [comparison, setComparison] = useState<CompareResponse | null>(null);
  const [comparing, setComparing] = useState(false);

  const loadSnapshots = useCallback(async () => {
    if (!selectedProject) return;
    setLoading(true);
    try {
      const snaps = await snapshotsApi.list(selectedProject.id);
      setSnapshots(snaps);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedProject]);

  useEffect(() => {
    loadSnapshots();
    setSelectedIds([]);
    setComparison(null);
  }, [loadSnapshots]);

  const handleSelect = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
    setComparison(null);
  };

  const handleCompare = async () => {
    if (selectedIds.length !== 2) return;
    setComparing(true);
    try {
      const result = await snapshotsApi.compare(selectedIds[0], selectedIds[1]);
      setComparison(result);
    } catch (err) {
      toast.error('Error al comparar versiones');
    } finally {
      setComparing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar esta versión? Esta acción no se puede deshacer.')) return;
    try {
      await snapshotsApi.delete(id);
      setSnapshots(prev => prev.filter(s => s.id !== id));
      setSelectedIds(prev => prev.filter(x => x !== id));
      if (comparison?.snapshotA.id === id || comparison?.snapshotB.id === id) {
        setComparison(null);
      }
      toast.success('Versión eliminada');
    } catch (err) {
      toast.error('Error al eliminar la versión');
    }
  };

  if (!selectedProject) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Selecciona un proyecto para ver el historial</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Left panel: version list */}
      <div className="w-80 flex-shrink-0 border-r border-gray-800 flex flex-col">
        <div className="px-4 py-4 border-b border-gray-800">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <History className="w-4 h-4 text-amber-500" />
            Historial de versiones
          </h2>
          <p className="text-xs text-gray-400 mt-1">{snapshots.length} versiones cargadas</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Cargando...
            </div>
          ) : (
            <VersionList
              snapshots={snapshots}
              selectedIds={selectedIds}
              onSelect={handleSelect}
              onDelete={handleDelete}
              onCompare={handleCompare}
            />
          )}
        </div>
      </div>

      {/* Right panel: comparison */}
      <div className="flex-1 overflow-y-auto">
        {comparing ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Comparando versiones...
          </div>
        ) : comparison ? (
          <div className="p-6 max-w-4xl mx-auto">
            <div className="flex justify-end mb-4">
              <button
                onClick={() => { setComparison(null); setSelectedIds([]); }}
                className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors"
              >
                <X className="w-4 h-4" />
                Cerrar comparación
              </button>
            </div>
            <ComparisonView comparison={comparison} />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 opacity-30" />
              {snapshots.length < 2 ? (
                <>
                  <p className="font-medium">Se necesitan al menos 2 versiones</p>
                  <p className="text-sm mt-1">Sube más archivos Excel desde el Dashboard</p>
                </>
              ) : (
                <>
                  <p className="font-medium">Selecciona 2 versiones para comparar</p>
                  <p className="text-sm mt-1">Haz clic en las versiones del panel izquierdo</p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
