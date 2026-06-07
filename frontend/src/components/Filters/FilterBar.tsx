import { useRef, useLayoutEffect, useState } from 'react';
import { Search, LayoutGrid, Tag, Layers, X } from 'lucide-react';
import { Filters, Activity } from '../../types';

interface FilterBarProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  activities: Activity[];
}

const GROUPS = [
  ['endDate',    'Fecha fin'],
  ['workFront',  'Frente'],
  ['discipline', 'Disciplina'],
  ['status',     'Estado'],
] as const;

const STATUS_PILLS = [
  { key: 'active',  label: 'Activa',     cls: 's-active'  },
  { key: 'blocked', label: 'Bloqueada',  cls: 's-blocked' },
  { key: 'pending', label: 'Pendiente',  cls: 's-pending' },
] as const;

export default function FilterBar({ filters, onChange, activities }: FilterBarProps) {
  const disciplines = [...new Set(activities.map(a => a.discipline))].sort();
  const workFronts  = [...new Set(activities.map(a => a.workFront))].sort();

  const update = (key: keyof Filters, value: string | undefined) => onChange({ ...filters, [key]: value });
  const hasActiveFilters = filters.discipline || filters.workFront || filters.status || filters.search;

  const activeGroupIdx = GROUPS.findIndex(([v]) => v === (filters.groupBy ?? 'endDate'));

  // Measure segmented thumb
  const segRef = useRef<HTMLDivElement>(null);
  const [thumbStyle, setThumbStyle] = useState({ left: 3, width: 80, top: 3, height: 30 });

  useLayoutEffect(() => {
    if (!segRef.current) return;
    const btns = segRef.current.querySelectorAll('button');
    const active = btns[activeGroupIdx] as HTMLButtonElement | undefined;
    if (!active) return;
    setThumbStyle({
      left: active.offsetLeft,
      top: active.offsetTop,
      width: active.offsetWidth,
      height: active.offsetHeight,
    });
  }, [activeGroupIdx, activities.length]);

  return (
    <div className="filters">
      {/* Search */}
      <div className="search">
        <Search />
        <input
          type="text"
          placeholder="Buscar actividades..."
          value={filters.search || ''}
          onChange={e => update('search', e.target.value || undefined)}
        />
      </div>

      <div className="divider" />

      {/* Discipline */}
      <div className="sel-wrap">
        <Tag />
        <select
          className="sel"
          value={filters.discipline || ''}
          onChange={e => update('discipline', e.target.value || undefined)}
        >
          <option value="">Todas las disciplinas</option>
          {disciplines.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* Work front */}
      <div className="sel-wrap">
        <Layers />
        <select
          className="sel"
          value={filters.workFront || ''}
          onChange={e => update('workFront', e.target.value || undefined)}
        >
          <option value="">Todos los frentes</option>
          {workFronts.map(w => <option key={w} value={w}>{w}</option>)}
        </select>
      </div>

      <div className="divider" />

      {/* Status pills */}
      {STATUS_PILLS.map(({ key, label, cls }) => {
        const on = filters.status === key;
        return (
          <button
            key={key}
            onClick={() => update('status', on ? undefined : key)}
            className={'pill ' + cls + (on ? ' on' : '')}
          >
            {label}
          </button>
        );
      })}

      <div className="divider" />

      {/* Group by segmented */}
      <div className="seg">
        <span className="lbl">
          <LayoutGrid />
          Agrupar:
        </span>
        <div className="segmented" ref={segRef}>
          <div
            className="seg-thumb"
            style={{
              position: 'absolute',
              left: thumbStyle.left,
              top: thumbStyle.top,
              width: thumbStyle.width,
              height: thumbStyle.height,
            }}
          />
          {GROUPS.map(([val, label]) => (
            <button
              key={val}
              onClick={() => onChange({ ...filters, groupBy: val })}
              className={filters.groupBy === val ? 'on' : ''}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Clear */}
      {hasActiveFilters && (
        <button className="clear" onClick={() => onChange({ groupBy: filters.groupBy })}>
          <X />
          Limpiar
        </button>
      )}
    </div>
  );
}
