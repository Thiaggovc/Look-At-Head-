import { useState, useRef, useEffect } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { Activity, Filters, STATUS_CONFIG } from '../../types';
import WorkFrontColumn from './WorkFrontColumn';
import ActivityCard from './ActivityCard';
import FilterBar from '../Filters/FilterBar';
import ActivityFormModal from '../Activities/ActivityFormModal';
import { exportBoardToPdf, PdfColumn } from '../../lib/pdfExport';
import { Plus, FileDown } from 'lucide-react';

interface BoardProps {
  activities: Activity[];
  projectId: string;
  projectName?: string;
  onRefresh: () => void;
  renderTopbarExtras?: React.ReactNode;
}

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTH_LABELS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

const HUES = [70, 250, 30, 150, 285, 22, 190, 310];

function colHue(key: string, groupBy: string, index: number): number {
  if (groupBy === 'endDate') return HUES[index % HUES.length];
  if (groupBy === 'status') {
    const label = key.toLowerCase();
    if (label.includes('activ')) return 150;
    if (label.includes('bloq')) return 22;
    return 80;
  }
  let h = 0;
  for (const c of key) h = ((h * 31) + c.charCodeAt(0)) >>> 0;
  return HUES[h % HUES.length];
}

function useInertiaPan(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current; if (!el) return;
    let down = false, startX = 0, startScroll = 0, lastX = 0, vel = 0, lastT = 0, raf = 0;
    const isInteractive = (t: EventTarget | null) => (t as Element)?.closest?.('.card, button, input, select, .col-body');
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 || isInteractive(e.target)) return;
      down = true; startX = lastX = e.clientX; startScroll = el.scrollLeft; lastT = performance.now(); vel = 0;
      cancelAnimationFrame(raf); el.classList.add('grabbing');
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      const now = performance.now(), dt = now - lastT || 16;
      vel = (e.clientX - lastX) / dt; lastX = e.clientX; lastT = now;
      el.scrollLeft = startScroll - (e.clientX - startX);
    };
    const onUp = () => {
      if (!down) return; down = false; el.classList.remove('grabbing');
      let v = vel * 16;
      const decay = () => { v *= 0.92; el.scrollLeft -= v; if (Math.abs(v) > 0.4) raf = requestAnimationFrame(decay); };
      if (Math.abs(v) > 1) raf = requestAnimationFrame(decay);
    };
    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove as EventListener);
    window.addEventListener('pointerup', onUp);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove as EventListener);
      window.removeEventListener('pointerup', onUp);
      cancelAnimationFrame(raf);
    };
  }, []);
}

function useCountUp(target: number, dur = 600): number {
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

function StatsBar({ activities, columns, groupLabel }: { activities: Activity[]; columns: number; groupLabel: string }) {
  const total   = useCountUp(activities.length);
  const cols    = useCountUp(columns);
  const active  = useCountUp(activities.filter(a => a.status === 'active').length);
  const blocked = useCountUp(activities.filter(a => a.status === 'blocked').length);
  const pending = useCountUp(activities.filter(a => a.status === 'pending').length);
  return (
    <div className="statbar">
      <span className="stat"><b className="count-anim">{total}</b> actividades</span>
      <span className="dot" />
      <span className="stat"><b className="count-anim">{cols}</b> {groupLabel}</span>
      <span className="dot" />
      <span className="stat ok"><b className="count-anim">{active}</b> activas</span>
      <span className="dot" />
      <span className="stat bad"><b className="count-anim">{blocked}</b> bloqueadas</span>
      <span className="dot" />
      <span className="stat warn"><b className="count-anim">{pending}</b> pendientes</span>
    </div>
  );
}

function formatColumnTitle(dateStr: string): { main: string; sub: string; dayIndex: number } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return { main: dateStr, sub: '', dayIndex: 0 };
  }
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return {
    main: `${String(d).padStart(2, '0')} ${MONTH_LABELS[m - 1]}`,
    sub: `${DAY_LABELS[date.getDay()]} ${y}`,
    dayIndex: date.getDay(),
  };
}

