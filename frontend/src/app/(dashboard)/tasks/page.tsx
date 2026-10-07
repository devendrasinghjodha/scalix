'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { taskApi, projectApi } from '@/lib/api';
import { Plus, Search } from 'lucide-react';

export default function TasksPage() {
  const { currentOrg } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filters, setFilters] = useState({ status: '', priority: '', projectId: '', search: '' });
  const [newTask, setNewTask] = useState({ title: '', projectId: '', priority: 'MEDIUM', description: '' });

  useEffect(() => {
    if (currentOrg) {
      loadTasks();
      loadProjects();
    }
  }, [currentOrg, filters]);

  const loadTasks = async () => {
    if (!currentOrg) return;
    try {
      const params: Record<string, string> = {};
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.projectId) params.projectId = filters.projectId;
      if (filters.search) params.search = filters.search;

      const res = await taskApi.list(currentOrg.id, params);
      setTasks(res.data.data || []);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    if (!currentOrg) return;
    try {
      const res = await projectApi.list(currentOrg.id);
      setProjects(res.data.data || []);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const createTask = async () => {
    if (!newTask.title.trim() || !newTask.projectId || !currentOrg) return;
    try {
      await taskApi.create(currentOrg.id, newTask);
      setNewTask({ title: '', projectId: '', priority: 'MEDIUM', description: '' });
      setShowCreate(false);
      loadTasks();
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const updateStatus = async (taskId: string, status: string) => {
    if (!currentOrg) return;
    try {
      await taskApi.update(currentOrg.id, taskId, { status });
      loadTasks();
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!currentOrg || !confirm('Delete this task?')) return;
    try {
      await taskApi.delete(currentOrg.id, taskId);
      loadTasks();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const statusColors: Record<string, string> = {
    TODO: 'badge-blue', IN_PROGRESS: 'badge-orange', IN_REVIEW: 'badge-purple', DONE: 'badge-green', CANCELLED: 'badge-red',
  };

  const priorityColors: Record<string, string> = {
    LOW: 'badge-teal', MEDIUM: 'badge-blue', HIGH: 'badge-orange', URGENT: 'badge-red',
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p style={{ color: 'var(--text-secondary)' }}>All tasks across projects</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> New Task
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input
              className="input-field pl-10"
              placeholder="Search tasks..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </div>
          <select className="input-field w-auto" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All Status</option>
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="DONE">Done</option>
          </select>
          <select className="input-field w-auto" value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })}>
            <option value="">All Priority</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
          <select className="input-field w-auto" value={filters.projectId} onChange={(e) => setFilters({ ...filters, projectId: e.target.value })}>
            <option value="">All Projects</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
      </div>

      {/* Create Task Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="card w-full max-w-lg animate-fade-in">
            <h2 className="text-lg font-semibold mb-4">Create Task</h2>
            <div className="space-y-4">
              <input className="input-field" placeholder="Task title" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} autoFocus />
              <textarea className="input-field min-h-[80px] resize-none" placeholder="Description (optional)" value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} />
              <select className="input-field" value={newTask.projectId} onChange={(e) => setNewTask({ ...newTask, projectId: e.target.value })}>
                <option value="">Select Project</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select className="input-field" value={newTask.priority} onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
              <button onClick={createTask} className="btn-primary">Create Task</button>
            </div>
          </div>
        </div>
      )}

      {/* Task List */}
      {loading ? (
        <div className="space-y-3">{[1, 2, 3, 4].map((i) => <div key={i} className="shimmer h-16 rounded-xl" />)}</div>
      ) : tasks.length === 0 ? (
        <div className="card text-center py-16">
          <p style={{ color: 'var(--text-muted)' }}>No tasks found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div key={task.id} className="card flex items-center gap-4 p-4 group">
              <div className="flex-1 min-w-0">
                <div className="font-medium">{task.title}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  {task.project?.name} • {task.assignee?.name || 'Unassigned'}
                </div>
              </div>
              <span className={statusColors[task.status]}>{task.status.replace(/_/g, ' ')}</span>
              <span className={priorityColors[task.priority]}>{task.priority}</span>
              <select
                className="input-field w-auto text-xs py-1.5 px-2"
                value={task.status}
                onChange={(e) => updateStatus(task.id, e.target.value)}
              >
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="DONE">Done</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <button onClick={() => deleteTask(task.id)} className="text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--accent-red)' }}>
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
