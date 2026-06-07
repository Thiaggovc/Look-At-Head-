import { Activity } from '../../types';
import { Calendar, Wrench, Clock, Pencil } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ActivityCardProps {
  activity: Activity;
  compact?: boolean;
  accentColor?: string;
  onEdit?: (activity: Activity) => void;
}

function formatDate(startDate: string | null, endDate?: string | null): string {
  if (!startDate) return '-';
  try {
    const fmt = (d: string) => {
      const [y, m, day] = d.split('-');
      return `${day}/${m}/${y.slice(2)}`;
    };
    if (!endDate || startDate === endDate) return fmt(startDate);
    return `${fmt(startDate)} → ${fmt(endDate)}`;
  } catch {
    return startDate;
  }
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Activa',
  blocked: 'Bloqueada',
  pending: 'Pendiente',
};

export default function ActivityCard({ activity, onEdit }: ActivityCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: activity.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  } as React.CSSProperties;

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={'card' + (isDragging ? ' dragging' : '')}
      style={style}
    >
      {onEdit && (
        <button
          onClick={e => { e.stopPropagation(); onEdit(activity); }}
          className="card-edit-btn"
          title="Editar"
        >
          <Pencil style={{ width: 14, height: 14 }} />
        </button>
      )}

      <div className="card-top">
        <div className="card-title">{activity.description}</div>
        <span className={'badge s-' + activity.status}>{STATUS_LABEL[activity.status] ?? activity.status}</span>
      </div>

      <div className="card-tags">
        <span className="tag-disc">{activity.discipline}</span>
        {activity.workFront && <span className="tag-front">{activity.workFront}</span>}
      </div>

      {(activity.startDate || activity.durationDays > 0) && (
        <div className="card-meta">
          {activity.startDate && (
            <span>
              <Calendar />
              {formatDate(activity.startDate, activity.endDate)}
            </span>
          )}
          {activity.durationDays > 0 && (
            <span>
              <Clock />
              {activity.durationDays}d
            </span>
          )}
        </div>
      )}

      {activity.resources && (
        <div className="card-task">
          <Wrench />
          <span className="t">{activity.resources}</span>
        </div>
      )}

      {activity.scheduledDays.length > 0 && (
        <div className="card-days">
          {activity.scheduledDays.slice(0, 5).map((d, i) => (
            <span key={i} className="day-pill">
              {d.startsWith('col_') ? `Día ${d.replace('col_', '')}` : d.split('-').slice(1).join('/')}
            </span>
          ))}
          {activity.scheduledDays.length > 5 && (
            <span className="day-pill">+{activity.scheduledDays.length - 5}</span>
          )}
        </div>
      )}
    </div>
  );
}
