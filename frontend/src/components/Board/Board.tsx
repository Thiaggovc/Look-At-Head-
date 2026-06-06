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
import { Activity, Filters, getDisciplineColor, STATUS_CONFIG } from '../../types';
import WorkFrontColumn from './WorkFrontColumn';
import ActivityCard from './ActivityCard';
import FilterBar from '../Filters/FilterBar';

interface BoardProps {
  activities: Activity[];
}

const COLUMN_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f97316',
  '#10b981', '#06b6d4', '#f59e0b', '#84cc16',
];

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

function groupActivities(
  activities: Activity[],
  groupBy: Filters['groupBy']
): Map<string, Activity[]> {
  const map = new Map<string, Activity[]>();
  for (const a of activities) {
    const key =
      groupBy === 'workFront' ? a.workFront
      : groupBy === 'discipline' ? a.discipline
      : STATUS_CONFIG[a.status].label;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(a);
  }
  return map;
}

export default function Board({ activities }: BoardProps) {
  const [filters, setFilters] = useState<Filters>({ groupBy: 'workFront' });
  const [localActivities, setLocalActivities] = useState<Activity[]>(activities);
  const [activeActivity, setActiveActivity] = useState<Activity | null>(null);

  // Sync when activities prop changes
  if (activities !== localActivities && activities.length !== localActivities.length) {
    setLocalActivities(activities);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const filtered = filterActivities(localActivities, filters);
  const grouped = groupActivities(filtered, filters.groupBy);
  const columns = [...grouped.entries()];

  const handleDragStart = (event: DragStartEvent) => {
    const activity = localActivities.find(a => a.id === event.active.id);
    setActiveActivity(activity || null);
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

  return (
    <div className="flex flex-col h-full">
      <FilterBar filters={filters} onChange={setFilters} activities={localActivities} />

      {/* Summary stats bar */}
      <div
        className="px-5 py-2.5 flex items-center gap-3 text-xs font-medium border-b"
        style={{
          background: 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(8px)',
          borderColor: 'rgba(169,180,255,0.2)',
        }}
      >
        <span className="text-gray-500">{filtered.length} actividades</span>
        <span className="text-gray-300">·</span>
        <span className="text-gray-500">{columns.length} {filters.groupBy === 'workFront' ? 'frentes' : filters.groupBy === 'discipline' ? 'disciplinas' : 'estados'}</span>
        <span className="text-gray-300">·</span>
        <span style={{ color: '#28A745' }}>{filtered.filter(a => a.status === 'active').length} activas</span>
        <span className="text-gray-300">·</span>
        <span style={{ color: '#D94B4B' }}>{filtered.filter(a => a.status === 'blocked').length} bloqueadas</span>
        <span className="text-gray-300">·</span>
        <span style={{ color: '#D7A700' }}>{filtered.filter(a => a.status === 'pending').length} pendientes</span>
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
            {columns.map(([groupKey, groupActivities], index) => (
              <WorkFrontColumn
                key={groupKey}
                id={groupKey}
                title={groupKey}
                activities={groupActivities}
                colorIndex={index}
              />
            ))}
            {columns.length === 0 && (
              <div className="flex-1 flex items-center justify-center">
                <div
                  className="text-center px-10 py-12 rounded-3xl"
                  style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(169,180,255,0.2)' }}
                >
                  <p className="text-lg font-semibold text-gray-600 mb-1">Sin actividades</p>
                  <p className="text-sm text-gray-400">Ajusta los filtros o sube un archivo Excel</p>
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
    </div>
  );
}
