import { useEffect, useState } from 'react';
import { X, Save, Trash2, Plus, AlertTriangle } from 'lucide-react';
import { Activity } from '../../types';
import { activitiesApi, ActivityInput } from '../../api/client';
import toast from 'react-hot-toast';

const DISCIPLINES = ['Estructuras', 'Arquitectura', 'Electricidad', 'Mecánica', 'Instalaciones', 'Plomería', 'HVAC', 'General'];
const WORK_FRONTS = ['EDIFICIO HN - RITZ', 'OFICINAS FUCTION', 'DEMOLICION FUCTION', 'General'];

interface Props {
  projectId: string;
  activity?: Activity | null; // null = new
  onClose: () => void;
  onSaved: () => void;
}

const empty: ActivityInput = {
  workFront: '',
  generalTitle: '',
  description: '',
  resources: '',
  startDate: '',
  endDate: '',
  discipline: 'General',
  status: 'pending',
};

export default function ActivityFormModal({ projectId, activity, onClose, onSaved }: Props) {
  const isNew = !activity;
  const [form, setForm] = useState<ActivityInput>(empty);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (activity) {
      setForm({
        workFront: activity.workFront,
        generalTitle: activity.generalTitle,
        description: activity.description,
        resources: activity.resources,
        startDate: activity.startDate ?? '',
        endDate: activity.endDate ?? '',
        discipline: activity.discipline,
        status: activity.status,
      });
    } else {
      setForm(empty);
    }
  }, [activity]);

  const set = (k: keyof ActivityInput, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const valid = form.description.trim() !== '' && form.workFront.trim() !== '';

  const handleSave = async () => {
    if (!valid) { toast.error('Frente de obra y descripción son obligatorios'); return; }
    setSaving(true);
    try {
      if (isNew) {
        await activitiesApi.create({ ...form, projectId });
        toast.success('Actividad creada');
      } else {
        await activitiesApi.update(activity!.id, form);
        toast.success('Actividad actualizada');
      }
      onSaved();
      onClose();
    } catch (e) {
      toast.error(`Error: ${String(e)}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      await activitiesApi.remove(activity!.id);
      toast.success('Actividad eliminada');
      onSaved();
      onClose();
    } catch (e) {
      toast.error(`Error: ${String(e)}`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden" style={{ background: '#fff', border: '1px solid rgba(245,166,35,0.25)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ background: 'linear-gradient(135deg,#F5A623,#E07B00)' }}>
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-white" />
            <h2 className="font-bold text-white text-lg">{isNew ? 'Nueva actividad' : 'Editar actividad'}</h2>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 overflow-y-auto" style={{ maxHeight: '70vh' }}>
          {/* Frente de obra */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Frente de obra *</label>
            <input
              value={form.workFront}
              onChange={e => set('workFront', e.target.value)}
              list="wf-options"
              placeholder="Ej. EDIFICIO HN - RITZ"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-300"
            />
            <datalist id="wf-options">
              {WORK_FRONTS.map(w => <option key={w} value={w} />)}
            </datalist>
          </div>

          {/* Descripción */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Descripción *</label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={3}
              placeholder="Descripción de la actividad"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-300 resize-none"
            />
          </div>

          {/* Título general (opcional) */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Título general <span className="text-gray-400 normal-case font-normal">(opcional)</span></label>
            <input
              value={form.generalTitle}
              onChange={e => set('generalTitle', e.target.value)}
              placeholder="Ej. LOSAS (TODA LA ESTRUCTURA)"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-300"
            />
          </div>

          {/* Recursos */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Recursos / Cuadrilla</label>
            <input
              value={form.resources}
              onChange={e => set('resources', e.target.value)}
              placeholder="Ej. 4 obreros, grúa torre"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-300"
            />
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha inicio</label>
              <input
                type="date"
                value={form.startDate}
                onChange={e => set('startDate', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-300"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha fin</label>
              <input
                type="date"
                value={form.endDate}
                min={form.startDate || undefined}
                onChange={e => set('endDate', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-300"
              />
            </div>
          </div>

          {/* Disciplina + Estado */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Disciplina</label>
              <select
                value={form.discipline}
                onChange={e => set('discipline', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-300 bg-white"
              >
                {DISCIPLINES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</label>
              <select
                value={form.status}
                onChange={e => set('status', e.target.value as ActivityInput['status'])}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-300 bg-white"
              >
                <option value="pending">Pendiente</option>
                <option value="active">Activa</option>
                <option value="blocked">Bloqueada</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex items-center justify-between border-t border-gray-100" style={{ background: '#fafafa' }}>
          {/* Delete */}
          {!isNew && (
            confirmDelete ? (
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-xs text-red-600 font-medium">¿Confirmar eliminación?</span>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-xs px-3 py-1.5 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors"
                >
                  {deleting ? 'Eliminando...' : 'Sí, eliminar'}
                </button>
                <button onClick={() => setConfirmDelete(false)} className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors">
                  Cancelar
                </button>
              </div>
            ) : (
              <button onClick={handleDelete} className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 transition-colors">
                <Trash2 className="w-4 h-4" />
                Eliminar
              </button>
            )
          )}
          {isNew && <span />}

          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-gray-600 border border-gray-200 hover:bg-gray-100 transition-colors">
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !valid}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
              style={{ background: valid ? 'linear-gradient(135deg,#F5A623,#E07B00)' : '#ccc', cursor: valid ? 'pointer' : 'not-allowed' }}
            >
              <Save className="w-4 h-4" />
              {saving ? 'Guardando...' : isNew ? 'Crear actividad' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
