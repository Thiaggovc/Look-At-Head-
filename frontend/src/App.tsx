import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard';
import BoardPage from './pages/BoardPage';
import HistoryPage from './pages/HistoryPage';
import { Project } from './types';
import { projectsApi } from './api/client';

function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    projectsApi.list()
      .then(data => {
        setProjects(data);
        if (data.length > 0 && !selectedProject) {
          setSelectedProject(data[0]);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleProjectCreate = async (name: string) => {
    const project = await projectsApi.create(name);
    setProjects(prev => [project, ...prev]);
    setSelectedProject(project);
    return project;
  };

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project);
  };

  const refreshProjects = async () => {
    const data = await projectsApi.list();
    setProjects(data);
  };

  return (
    <Layout
      projects={projects}
      selectedProject={selectedProject}
      onProjectSelect={handleProjectSelect}
      onProjectCreate={handleProjectCreate}
      loading={loading}
    >
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route
          path="/dashboard"
          element={
            <Dashboard
              selectedProject={selectedProject}
              onProjectCreate={handleProjectCreate}
              onRefresh={refreshProjects}
            />
          }
        />
        <Route
          path="/board"
          element={
            <BoardPage selectedProject={selectedProject} />
          }
        />
        <Route
          path="/history"
          element={
            <HistoryPage selectedProject={selectedProject} />
          }
        />
      </Routes>
    </Layout>
  );
}

export default App;
