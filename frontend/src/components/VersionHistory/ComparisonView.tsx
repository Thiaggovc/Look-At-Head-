import { CompareResponse, Activity, getDisciplineColor, STATUS_CONFIG } from '../../types';
import { Plus, Minus, Edit2, Minus as MinusIcon, CheckCircle } from 'lucide-react';
import clsx from 'clsx';

interface ComparisonViewProps {
  comparison: CompareResponse;
}

function ActivityRow({
  activity,
  type,
  changes,
}: {
  activity: Activity;
  type: 'added' | 'removed' | 'modified' | 'unchanged';
  changes?: string[];
}) {
  const color = getDisciplineColor(activity.discipline);
  const statusCfg = STATUS_CONFIG[activity.status];

  const rowBg = {
    added: 'bg-green-500/10 border-green-500/30',
    removed: 'bg-red-500/10 border-red-500/30',
    modified: 'bg-yellow-500/10 border-yellow-500/30',
    unchanged: 'bg-gray-800/50 border-gray-700/50',
  }[type];

  const icon = {
    added: <Plus className="w-4 h-4 text-green-400 flex-shrink-0" />,
    removed: <Minus className="w-4 h-4 text-red-400 flex-shrink-0" />,
    modified: <Edit2 className="w-4 h-4 text-yellow-400 flex-shrink-0" />,
    unchanged: <CheckCircle className="w-4 h-4 text-gray-600 flex-shrink-0" />,
  }[type];

  const CHANGE_LABELS: Record<string, string> = {
    resources: 'Recursos',
    status: 'Estado',
    startDate: 'Fecha inicio',
    endDate: 'Fecha fin',
    durationDays: 'Duración',
    scheduledDays: 'Días programados',
    workFront: 'Frente de obra',
    generalTitle: 'Título general',
  };

  return (
    <div className={clsx('flex items-start gap-3 p-3 rounded-lg border', rowBg)}>
      {icon}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-gray-100 truncate">{activity.description}</p>
          <span className={clsx('badge', color.bg, color.text)}>{activity.discipline}</span>
          <span className={clsx('badge', statusCfg.bg, statusCfg.text)}>{statusCfg.label}</span>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">{activity.workFront} · {activity.generalTitle}</p>
        {changes && changes.length > 0 && (
          <div className="flex gap-1 flex-wrap mt-1.5">
            {changes.map(c => (
              <span key={c} className="px-2 py-0.5 bg-yellow-500/20 text-yellow-300 rounded text-xs">
                {CHANGE_LABELS[c] || c}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  count,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  color: string;
}) {
  return (
    <div className={clsx('flex items-center gap-2 mb-3', color)}>
      {icon}
      <h3 className="font-semibold">{title}</h3>
      <span className="bg-current/20 px-2 py-0.5 rounded-full text-sm font-medium opacity-80">
        {count}
      </span>
    </div>
  );
}

export default function ComparisonView({ comparison }: ComparisonViewProps) {
  const { snapshotA, snapshotB, diff } = comparison;

  function formatDate(str: string) {
    try { return new Date(str).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return str; }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
        <h2 className="text-base font-semibold text-gray-100 mb-3">Comparación de versiones</h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Versión anterior', snapshot: snapshotA, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
            { label: 'Versión nueva', snapshot: snapshotB, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30' },
          ].map(({ label, snapshot, color, bg }) => (
            <div key={snapshot.id} className={clsx('p-3 rounded-lg border', bg)}>
              <p className={clsx('text-xs font-semibold mb-1', color)}>{label}</p>
              <p className="text-sm text-gray-200 font-medium truncate">{snapshot.filename}</p>
              <p className="text-xs text-gray-400 mt-1">{snapshot.discipline} · {formatDate(snapshot.uploaded_at)}</p>
              <p className="text-xs text-amber-500">{snapshot.week_label}</p>
            </div>
          ))}
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          {[
            { label: 'Agregadas', value: diff.added.length, color: 'text-green-400', bg: 'bg-green-500/10' },
            { label: 'Eliminadas', value: diff.removed.length, color: 'text-red-400', bg: 'bg-red-500/10' },
            { label: 'Modificadas', value: diff.modified.length, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
            { label: 'Sin cambios', value: diff.unchanged.length, color: 'text-gray-400', bg: 'bg-gray-700/50' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={clsx('text-center p-3 rounded-lg', bg)}>
              <p className={clsx('text-2xl font-bold', color)}>{value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Added */}
      {diff.added.length > 0 && (
        <div>
          <SectionHeader
            icon={<Plus className="w-5 h-5" />}
            title="Actividades agregadas"
            count={diff.added.length}
            color="text-green-400"
          />
          <div className="space-y-2">
            {diff.added.map(a => (
              <ActivityRow key={a.id} activity={a} type="added" />
            ))}
          </div>
        </div>
      )}

      {/* Removed */}
      {diff.removed.length > 0 && (
        <div>
          <SectionHeader
            icon={<MinusIcon className="w-5 h-5" />}
            title="Actividades eliminadas"
            count={diff.removed.length}
            color="text-red-400"
          />
          <div className="space-y-2">
            {diff.removed.map(a => (
              <ActivityRow key={a.id} activity={a} type="removed" />
            ))}
          </div>
        </div>
      )}

      {/* Modified */}
      {diff.modified.length > 0 && (
        <div>
          <SectionHeader
            icon={<Edit2 className="w-5 h-5" />}
            title="Actividades modificadas"
            count={diff.modified.length}
            color="text-yellow-400"
          />
          <div className="space-y-2">
            {diff.modified.map(({ after, changes }, i) => (
              <ActivityRow key={i} activity={after} type="modified" changes={changes} />
            ))}
          </div>
        </div>
      )}

      {/* Unchanged */}
      {diff.unchanged.length > 0 && (
        <details className="group">
          <summary className="flex items-center gap-2 text-gray-500 cursor-pointer hover:text-gray-300 transition-colors text-sm font-medium mb-2 list-none">
            <CheckCircle className="w-4 h-4" />
            Sin cambios ({diff.unchanged.length} actividades)
            <span className="ml-auto text-xs group-open:hidden">Ver</span>
            <span className="ml-auto text-xs hidden group-open:inline">Ocultar</span>
          </summary>
          <div className="space-y-2">
            {diff.unchanged.map(a => (
              <ActivityRow key={a.id} activity={a} type="unchanged" />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
