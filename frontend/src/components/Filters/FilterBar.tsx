import { Search, Filter, LayoutGrid, Tag, Layers } from 'lucide-react';
import { Filters, Activity } from '../../types';
import clsx from 'clsx';

interface FilterBarProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  activities: Activity[];
}

const selectStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.8)',
  border: '1px solid rgba(245,166,35,0.35)',
  borderRadius: 10,
  padding: '6px 10px',
  fontSize: 13,
  color: '#374151',
  outline: 'none',
  fontFamily: 'inherit',
  cursor: 'pointer',
};

export default function FilterBar({ filters, onChange, activities }: FilterBarProps) {
  const disciplines = [...new Set(activities.map(a => a.discipline))].sort();
  const workFronts  = [...new Set(activities.map(a => a.workFront))].sort();
  const statuses    = ['active', 'blocked', 'pending'] as const;

  const STATUS_PILL: Record<string, { active: string; inactive: string; label: string }> = {
    active:  { active: 'rgba(80,209,98,0.25)',   inactive: 'rgba(255,255,255,0.7)', label: 'Activa' },
    blocked: { active: 'rgba(245,125,125,0.25)', inactive: 'rgba(255,255,255,0.7)', label: 'Bloqueada' },
    pending: { active: 'rgba(244,211,79,0.35)',  inactive: 'rgba(255,255,255,0.7)', label: 'Pendiente' },
  };
  const STATUS_TEXT = { active: '#166534', blocked: '#991B1B', pending: '#92400E' };

  const update = (key: keyof Filters, value: string | undefined) => onChange({ ...filters, [key]: value });
  const hasActiveFilters = filters.discipline || filters.workFront || filters.status || filters.search;

  return (
    <div
      className="px-5 py-3 border-b"
      style={{
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(12px)',
        borderColor: 'rgba(245,166,35,0.2)',
      }}
    >
      <div className="flex flex-wrap items-center gap-2.5">

        {/* Search */}
        <div className="relative flex-shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: '#9CA3AF' }} />
          <input
            type="text"
            placeholder="Buscar actividades..."
            value={filters.search || ''}
            onChange={e => update('search', e.target.value || undefined)}
            className="pl-9 pr-3 py-1.5 text-sm w-52"
            style={{ ...selectStyle, padding: '6px 12px 6px 32px' }}
          />
        </div>

        <div className="w-px h-5 flex-shrink-0" style={{ background: 'rgba(245,166,35,0.3)' }} />

        {/* Discipline */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Tag className="w-3.5 h-3.5" style={{ color: '#9CA3AF' }} />
          <select
            value={filters.discipline || ''}
            onChange={e => update('discipline', e.target.value || undefined)}
            style={selectStyle}
          >
            <option value="">Todas las disciplinas</option>
            {disciplines.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        {/* Work front */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Layers className="w-3.5 h-3.5" style={{ color: '#9CA3AF' }} />
          <select
            value={filters.workFront || ''}
            onChange={e => update('workFront', e.target.value || undefined)}
            style={selectStyle}
          >
            <option value="">Todos los frentes</option>
            {workFronts.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>

        {/* Status pills */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {statuses.map(s => {
            const active = filters.status === s;
            return (
              <button
                key={s}
                onClick={() => update('status', active ? undefined : s)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150"
                style={{
                  background: active ? STATUS_PILL[s].active : STATUS_PILL[s].inactive,
                  color: active ? STATUS_TEXT[s] : '#6B7280',
                  border: active
                    ? `1px solid ${STATUS_TEXT[s]}44`
                    : '1px solid rgba(245,166,35,0.25)',
                  boxShadow: active ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                {STATUS_PILL[s].label}
              </button>
            );
          })}
        </div>

        <div className="w-px h-5 flex-shrink-0" style={{ background: 'rgba(245,166,35,0.3)' }} />

        {/* Group by */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <LayoutGrid className="w-3.5 h-3.5" style={{ color: '#9CA3AF' }} />
          <span className="text-xs text-gray-400 font-medium">Agrupar:</span>
          <div
            className="flex rounded-xl overflow-hidden"
            style={{ border: '1px solid rgba(245,166,35,0.35)', background: 'rgba(255,255,255,0.6)' }}
          >
            {([['workFront', 'Frente'], ['discipline', 'Disciplina'], ['status', 'Estado']] as const).map(([val, label]) => (
              <button
                key={val}
                onClick={() => onChange({ ...filters, groupBy: val })}
                className="px-3 py-1.5 text-xs font-semibold transition-all duration-150"
                style={filters.groupBy === val
                  ? { background: '#F5A623', color: '#fff' }
                  : { background: 'transparent', color: '#6B7280' }
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Clear */}
        {hasActiveFilters && (
          <button
            onClick={() => onChange({ groupBy: filters.groupBy })}
            className="flex items-center gap-1.5 text-xs font-medium transition-colors ml-auto"
            style={{ color: '#D94B4B' }}
          >
            <Filter className="w-3.5 h-3.5" />
            Limpiar filtros
          </button>
        )}
      </div>
    </div>
  );
}
