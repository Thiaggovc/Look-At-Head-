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

  const Sidebar = () => (
    <div className="flex flex-col h-full bg-sidebar text-gray-300">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <HardHat className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-white font-bold text-sm leading-tight">Lookahead</h1>
          <p className="text-gray-500 text-xs">Planning Manager</p>
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
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150',
              location.pathname === path
                ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                : 'hover:bg-sidebar-light text-gray-400 hover:text-gray-200'
            )}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="px-3 py-3 border-t border-sidebar-border">
        <button
          onClick={() => setProjectsOpen(p => !p)}
          className="flex items-center justify-between w-full text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 py-1 hover:text-gray-300 transition-colors"
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
            <div className="px-2 py-2 text-xs text-gray-500 animate-pulse">Cargando...</div>
          ) : (
            projects.map(p => (
              <button
                key={p.id}
                onClick={() => { onProjectSelect(p); setSidebarOpen(false); }}
                className={clsx(
                  'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors duration-150 truncate',
                  selectedProject?.id === p.id
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/20'
                    : 'text-gray-400 hover:bg-sidebar-light hover:text-gray-200'
                )}
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
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-2 py-1.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleCreate}
                  disabled={creating || !newProjectName.trim()}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs py-1.5 rounded-lg disabled:opacity-50 transition-colors"
                >
                  {creating ? 'Creando...' : 'Crear'}
                </button>
                <button
                  onClick={() => { setShowNewInput(false); setNewProjectName(''); }}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs py-1.5 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowNewInput(true)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-indigo-400 transition-colors rounded-lg hover:bg-sidebar-light"
            >
              <Plus className="w-3.5 h-3.5" />
              Nuevo proyecto
            </button>
          )}
        </div>
      )}

      {selectedProject && (
        <div className="px-4 py-3 border-t border-sidebar-border mt-auto">
          <p className="text-xs text-gray-500">Proyecto activo</p>
          <p className="text-sm text-gray-200 font-medium truncate">{selectedProject.name}</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar desktop */}
      <aside className="hidden lg:flex w-64 flex-col flex-shrink-0 border-r border-gray-800">
        <Sidebar />
      </aside>

      {/* Sidebar mobile */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-30 w-64 flex flex-col lg:hidden transition-transform duration-300',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <Sidebar />
      </aside>

      {/* Main */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-gray-800 bg-gray-900">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-400 hover:text-white">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <HardHat className="w-5 h-5 text-indigo-400" />
            <span className="font-semibold text-white text-sm">Lookahead Planning</span>
          </div>
        </div>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
