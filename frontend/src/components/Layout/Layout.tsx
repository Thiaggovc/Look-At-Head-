import { ReactNode, useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Project } from '../../types';
import { dataApi } from '../../api/client';
import toast from 'react-hot-toast';
import {
  LayoutDashboard,
  Kanban,
  History,
  FolderOpen,
  Plus,
  Menu,
  X,
  Download,
  Upload,
  Cloud,
  Sun,
  Moon,
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  projects: Project[];
  selectedProject: Project | null;
  onProjectSelect: (p: Project) => void;
  onProjectCreate: (name: string) => Promise<Project>;
  onDataChanged?: () => void;
  loading: boolean;
}

function GanttCalendarLogo({ size = 21 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      {/* Calendar body */}
      <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
      {/* Hanging rings */}
      <line x1="7.5" y1="2.5" x2="7.5" y2="6" />
      <line x1="16.5" y1="2.5" x2="16.5" y2="6" />
      {/* Header divider */}
      <line x1="3" y1="9" x2="21" y2="9" />
      {/* Gantt bars */}
      <line x1="6.5" y1="12.5" x2="13" y2="12.5" strokeWidth={2.4} />
      <line x1="9" y1="15.5" x2="17.5" y2="15.5" strokeWidth={2.4} />
      <line x1="6.5" y1="18.5" x2="11.5" y2="18.5" strokeWidth={2.4} />
    </svg>
  );
}

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/board', label: 'Tablero', icon: Kanban },
  { path: '/history', label: 'Historial', icon: History },
];

