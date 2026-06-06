import { Snapshot } from '../../types';
import { FileSpreadsheet, Calendar, Tag, Trash2, GitCompare } from 'lucide-react';
import clsx from 'clsx';

interface VersionListProps {
  snapshots: Snapshot[];
  selectedIds: string[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onCompare: () => void;
}

function formatDate(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    return d.toLocaleString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return isoStr;
  }
}

export default function VersionList({
  snapshots,
  selectedIds,
  onSelect,
  onDelete,
  onCompare,
}: VersionListProps) {
  return (
    <div className="space-y-3">
      {selectedIds.length === 2 && (
        <div className="sticky top-0 z-10 bg-gray-900 border border-indigo-500/40 rounded-xl p-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-indigo-300 flex items-center gap-2">
              <GitCompare className="w-4 h-4" />
              2 versiones seleccionadas para comparar
            </div>
            <button onClick={onCompare} className="btn-primary text-sm py-1.5">
              Comparar
            </button>
          </div>
        </div>
      )}

      {snapshots.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <FileSpreadsheet className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No hay versiones cargadas</p>
        </div>
      )}

      {snapshots.map(snapshot => {
        const isSelected = selectedIds.includes(snapshot.id);
        const selectionIndex = selectedIds.indexOf(snapshot.id);
        return (
          <div
            key={snapshot.id}
            className={clsx(
              'relative flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all duration-150',
              isSelected
                ? 'border-indigo-500/60 bg-indigo-500/10'
                : 'border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800'
            )}
            onClick={() => onSelect(snapshot.id)}
          >
            {/* Selection indicator */}
            {isSelected && (
              <div className="absolute top-2 right-2 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-xs font-bold text-white">
                {selectionIndex + 1}
              </div>
            )}

            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileSpreadsheet className="w-5 h-5 text-green-400" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-100 truncate">
                {snapshot.filename}
              </p>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  {snapshot.discipline}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(snapshot.uploaded_at)}
                </span>
              </div>
              <p className="text-xs text-indigo-400 mt-1">{snapshot.week_label}</p>
            </div>

            <button
              onClick={e => { e.stopPropagation(); onDelete(snapshot.id); }}
              className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0 mt-1 pr-6"
              title="Eliminar snapshot"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      })}

      {snapshots.length >= 2 && selectedIds.length < 2 && (
        <p className="text-xs text-gray-500 text-center pt-2">
          Selecciona 2 versiones para comparar
        </p>
      )}
    </div>
  );
}
