import { useState } from 'react';
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
import { Plus } from 'lucide-react';

interface BoardProps {
  activities: Activity[];
  projectId: string;
  onRefresh: () => void;
}

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTH_LABELS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

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

export default function Board({ activities, projectId, onRefresh }: BoardProps) {
  const [filters, setFilters] = useState<Filters>({ groupBy: 'endDate' });
  const [localActivities, setLocalActivities] = useState<Activity[]>(activities);
  const [activeActivity, setActiveActivity] = useState<Activity | null>(null);
  const [editingActivity, setEditingActivity] = useState<Activity | null | undefined>(undefined);
  // undefined = modal closed, null = new activity, Activity = editing

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

  const groupLabel = filters.groupBy === 'endDate' ? 'días'
    : filters.groupBy === 'workFront' ? 'frentes'
    : filters.groupBy === 'discipline' ? 'disciplinas'
    : 'estados';

  return (
    <div className="flex flex-col h-full">
      <FilterBar filters={filters} onChange={setFilters} activities={localActivities} />

      {/* Stats + Nueva actividad */}
      <div
        className="px-5 py-2.5 flex items-center gap-3 text-xs font-medium border-b"
        style={{
          background: 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(8px)',
          borderColor: 'rgba(245,166,35,0.2)',
        }}
      >
        <span className="text-gray-500">{filtered.length} actividades</span>
        <span className="text-gray-300">·</span>
        <span className="text-gray-500">{columns.length} {groupLabel}</span>
        <span className="text-gray-300">·</span>
        <span style={{ color: '#28A745' }}>{filtered.filter(a => a.status === 'active').length} activas</span>
        <span className="text-gray-300">·</span>
        <span style={{ color: '#D94B4B' }}>{filtered.filter(a => a.status === 'blocked').length} bloqueadas</span>
        <span className="text-gray-300">·</span>
        <span style={{ color: '#D7A700' }}>{filtered.filter(a => a.status === 'pending').length} pendientes</span>

        <span className="flex-1" />

        <button
          onClick={() => setEditingActivity(null)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all"
          style={{ background: 'linear-gradient(135deg,#F5A623,#E07B00)', boxShadow: '0 2px 8px rgba(245,166,35,0.35)' }}
        >
          <Plus className="w-3.5 h-3.5" />
          Nueva actividad
        </button>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 p-5 h-full min-h-0 items-start">
            {columns.map(([key, acts], index) => {
              const fmt = filters.groupBy === 'endDate' && /^\d{4}-\d{2}-\d{2}$/.test(key)
                ? formatColumnTitle(key)
                : null;
              return (
                <WorkFrontColumn
                  key={key}
                  id={key}
                  title={fmt ? fmt.main : key}
                  subtitle={fmt ? fmt.sub : undefined}
                  activities={acts}
                  colorIndex={fmt ? fmt.dayIndex : index}
                  onEditActivity={setEditingActivity}
                />
              );
            })}
            {columns.length === 0 && (
              <div className="flex-1 flex items-center justify-center">
                <div
                  className="text-center px-10 py-12 rounded-3xl"
                  style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(245,166,35,0.2)' }}
                >
                  <p className="text-lg font-semibold text-gray-600 mb-1">Sin actividades</p>
                  <p className="text-sm text-gray-400">Ajusta los filtros o crea una nueva actividad</p>
                  <button
                    onClick={() => setEditingActivity(null)}
                    className="mt-4 flex items-center gap-2 mx-auto px-4 py-2 rounded-lg text-sm font-semibold text-white"
                    style={{ background: 'linear-gradient(135deg,#F5A623,#E07B00)' }}
                  >
                    <Plus className="w-4 h-4" />
                    Nueva actividad
                  </button>
                </div>
              </div>
            )}
          </div>

          <DragOverlay>
            {activeActivity && (
              <div className="w-[280px] rotate-2 opacity-90 scale-105">
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
