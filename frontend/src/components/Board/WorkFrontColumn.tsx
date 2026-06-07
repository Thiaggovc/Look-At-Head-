import { Activity } from '../../types';
import ActivityCard from './ActivityCard';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Building2, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface WorkFrontColumnProps {
  id: string;
  title: string;
  subtitle?: string;
  activities: Activity[];
  hue?: number;
  colorIndex?: number;
  onEditActivity?: (activity: Activity) => void;
}

export default function WorkFrontColumn({ id, title, subtitle, activities, hue = 70, onEditActivity }: WorkFrontColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  const activeCount  = activities.filter(a => a.status === 'active').length;
  const blockedCount = activities.filter(a => a.status === 'blocked').length;
  const pendingCount = activities.filter(a => a.status === 'pending').length;
  const total = activities.length;

  return (
    <div
      className="column flex-shrink-0"
      style={{ '--ch': hue, height: '100%', minHeight: 0 } as React.CSSProperties}
    >
      <div className="col-head">
        <div className="row1">
          <div className="col-ico"><Building2 /></div>
          <div className="col-title">
            <div className="m" title={title}>{title}</div>
            {subtitle && <div className="s">{subtitle}</div>}
          </div>
          <div className="col-badge">{total}</div>
        </div>
        <div className="col-status">
          {activeCount > 0 && (
            <span style={{ color: 'var(--ok)' }}>
              <CheckCircle />{activeCount} activas
            </span>
          )}
          {blockedCount > 0 && (
            <span style={{ color: 'var(--bad)' }}>
              <AlertCircle />{blockedCount} bloq.
            </span>
          )}
          {pendingCount > 0 && (
            <span style={{ color: 'var(--warn)' }}>
              <Clock />{pendingCount} pend.
            </span>
          )}
        </div>
        {total > 0 && (
          <div className="col-progress">
            <i style={{ width: `${(activeCount / total) * 100}%`, background: 'var(--ok)' }} />
            <i style={{ width: `${(pendingCount / total) * 100}%`, background: 'var(--warn)' }} />
            <i style={{ width: `${(blockedCount / total) * 100}%`, background: 'var(--bad)' }} />
          </div>
        )}
      </div>

      <div ref={setNodeRef} className={'col-body' + (isOver ? ' drop' : '')}>
        <SortableContext items={activities.map(a => a.id)} strategy={verticalListSortingStrategy}>
          {activities.map(activity => (
            <ActivityCard key={activity.id} activity={activity} onEdit={onEditActivity} />
          ))}
        </SortableContext>
        {total === 0 && <div className="col-empty">Sin actividades</div>}
      </div>
    </div>
  );
}
