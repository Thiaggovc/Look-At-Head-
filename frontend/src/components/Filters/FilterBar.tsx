import { Search, Filter, LayoutGrid, Tag, Layers } from 'lucide-react';
import { Filters, Activity } from '../../types';
import clsx from 'clsx';

interface FilterBarProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  activities: Activity[];
}

export default function FilterBar({ filters, onChange, activities }: FilterBarProps) {
  const disciplines = [...new Set(activities.map(a => a.discipline))].sort();
  const workFronts = [...new Set(activities.map(a => a.workFront))].sort();
  const statuses = ['active', 'blocked', 'pending'] as const;
  const statusLabels = { active: 'Activa', blocked: 'Bloqueada', pending: 'Pendiente' };

  const update = (key: keyof Filters, value: string | undefined) => {
    onChange({ ...filters, [key]: value });
  };

  const hasActiveFilters =
    filters.discipline || filters.workFront || filters.status || filters.search;

  const clearAll = () => {
    onChange({ groupBy: filters.groupBy });
  };

  return (
    <div className="bg-gray-900 border-b border-gray-800 px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar actividades..."
            value={filters.search || ''}
            onChange={e => update('search', e.target.value || undefined)}
            className="pl-9 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500 w-56"
          />
        </div>

        <div className="w-px h-6 bg-gray-700 flex-shrink-0" />

        {/* Discipline filter */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Tag className="w-4 h-4 text-gray-400" />
          <select
            value={filters.discipline || ''}
            onChange={e => update('discipline', e.target.value || undefined)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="">Todas las disciplinas</option>
            {disciplines.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        {/* Work front filter */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Layers className="w-4 h-4 text-gray-400" />
          <select
            value={filters.workFront || ''}
            onChange={e => update('workFront', e.target.value || undefined)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="">Todos los frentes</option>
            {workFronts.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {statuses.map(s => (
            <button
              key={s}
              onClick={() => update('status', filters.status === s ? undefined : s)}
              className={clsx(
                'px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                filters.status === s
                  ? s === 'active' ? 'bg-green-600 text-white'
                    : s === 'blocked' ? 'bg-red-600 text-white'
                    : 'bg-yellow-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              )}
            >
              {statusLabels[s]}
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-gray-700 flex-shrink-0" />

        {/* Group by */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <LayoutGrid className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-400">Agrupar:</span>
          <div className="flex rounded-lg overflow-hidden border border-gray-700">
            {([
              ['workFront', 'Frente'],
              ['discipline', 'Disciplina'],
              ['status', 'Estado'],
            ] as const).map(([val, label]) => (
              <button
                key={val}
                onClick={() => onChange({ ...filters, groupBy: val })}
                className={clsx(
                  'px-3 py-1.5 text-xs font-medium transition-colors',
                  filters.groupBy === val
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Clear */}
        {hasActiveFilters && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-400 transition-colors ml-auto"
          >
            <Filter className="w-3.5 h-3.5" />
            Limpiar filtros
          </button>
        )}
      </div>
    </div>
  );
}
