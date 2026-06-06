import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, FileSpreadsheet, Loader2, CheckCircle, AlertCircle, CalendarRange } from 'lucide-react';
import clsx from 'clsx';
import { uploadApi } from '../../api/client';
import { Project } from '../../types';
import toast from 'react-hot-toast';

interface UploadZoneProps {
  project: Project;
  onSuccess: () => void;
}

interface FileWithDiscipline {
  file: File;
  discipline: string;
}

interface UploadResult {
  filename: string;
  snapshotId?: string;
  activitiesCount?: number;
  weekLabel?: string;
  error?: string;
}

export default function UploadZone({ project, onSuccess }: UploadZoneProps) {
  const [files, setFiles] = useState<FileWithDiscipline[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const datesValid = !!startDate && !!endDate && startDate <= endDate;

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: FileWithDiscipline[] = acceptedFiles.map(f => ({
      file: f,
      discipline: inferDiscipline(f.name),
    }));
    setFiles(prev => [...prev, ...newFiles]);
    setResults([]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.ms-excel.sheet.macroEnabled.12': ['.xlsm'],
    },
    multiple: true,
  });

  function inferDiscipline(filename: string): string {
    const lower = filename.toLowerCase();
    if (lower.includes('struct') || lower.includes('estruc')) return 'Estructuras';
    if (lower.includes('arch') || lower.includes('arq')) return 'Arquitectura';
    if (lower.includes('elec')) return 'Electricidad';
    if (lower.includes('mec') || lower.includes('hvac')) return 'Mecánica';
    if (lower.includes('inst') || lower.includes('plom')) return 'Instalaciones';
    return 'General';
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const updateDiscipline = (index: number, discipline: string) => {
    setFiles(prev => prev.map((f, i) => i === index ? { ...f, discipline } : f));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    if (!datesValid) {
      toast.error('Indica la fecha de inicio y fin del Look Ahead (inicio ≤ fin)');
      return;
    }
    setUploading(true);
    setProgress(0);
    setResults([]);

    try {
      // Group files by discipline
      const byDiscipline = new Map<string, File[]>();
      for (const { file, discipline } of files) {
        if (!byDiscipline.has(discipline)) byDiscipline.set(discipline, []);
        byDiscipline.get(discipline)!.push(file);
      }

      const allResults: UploadResult[] = [];

      let i = 0;
      for (const [discipline, disciplineFiles] of byDiscipline) {
        const { results: uploadResults } = await uploadApi.uploadFiles(
          project.id,
          disciplineFiles,
          discipline,
          p => setProgress(Math.round((i / byDiscipline.size + p / 100 / byDiscipline.size) * 100)),
          { startDate, endDate }
        );
        allResults.push(...uploadResults);
        i++;
      }

      setResults(allResults);

      const successCount = allResults.filter(r => !r.error).length;
      const errorCount = allResults.filter(r => r.error).length;

      if (successCount > 0) {
        toast.success(`${successCount} archivo(s) procesado(s) correctamente`);
        onSuccess();
      }
      if (errorCount > 0) {
        toast.error(`${errorCount} archivo(s) con error`);
      }

      if (successCount > 0) {
        setFiles([]);
      }
    } catch (err) {
      toast.error(`Error al subir archivos: ${String(err)}`);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="space-y-4">
      {/* Look-ahead date window */}
      <div
        className="rounded-2xl p-4"
        style={{ background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.3)' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <CalendarRange className="w-4 h-4" style={{ color: '#E09400' }} />
          <h3 className="text-sm font-semibold text-gray-700">Periodo del Look Ahead</h3>
          <span className="text-xs text-gray-400">(requerido)</span>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Indica el rango de fechas que cubre esta planificación. El sistema asignará
          las fechas a cada actividad y descartará lo que quede fuera de este periodo.
        </p>
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">Fecha de inicio</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="input-field"
              style={{ width: 170 }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">Fecha de fin</label>
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={e => setEndDate(e.target.value)}
              className="input-field"
              style={{ width: 170 }}
            />
          </div>
          {startDate && endDate && startDate > endDate && (
            <span className="text-xs font-medium" style={{ color: '#D94B4B' }}>
              La fecha de inicio debe ser anterior o igual a la de fin.
            </span>
          )}
        </div>
      </div>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={clsx(
          'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200',
          isDragActive
            ? 'border-amber-400 bg-amber-400/10'
            : 'border-gray-600 hover:border-gray-500 hover:bg-gray-800/50'
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          <div className={clsx(
            'w-12 h-12 rounded-full flex items-center justify-center transition-colors',
            isDragActive ? 'bg-amber-400/20' : 'bg-gray-700'
          )}>
            <Upload className={clsx('w-6 h-6', isDragActive ? 'text-amber-500' : 'text-gray-400')} />
          </div>
          <div>
            <p className="text-gray-200 font-medium">
              {isDragActive ? 'Suelta los archivos aquí' : 'Arrastra archivos Excel o haz clic para seleccionar'}
            </p>
            <p className="text-gray-500 text-sm mt-1">
              Formatos soportados: .xlsx, .xls, .xlsm (múltiples archivos permitidos)
            </p>
          </div>
        </div>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-300">Archivos seleccionados ({files.length})</h3>
          {files.map(({ file, discipline }, index) => (
            <div key={index} className="flex items-center gap-3 bg-gray-800 rounded-lg p-3">
              <FileSpreadsheet className="w-5 h-5 text-green-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-200 truncate">{file.name}</p>
                <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(0)} KB</p>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400">Disciplina:</label>
                <input
                  value={discipline}
                  onChange={e => updateDiscipline(index, e.target.value)}
                  className="bg-white/80 border border-amber-300 rounded px-2 py-1 text-xs text-gray-700 w-36 focus:outline-none focus:border-amber-400"
                  list="discipline-options"
                />
                <datalist id="discipline-options">
                  {['Estructuras', 'Arquitectura', 'Electricidad', 'Mecánica', 'Instalaciones', 'Plomería', 'HVAC', 'General'].map(d => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
              </div>
              <button
                onClick={() => removeFile(index)}
                className="text-gray-500 hover:text-red-400 transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {files.length > 0 && (
        <div className="flex items-center gap-3">
          <button
            onClick={handleUpload}
            disabled={uploading || !datesValid}
            className="btn-primary flex items-center gap-2"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Procesando... {progress > 0 && `${progress}%`}
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Subir {files.length} archivo{files.length > 1 ? 's' : ''}
              </>
            )}
          </button>
          {!uploading && (
            <button
              onClick={() => { setFiles([]); setResults([]); }}
              className="btn-secondary"
            >
              Limpiar
            </button>
          )}
        </div>
      )}

      {/* Progress bar */}
      {uploading && progress > 0 && (
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className="bg-amber-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-300">Resultados</h3>
          {results.map((result, i) => (
            <div
              key={i}
              className={clsx(
                'flex items-start gap-3 rounded-lg p-3',
                result.error ? 'bg-red-500/10 border border-red-500/30' : 'bg-green-500/10 border border-green-500/30'
              )}
            >
              {result.error ? (
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              ) : (
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p className="text-sm font-medium text-gray-200">{result.filename}</p>
                {result.error ? (
                  <p className="text-xs text-red-400 mt-0.5">{result.error}</p>
                ) : (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {result.activitiesCount} actividades · Semana: {result.weekLabel}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