function filterActivities(activities: Activity[], filters: Filters): Activity[] {
  return activities.filter(a => {
    if (filters.discipline && a.discipline !== filters.discipline) return false;
    if (filters.workFront && a.workFront !== filters.workFront) return false;
    if (filters.status && a.status !== filters.status) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (
        !a.description.toLowerCase().includes(q) &&
        !a.workFront.toLowerCase().includes(q) &&
        !a.resources.toLowerCase().includes(q) &&
        !a.generalTitle.toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });
}

function groupActivities(activities: Activity[], groupBy: Filters['groupBy']): Map<string, Activity[]> {
  const map = new Map<string, Activity[]>();

  for (const a of activities) {
    let key: string;
    if (groupBy === 'endDate') {
      key = a.endDate ?? 'Sin fecha';
    } else if (groupBy === 'workFront') {
      key = a.workFront;
    } else if (groupBy === 'discipline') {
      key = a.discipline;
    } else {
      key = STATUS_CONFIG[a.status]?.label ?? a.status;
    }

    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(a);
  }

  if (groupBy === 'endDate') {
    return new Map(
      [...map.entries()].sort(([a], [b]) => {
        if (a === 'Sin fecha') return 1;
        if (b === 'Sin fecha') return -1;
        return a.localeCompare(b);
      })
    );
  }

  return map;
}

export default function Board({ activities, projectId, projectName, onRefresh, renderTopbarExtras }: BoardProps) {
  const [filters, setFilters] = useState<Filters>({ groupBy: 'endDate' });
  const [localActivities, setLocalActivities] = useState<Activity[]>(activities);
  const [activeActivity, setActiveActivity] = useState<Activity | null>(null);
  const [editingActivity, setEditingActivity] = useState<Activity | null | undefined>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);
  useInertiaPan(scrollRef);

  if (activities !== localActivities && activities.length !== localActivities.length) {
    setLocalActivities(activities);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const filtered = filterActivities(localActivities, filters);
  const grouped  = groupActivities(filtered, filters.groupBy);
  const columns  = [...grouped.entries()];

  const handleDragStart = (event: DragStartEvent) => {
    setActiveActivity(localActivities.find(a => a.id === event.active.id) ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveActivity(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setLocalActivities(prev => {
      const oldIndex = prev.findIndex(a => a.id === active.id);
      const newIndex = prev.findIndex(a => a.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const handleExportPdf = () => {
    const isDateMode = filters.groupBy === 'endDate';
    const pdfColumns: PdfColumn[] = columns.map(([key, acts]) => {
      const isDate = isDateMode && /^\d{4}-\d{2}-\d{2}$/.test(key);
      const fmt = isDate ? formatColumnTitle(key) : null;
      return {
        title: fmt ? fmt.main : key,
        subtitle: fmt ? fmt.sub : undefined,
        dateKey: isDate ? key : undefined,
        activities: acts,
      };
    });
    exportBoardToPdf(pdfColumns, {
      projectName: projectName ?? 'Look Ahead',
      groupLabel,
      calendarMode: isDateMode,
    });
  };

  const groupLabel = filters.groupBy === 'endDate' ? 'días'
    : filters.groupBy === 'workFront' ? 'frentes'
    : filters.groupBy === 'discipline' ? 'disciplinas'
    : 'estados';

  return (
    <div className="flex flex-col h-full">
      {/* Topbar */}
      <div className="topbar">
        <div>
          <div className="title">{projectName ?? 'Tablero'}</div>
        </div>
        <span className="spacer" />
        {renderTopbarExtras}
        <button className="btn btn-ghost" onClick={handleExportPdf}>
          <FileDown />
          Exportar PDF
        </button>
        <button className="btn btn-primary" onClick={() => setEditingActivity(null)}>
          <Plus />
          Nueva actividad
        </button>
      </div>

      <FilterBar filters={filters} onChange={setFilters} activities={localActivities} />

      <StatsBar activities={filtered} columns={columns.length} groupLabel={groupLabel} />

      {/* Board */}
      <div className="board-scroll" ref={scrollRef}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="board">
            {columns.map(([key, acts], index) => {
              const fmt = filters.groupBy === 'endDate' && /^\d{4}-\d{2}-\d{2}$/.test(key)
                ? formatColumnTitle(key)
                : null;
              const hue = colHue(key, filters.groupBy ?? 'endDate', index);
              return (
                <WorkFrontColumn
                  key={key}
                  id={key}
                  title={fmt ? fmt.main : key}
                  subtitle={fmt ? fmt.sub : undefined}
                  activities={acts}
                  hue={hue}
                  onEditActivity={setEditingActivity}
                />
              );
            })}
            {columns.length === 0 && (
              <div className="board-empty">
                <div className="box">
                  <h3>Sin actividades</h3>
                  <p>Ajusta los filtros o crea una nueva actividad</p>
                  <button className="btn btn-primary" style={{ margin: '0 auto' }} onClick={() => setEditingActivity(null)}>
                    <Plus />
                    Nueva actividad
                  </button>
                </div>
              </div>
            )}
          </div>

          <DragOverlay>
            {activeActivity && (
              <div className="card ghost" style={{ width: 'var(--col-w)', '--ch': 70 } as React.CSSProperties}>
                <ActivityCard activity={activeActivity} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Modal */}
      {editingActivity !== undefined && (
        <ActivityFormModal
          projectId={projectId}
          activity={editingActivity}
          onClose={() => setEditingActivity(undefined)}
          onSaved={onRefresh}
        />
      )}
    </div>
  );
}
