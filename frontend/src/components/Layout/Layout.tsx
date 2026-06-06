import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Project } from '../../types';
import {
  LayoutDashboard,
  Kanban,
  History,
  FolderOpen,
  Plus,
  ChevronDown,
  ChevronRight,
  HardHat,
  Menu,
  X,
} from 'lucide-react';
import clsx from 'clsx';

interface LayoutProps {
  children: ReactNode;
  projects: Project[];
  selectedProject: Project | null;
  onProjectSelect: (p: Project) => void;
  onProjectCreate: (name: string) => Promise<Project>;
  loading: boolean;
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
  loading,
}: LayoutProps) {
  const location = useLocation();
  const [projectsOpen, setProjectsOpen] = useState(true);
  const [newProjectName, setNewProjectName] = useState('');
  const [creating, setCreating] = useState(false);
  const [showNewInput, setShowNewInput] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    <div className="flex flex-col h-full sidebar">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-[rgba(245,166,35,0.2)]">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md"
          style={{ background: 'linear-gradient(135deg,#F5A623,#E07B00)' }}
        >
          <HardHat className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-gray-800 font-bold text-sm leading-tight tracking-tight">Lookahead</h1>
          <p className="text-gray-400 text-xs font-medium">Planning Manager</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
          <Link
            key={path}
            to={path}
            onClick={() => setSidebarOpen(false)}
            className={clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
              location.pathname === path
                ? 'text-[#F5A623] shadow-sm'
                : 'hover:bg-[rgba(245,166,35,0.12)] text-gray-500 hover:text-gray-700'
            )}
            style={location.pathname === path ? {
              background: 'rgba(245,166,35,0.12)',
              border: '1px solid rgba(245,166,35,0.25)',
            } : {}}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="px-4 pt-2 pb-1">
        <button
          onClick={() => setProjectsOpen(p => !p)}
          className="flex items-center justify-between w-full text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 py-1 hover:text-gray-600 transition-colors"
        >
          <div className="flex items-center gap-2">
            <FolderOpen className="w-3 h-3" />
            Proyectos
          </div>
          {projectsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>
      </div>

      {projectsOpen && (
        <div className="px-3 space-y-1 flex-1 overflow-y-auto">
          {loading ? (
            <div className="px-2 py-2 text-xs text-gray-400 animate-pulse">Cargando...</div>
          ) : (
            projects.map(p => (
              <button
                key={p.id}
                onClick={() => { onProjectSelect(p); setSidebarOpen(false); }}
                className={clsx(
                  'w-full text-left px-3 py-2 rounded-xl text-sm transition-all duration-150 truncate',
                  selectedProject?.id === p.id
                    ? 'text-[#F5A623] font-medium'
                    : 'text-gray-500 hover:bg-[rgba(245,166,35,0.1)] hover:text-gray-700'
                )}
                style={selectedProject?.id === p.id ? {
                  background: 'rgba(245,166,35,0.1)',
                  border: '1px solid rgba(245,166,35,0.2)',
                } : {}}
              >
                {p.name}
              </button>
            ))
          )}

          {showNewInput ? (
            <div className="px-1 py-2">
              <input
                autoFocus
                value={newProjectName}
                onChange={e => setNewProjectName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCreate();
                  if (e.key === 'Escape') { setShowNewInput(false); setNewProjectName(''); }
                }}
                placeholder="Nombre del proyecto"
                className="input-field text-sm"
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleCreate}
                  disabled={creating || !newProjectName.trim()}
                  className="flex-1 text-white text-xs py-1.5 rounded-lg disabled:opacity-50 transition-colors font-medium"
                  style={{ background: '#F5A623' }}
                >
                  {creating ? 'Creando...' : 'Crear'}
                </button>
                <button
                  onClick={() => { setShowNewInput(false); setNewProjectName(''); }}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs py-1.5 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowNewInput(true)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-[#F5A623] transition-colors rounded-xl hover:bg-[rgba(245,166,35,0.08)]"
            >
              <Plus className="w-3.5 h-3.5" />
              Nuevo proyecto
            </button>
          )}
        </div>
      )}

      {selectedProject && (
        <div
          className="mx-3 mb-4 mt-auto px-3 py-3 rounded-xl"
          style={{ background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.2)' }}
        >
          <p className="text-xs text-gray-400 mb-0.5">Proyecto activo</p>
          <p className="text-sm text-gray-700 font-semibold truncate">{selectedProject.name}</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#F5F6FA' }}>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar desktop */}
      <aside className="hidden lg:flex w-64 flex-col flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Sidebar mobile */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-30 w-64 flex flex-col lg:hidden transition-transform duration-300',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <SidebarContent />
      </aside>

      {/* Main */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Mobile header */}
        <div
          className="lg:hidden flex items-center gap-3 px-4 py-3 border-b"
          style={{
            background: 'rgba(255,255,255,0.9)',
            backdropFilter: 'blur(12px)',
            borderColor: 'rgba(245,166,35,0.2)',
          }}
        >
          <button onClick={() => setSidebarOpen(true)} className="text-gray-400 hover:text-gray-700">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <HardHat className="w-5 h-5 text-[#F5A623]" />
            <span className="font-semibold text-gray-800 text-sm">Lookahead Planning</span>
          </div>
        </div>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
