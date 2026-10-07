'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { projectApi } from '@/lib/api';
import { Plus, FolderKanban, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function ProjectsPage() {
  const { currentOrg } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (currentOrg) loadProjects();
  }, [currentOrg]);

  const loadProjects = async () => {
    if (!currentOrg) return;
    try {
      const res = await projectApi.list(currentOrg.id);
      setProjects(res.data.data || []);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const createProject = async () => {
    if (!name.trim() || !currentOrg) return;
    setCreating(true);
    try {
      await projectApi.create(currentOrg.id, { name, description });
      setName('');
      setDescription('');
      setShowCreate(false);
      loadProjects();
    } catch (error) {
      console.error('Failed to create project:', error);
    } finally {
      setCreating(false);
    }
  };

  const deleteProject = async (projectId: string) => {
    if (!currentOrg || !confirm('Delete this project?')) return;
    try {
      await projectApi.delete(currentOrg.id, projectId);
      loadProjects();
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage your projects</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          New Project
        </button>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="card w-full max-w-lg animate-fade-in">
            <h2 className="text-lg font-semibold mb-4">Create Project</h2>
            <div className="space-y-4">
              <input
                className="input-field"
                placeholder="Project name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
              <textarea
                className="input-field min-h-[100px] resize-none"
                placeholder="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
              <button onClick={createProject} disabled={creating} className="btn-primary">
                {creating ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Project Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card shimmer h-40" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="card text-center py-16">
          <FolderKanban size={48} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
          <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
          <p style={{ color: 'var(--text-muted)' }} className="mb-4">Create your first project to start organizing tasks.</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary">Create Project</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div key={project.id} className="card-hover group">
              <div className="flex items-start justify-between mb-3">
                <Link href={`/projects/${project.id}`} className="flex-1">
                  <h3 className="text-lg font-semibold group-hover:text-blue-400 transition-colors">{project.name}</h3>
                </Link>
                <button
                  onClick={() => deleteProject(project.id)}
                  className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/10"
                  style={{ color: 'var(--accent-red)' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <p className="text-sm mb-4 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                {project.description || 'No description'}
              </p>
              <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span>{project._count?.tasks || 0} tasks</span>
                <span>{project._count?.members || 0} members</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
