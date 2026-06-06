import { useState } from 'react';
import { Activity, getDisciplineColor, STATUS_CONFIG } from '../../types';
import { Calendar, Wrench, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import clsx from 'clsx';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ActivityCardProps {
  activity: Activity;
  compact?: boolean;
  accentColor?: string;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  try {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y.slice(2)}`;
  } catch {
    return dateStr;
  }
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  active:  { bg: 'rgba(80,209,98,0.2)',   color: '#166534', label: 'Activa' },
  blocked: { bg: 'rgba(245,125,125,0.2)', color: '#991B1B', label: 'Bloqueada' },
  pending: { bg: 'rgba(244,211,79,0.25)', color: '#92400E', label: 'Pendiente' },
};

export default function ActivityCard({ activity, compact = false, accentColor = '#7E92F8' }: ActivityCardProps) {
  const [expanded, setExpanded] = useState(false);
  const color = getDisciplineColor(activity.discipline);
  const statusStyle = STATUS_STYLES[activity.status] ?? STATUS_STYLES.pending;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: activity.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
    zIndex: isDragging ? 50 : 'auto',
  } as React.CSSProperties;

  return (
    <div
      ref={setNodeRef}
      style={isDragging ? { ...style, outline: `2px solid ${accentColor}` } : style}
      {...attributes}
      {...listeners}
      className={clsx('sticky-card group animate-fade-in', isDragging && 'ring-2')}
    >
      {/* Colored top strip */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px] rounded-t-[14px]"
        style={{ background: accentColor }}
      />

      <div className="mt-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            {activity.generalTitle && !compact && (
              <p className="text-[11px] text-gray-400 mb-0.5 truncate font-medium">{activity.generalTitle}</p>
            )}
            <p className={clsx('font-semibold leading-tight text-gray-800', compact ? 'text-xs' : 'text-sm')}>
              {activity.description}
            </p>
          </div>
          <span
            className="badge flex-shrink-0 text-[10px]"
            style={{ background: statusStyle.bg, color: statusStyle.color }}
          >
            {statusStyle.label}
          </span>
        </div>

        {/* Discipline + work front tags */}
        <div className="flex items-center gap-1.5 flex-wrap mb-2">
          <span
            className="badge"
            style={{
              background: `${accentColor}22`,
              color: accentColor,
              border: `1px solid ${accentColor}44`,
              fontSize: '10px',
            }}
          >
            {activity.discipline}
          </span>
          {!compact && activity.workFront && (
            <span className="text-[11px] text-gray-400 font-medium truncate max-w-[130px]">
              {activity.workFront}
            </span>
          )}
        </div>

        {/* Dates */}
        {(activity.startDate || activity.durationDays > 0) && (
          <div className="flex items-center gap-3 text-[11px] text-gray-500 mb-1.5">
            {activity.startDate && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>
                  {activity.startDate === activity.endDate
                    ? formatDate(activity.startDate)
                    : `${formatDate(activity.startDate)} → ${formatDate(activity.endDate)}`}
                </span>
              </div>
            )}
            {activity.durationDays > 0 && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{activity.durationDays}d</span>
              </div>
            )}
          </div>
        )}

        {/* Resources */}
        {activity.resources && !compact && (
          <div className="mt-1">
            <button
              onClick={e => { e.stopPropagation(); setExpanded(p => !p); }}
              className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-gray-600 transition-colors w-full"
            >
              <Wrench className="w-3 h-3 flex-shrink-0" />
              <span className="flex-1 text-left truncate">{expanded ? 'Recursos / Restricciones' : activity.resources}</span>
              {expanded ? <ChevronUp className="w-3 h-3 flex-shrink-0" /> : <ChevronDown className="w-3 h-3 flex-shrink-0" />}
            </button>
            {expanded && (
              <div
                className="mt-1.5 p-2 rounded-lg text-[11px] text-gray-600 leading-relaxed"
                style={{ background: 'rgba(169,180,255,0.12)' }}
              >
                {activity.resources}
              </div>
            )}
          </div>
        )}

        {/* Scheduled days pills */}
        {activity.scheduledDays.length > 0 && !compact && (
          <div className="mt-2 flex gap-1 flex-wrap">
            {activity.scheduledDays.slice(0, 5).map((d, i) => (
              <span
                key={i}
                className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                style={{ background: `${accentColor}18`, color: accentColor }}
              >
                {d.startsWith('col_') ? `Día ${d.replace('col_', '')}` : d.split('-').slice(1).join('/')}
              </span>
            ))}
            {activity.scheduledDays.length > 5 && (
              <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px] font-medium">
                +{activity.scheduledDays.length - 5}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
