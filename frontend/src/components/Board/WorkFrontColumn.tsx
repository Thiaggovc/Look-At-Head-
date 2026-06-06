import { Activity } from '../../types';
import ActivityCard from './ActivityCard';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import clsx from 'clsx';
import { Building2, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface WorkFrontColumnProps {
  id: string;
  title: string;
  subtitle?: string;
  activities: Activity[];
  colorIndex?: number;
  onEditActivity?: (activity: Activity) => void;
}

const COLUMN_PALETTES = [
  { base: '#F5C435', surface: 'rgba(175,192,255,0.82)', accent: '#F5A623', text: '#7A5800' },
  { base: '#F4D34F', surface: 'rgba(244,211,79,0.82)',  accent: '#D7A700', text: '#7A5800' },
  { base: '#FF9B6A', surface: 'rgba(255,155,106,0.82)', accent: '#E06030', text: '#7A2800' },
  { base: '#50D162', surface: 'rgba(80,209,98,0.82)',   accent: '#28A745', text: '#145C24' },
  { base: '#F57D7D', surface: 'rgba(245,125,125,0.82)', accent: '#D94B4B', text: '#831414' },
  { base: '#67D7F5', surface: 'rgba(103,215,245,0.82)', accent: '#0EA5C9', text: '#0B5E7A' },
];

export default function WorkFrontColumn({ id, title, subtitle, activities, colorIndex = 0, onEditActivity }: WorkFrontColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const palette = COLUMN_PALETTES[colorIndex % COLUMN_PALETTES.length];

  const activeCount  = activities.filter(a => a.status === 'active').length;
  const blockedCount = activities.filter(a => a.status === 'blocked').length;
  const pendingCount = activities.filter(a => a.status === 'pending').length;

  return (
    <div
      className="kanban-column flex-shrink-0"
      style={{ width: 300, minWidth: 280, maxWidth: 320 }}
    >
      {/* Header */}
      <div
        className="column-header"
        style={{ background: palette.surface }}
      >
        {/* Top highlight */}
        <div
          className="absolute top-0 left-0 right-0 h-[12%] rounded-t-[20px]"
          style={{
            background: 'linear-gradient(180deg,rgba(255,255,255,0.22) 0%,transparent 100%)',
            pointerEvents: 'none',
          }}
        />

        <div className="flex items-center gap-2 mb-2 relative">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.35)' }}
          >
            <Building2 className="w-3.5 h-3.5" style={{ color: palette.text }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3
              className="font-semibold text-sm truncate leading-tight"
              style={{ color: palette.text }}
              title={title}
            >
              {title}
            </h3>
            {subtitle && (
              <p className="text-[10px] font-medium truncate mt-0.5" style={{ color: palette.text, opacity: 0.65 }}>
                {subtitle}
              </p>
            )}
          </div>
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.45)', color: palette.text }}
          >
            {activities.length}
          </span>
        </div>

        {/* Status mini indicators */}
        <div className="flex items-center gap-3 text-xs relative">
          {activeCount > 0 && (
            <span className="flex items-center gap-1 font-medium" style={{ color: '#166534' }}>
              <CheckCircle className="w-3 h-3" />{activeCount} activas
            </span>
          )}
          {blockedCount > 0 && (
            <span className="flex items-center gap-1 font-medium" style={{ color: '#991B1B' }}>
              <AlertCircle className="w-3 h-3" />{blockedCount} bloqueadas
            </span>
          )}
          {pendingCount > 0 && (
            <span className="flex items-center gap-1 font-medium" style={{ color: '#92400E' }}>
              <Clock className="w-3 h-3" />{pendingCount} pendientes
            </span>
          )}
        </div>

        {/* Progress bar */}
        {activities.length > 0 && (
          <div className="mt-2.5 h-1.5 rounded-full overflow-hidden flex" style={{ background: 'rgba(255,255,255,0.3)' }}>
            <div
              className="h-full transition-all duration-300"
              style={{ width: `${(activeCount / activities.length) * 100}%`, background: '#28A745' }}
            />
            <div
              className="h-full transition-all duration-300"
              style={{ width: `${(pendingCount / activities.length) * 100}%`, background: '#F59E0B' }}
            />
            <div
              className="h-full transition-all duration-300"
              style={{ width: `${(blockedCount / activities.length) * 100}%`, background: '#EF4444' }}
            />
          </div>
        )}
      </div>

      {/* Cards area */}
      <div
        ref={setNodeRef}
        className="column-body transition-colors duration-150"
        style={{
          background: isOver
            ? `rgba(${hexToRgb(palette.base)},0.55)`
            : `rgba(${hexToRgb(palette.base)},0.40)`,
          outline: isOver ? `2px solid ${palette.accent}` : 'none',
          outlineOffset: '-2px',
        }}
      >
        <SortableContext items={activities.map(a => a.id)} strategy={verticalListSortingStrategy}>
          {activities.map(activity => (
            <ActivityCard key={activity.id} activity={activity} accentColor={palette.accent} onEdit={onEditActivity} />
          ))}
        </SortableContext>
        {activities.length === 0 && (
          <div
            className="flex items-center justify-center h-20 text-sm font-medium rounded-xl"
            style={{ color: palette.text, background: 'rgba(255,255,255,0.2)' }}
          >
            Sin actividades
          </div>
        )}
      </div>
    </div>
  );
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}
