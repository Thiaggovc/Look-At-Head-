import { Activity } from '../../types';
import ActivityCard from './ActivityCard';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import clsx from 'clsx';
import { Building2, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface WorkFrontColumnProps {
  id: string;
  title: string;
  activities: Activity[];
  accentColor?: string;
}

export default function WorkFrontColumn({ id, title, activities, accentColor }: WorkFrontColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  const activeCount = activities.filter(a => a.status === 'active').length;
  const blockedCount = activities.filter(a => a.status === 'blocked').length;
  const pendingCount = activities.filter(a => a.status === 'pending').length;

  return (
    <div className="flex flex-col min-w-[280px] max-w-[320px] w-[300px] flex-shrink-0">
      {/* Column header */}
      <div className="sticky top-0 z-10 bg-gray-900 border-b border-gray-800 px-3 py-3 rounded-t-xl">
        <div className="flex items-center gap-2 mb-2">
          <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <h3 className="font-semibold text-gray-100 text-sm flex-1 min-w-0 truncate" title={title}>
            {title}
          </h3>
          <span className="bg-gray-700 text-gray-300 text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0">
            {activities.length}
          </span>
        </div>
        {/* Status mini-bar */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {activeCount > 0 && (
            <span className="flex items-center gap-0.5 text-green-400">
              <CheckCircle className="w-3 h-3" />{activeCount}
            </span>
          )}
          {blockedCount > 0 && (
            <span className="flex items-center gap-0.5 text-red-400">
              <AlertCircle className="w-3 h-3" />{blockedCount}
            </span>
          )}
          {pendingCount > 0 && (
            <span className="flex items-center gap-0.5 text-yellow-400">
              <Clock className="w-3 h-3" />{pendingCount}
            </span>
          )}
        </div>
        {/* Progress bar */}
        {activities.length > 0 && (
          <div className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden flex">
            <div
              className="bg-green-500 h-full transition-all"
              style={{ width: `${(activeCount / activities.length) * 100}%` }}
            />
            <div
              className="bg-yellow-500 h-full transition-all"
              style={{ width: `${(pendingCount / activities.length) * 100}%` }}
            />
            <div
              className="bg-red-500 h-full transition-all"
              style={{ width: `${(blockedCount / activities.length) * 100}%` }}
            />
          </div>
        )}
        {accentColor && (
          <div
            className="absolute top-0 left-0 right-0 h-1 rounded-t-xl"
            style={{ background: accentColor }}
          />
        )}
      </div>

      {/* Cards area */}
      <div
        ref={setNodeRef}
        className={clsx(
          'flex-1 p-2 space-y-2 overflow-y-auto min-h-[100px] rounded-b-xl transition-colors duration-150',
          isOver ? 'bg-indigo-500/10 ring-1 ring-inset ring-indigo-500/40' : 'bg-gray-900/50'
        )}
      >
        <SortableContext items={activities.map(a => a.id)} strategy={verticalListSortingStrategy}>
          {activities.map(activity => (
            <ActivityCard key={activity.id} activity={activity} />
          ))}
        </SortableContext>
        {activities.length === 0 && (
          <div className="flex items-center justify-center h-20 text-gray-600 text-sm">
            Sin actividades
          </div>
        )}
      </div>
    </div>
  );
}