export default function Layout({
  children,
  projects,
  selectedProject,
  onProjectSelect,
  onProjectCreate,
  onDataChanged,
  loading,
}: LayoutProps) {
  const location = useLocation();
  const [newProjectName, setNewProjectName] = useState('');
  const [creating, setCreating] = useState(false);
  const [showNewInput, setShowNewInput] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('la-theme') || 'light');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('la-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    document.documentElement.classList.add('theme-anim');
    setTimeout(() => document.documentElement.classList.remove('theme-anim'), 300);
    setTheme(t => t === 'light' ? 'dark' : 'light');
  };

  const handleExport = () => {
    const bundle = dataApi.export();
    const stamp = new Date().toISOString().slice(0, 10);
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lookahead-${stamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Datos exportados. Guárdalo en tu carpeta de OneDrive compartida.');
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!window.confirm('Importar reemplazará TODOS los datos actuales en este dispositivo. ¿Continuar?')) {
      e.target.value = '';
      return;
    }
    try {
      const text = await file.text();
      const bundle = JSON.parse(text);
      const { projects: np, activities: na } = dataApi.import(bundle);
      toast.success(`Importado: ${np} proyecto(s), ${na} actividad(es)`);
      onDataChanged?.();
    } catch (err) {
      toast.error(`No se pudo importar: ${String(err)}`);
    } finally {
      e.target.value = '';
    }
  };

  const handleCreate = async () => {
    if (!newProjectName.trim()) return;
    setCreating(true);
    try {
      await onProjectCreate(newProjectName.trim());
      setNewProjectName('');
      setShowNewInput(false);
    } finally {
      setCreating(false);
    }
  };

  const SidebarContent = () => (
    <>
      {/* Brand */}
      <div className="brand">
        <div className="brand-logo">
          <GanttCalendarLogo size={21} />
        </div>
        <div>
          <h1 style={{ letterSpacing: '0.16em' }}>Look a head</h1>
          <p>Planning Manager</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="nav">
        {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
          <Link
            key={path}
            to={path}
            onClick={() => setSidebarOpen(false)}
            className={'nav-item' + (location.pathname === path ? ' active' : '')}
          >
            <Icon size={17} />
            {label}
          </Link>
        ))}
      </nav>

      {/* Projects label */}
      <div className="nav-label">
        <FolderOpen size={12} />
        Proyectos
      </div>

      {/* Project list */}
      <div className="proj">
        {loading ? (
          <div style={{ padding: '8px 13px', fontSize: 12, color: 'var(--text-3)' }}>Cargando...</div>
        ) : (
          projects.map(p => (
            <button
              key={p.id}
              onClick={() => { onProjectSelect(p); setSidebarOpen(false); }}
              className={'proj-item' + (selectedProject?.id === p.id ? ' active' : '')}
            >
              {p.name}
            </button>
          ))
        )}

        {showNewInput ? (
          <div style={{ padding: '6px 4px' }}>
            <input
              autoFocus
              value={newProjectName}
              onChange={e => setNewProjectName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') { setShowNewInput(false); setNewProjectName(''); }
              }}
              placeholder="Nombre del proyecto"
              style={{
                width: '100%', padding: '7px 10px', fontSize: 13, borderRadius: 9,
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                color: 'var(--text)', outline: 'none',
              }}
            />
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <button
                onClick={handleCreate}
                disabled={creating || !newProjectName.trim()}
                style={{
                  flex: 1, padding: '6px', fontSize: 12, fontWeight: 600, borderRadius: 8,
                  background: 'linear-gradient(150deg,var(--accent),var(--accent-2))', color: '#fff',
                  opacity: (creating || !newProjectName.trim()) ? 0.5 : 1,
                }}
              >
                {creating ? 'Creando...' : 'Crear'}
              </button>
              <button
                onClick={() => { setShowNewInput(false); setNewProjectName(''); }}
                style={{
                  flex: 1, padding: '6px', fontSize: 12, fontWeight: 600, borderRadius: 8,
                  background: 'var(--surface-3)', color: 'var(--text-2)',
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowNewInput(true)}
            className="proj-item"
            style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-3)' }}
          >
            <Plus size={13} />
            Nuevo proyecto
          </button>
        )}
      </div>

      {/* Export / Import */}
      <div className="side-card">
        <div className="h">
          <Cloud size={13} />
          Datos (OneDrive)
        </div>
        <div className="side-actions">
          <button className="side-btn" onClick={handleExport} title="Descargar datos como .json">
            <Download size={13} />
            Exportar
          </button>
          <button className="side-btn" onClick={handleImportClick} title="Cargar .json desde OneDrive">
            <Upload size={13} />
            Importar
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={handleImportFile}
          style={{ display: 'none' }}
        />
      </div>

      {/* Theme toggle */}
      <div style={{ padding: '14px 18px 8px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Sun size={14} style={{ color: 'var(--text-3)' }} />
        <button className="switch" onClick={toggleTheme} aria-label="Toggle theme">
          <div className="knob">
            {theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
          </div>
        </button>
        <Moon size={14} style={{ color: 'var(--text-3)' }} />
      </div>

      {/* Active project */}
      {selectedProject && (
        <div className="active-proj">
          <p className="l">Proyecto activo</p>
          <p className="n" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedProject.name}
          </p>
        </div>
      )}
    </>
  );

  return (
    <div className="app">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)', zIndex: 20 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar desktop */}
      <aside className="sidebar" style={{ display: 'none' } as React.CSSProperties} id="sidebar-desktop">
        <SidebarContent />
      </aside>
      <aside className="sidebar lg-sidebar">
        <SidebarContent />
      </aside>

      {/* Sidebar mobile */}
      <aside
        className="sidebar"
        style={{
          position: 'fixed', inset: '0 auto 0 0', zIndex: 30,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform .3s var(--ease)',
        } as React.CSSProperties}
      >
        <SidebarContent />
      </aside>

      {/* Main */}
      <main className="main">
        {/* Mobile header */}
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
            borderBottom: '1px solid var(--hairline)', background: 'var(--header-bg)',
            backdropFilter: 'var(--glass-blur)',
          }}
          className="mobile-header"
        >
          <button onClick={() => setSidebarOpen(true)} style={{ color: 'var(--text-2)' }}>
            <Menu size={20} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--accent)', display: 'inline-flex' }}><GanttCalendarLogo size={18} /></span>
            <span style={{ fontWeight: 600, fontSize: 14, letterSpacing: '0.12em' }}>Look a head</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} style={{ marginLeft: 'auto', color: 'var(--text-2)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          {children}
        </div>
      </main>
    </div>
  );
}
