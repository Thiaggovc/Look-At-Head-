import { useState } from 'react';
import { Activity, getDisciplineColor, STATUS_CONFIG } from '../../types';
import { Calendar, Wrench, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import clsx from 'clsx';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ActivityCardProps {
  activity: Activity;
  compact?: boolean;
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

export default function ActivityCard({ activity, compact = false }: ActivityCardProps) {
  const [expanded, setExpanded] = useState(false);
  const color = getDisciplineColor(activity.discipline);
  const statusCfg = STATUS_CONFIG[activity.status];

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: activity.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    '--card-bg': color.cardBg,
    '--card-bg-dark': color.cardBgDark,
  } as React.CSSProperties;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={clsx(
        'sticky-card group',
        isDragging && 'ring-2 ring-indigo-500 z-50'
      )}
    >
      {/* Top strip with discipline color */}
      <div className={clsx('absolute top-0 left-0 right-0 h-1 rounded-t-lg', color.bg)} />

      <div className="mt-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            {activity.generalTitle && !compact && (
              <p className="text-xs text-gray-400 mb-0.5 truncate">{activity.generalTitle}</p>
            )}
            <p className={clsx(
              'font-medium leading-tight text-white',
              compact ? 'text-xs' : 'text-sm'
            )}>
              {activity.description}
            </p>
          </div>
          <span className={clsx('badge flex-shrink-0', statusCfg.bg, statusCfg.text, 'border', statusCfg.border)}>
            {statusCfg.label}
          </span>
        </div>

        {/* Discipline tag */}
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className={clsx('badge', color.bg, color.text, 'text-xs')}>
            {activity.discipline}
          </span>
          {!compact && (
            <span className="text-xs text-gray-400 truncate max-w-[120px]">
              {activity.workFront}
            </span>
          )}
        </div>

        {/* Date range */}
        {(activity.startDate || activity.durationDays > 0) && (
          <div className="flex items-center gap-3 text-xs text-gray-400 mb-1">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>
                {activity.startDate === activity.endDate
                  ? formatDate(activity.startDate)
                  : `${formatDate(activity.startDate)} - ${formatDate(activity.endDate)}`
                }
              </span>
            </div>
            {activity.durationDays > 0 && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{activity.durationDays}d</span>
              </div>
            )}
          </div>
        )}

        {/* Resources (expandable) */}
        {activity.resources && (
          <div className="mt-1.5">
            {!compact ? (
              <button
                onClick={e => { e.stopPropagation(); setExpanded(p => !p); }}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors w-full"
              >
                <Wrench className="w-3 h-3" />
                <span className="flex-1 text-left truncate">{expanded ? 'Recursos' : activity.resources}</span>
                {expanded ? <ChevronUp className="w-3 h-3 flex-shrink-0" /> : <ChevronDown className="w-3 h-3 flex-shrink-0" />}
              </button>
            ) : null}
            {expanded && (
              <div className="mt-1.5 p-2 bg-black/20 rounded text-xs text-gray-300 leading-relaxed">
                {activity.resources}
              </div>
            )}
          </div>
        )}

        {/* Scheduled days count */}
        {activity.scheduledDays.length > 0 && !compact && (
          <div className="mt-2 flex gap-1 flex-wrap">
            {activity.scheduledDays.slice(0, 5).map((d, i) => (
              <span key={i} className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded text-xs">
                {d.startsWith('col_') ? `Día ${d.replace('col_', '')}` : d.split('-').slice(1).join('/')}
              </span>
            ))}
            {activity.scheduledDays.length > 5 && (
              <span className="px-1.5 py-0.5 bg-gray-700 text-gray-400 rounded text-xs">
                +{activity.scheduledDays.length - 5}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
