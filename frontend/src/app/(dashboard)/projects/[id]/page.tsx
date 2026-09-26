'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { projectApi, taskApi } from '@/lib/api';
import { Plus, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ProjectDetailPage() {
  const params = useParams();
  const { currentOrg } = useAuth();
  const [project, setProject] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState('MEDIUM');

  const projectId = params.id as string;

  useEffect(() => {
    if (currentOrg && projectId) {
      loadProject();
      loadTasks();
    }
  }, [currentOrg, projectId]);

  const loadProject = async () => {
    if (!currentOrg) return;
    try {
      const res = await projectApi.get(currentOrg.id, projectId);
      setProject(res.data.data);
    } catch (error) {
      console.error('Failed to load project:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async () => {
    if (!currentOrg) return;
    try {
      const res = await taskApi.list(currentOrg.id, { projectId });
      setTasks(res.data.data || []);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };

  const createTask = async () => {
    if (!taskTitle.trim() || !currentOrg) return;
    try {
      await taskApi.create(currentOrg.id, {
        title: taskTitle,
        projectId,
        priority: taskPriority,
      });
      setTaskTitle('');
      setShowCreateTask(false);
      loadTasks();
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    if (!currentOrg) return;
    try {
      await taskApi.update(currentOrg.id, taskId, { status });
      loadTasks();
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const statusColumns = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];
  const statusLabels: Record<string, string> = {
    TODO: '📋 To Do',
    IN_PROGRESS: '🔄 In Progress',
    IN_REVIEW: '👀 In Review',
    DONE: '✅ Done',
  };

  const statusColors: Record<string, string> = {
    TODO: 'var(--accent-blue)',
    IN_PROGRESS: 'var(--accent-orange)',
    IN_REVIEW: 'var(--accent-purple)',
    DONE: 'var(--accent-green)',
  };

  if (loading) {
    return <div className="shimmer h-64 rounded-xl" />;
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/projects" className="p-2 rounded-lg transition-all hover:bg-white/5">
          <ArrowLeft size={20} style={{ color: 'var(--text-secondary)' }} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{project?.name}</h1>
          <p style={{ color: 'var(--text-secondary)' }}>{project?.description || 'No description'}</p>
        </div>
        <button onClick={() => setShowCreateTask(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Add Task
        </button>
      </div>

      {/* Create Task Modal */}
      {showCreateTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="card w-full max-w-md animate-fade-in">
            <h2 className="text-lg font-semibold mb-4">Add Task</h2>
            <div className="space-y-4">
              <input
                className="input-field"
                placeholder="Task title"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                autoFocus
              />
              <select
                className="input-field"
                value={taskPriority}
                onChange={(e) => setTaskPriority(e.target.value)}
              >
                <option value="LOW">Low Priority</option>
                <option value="MEDIUM">Medium Priority</option>
                <option value="HIGH">High Priority</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setShowCreateTask(false)} className="btn-secondary">Cancel</button>
              <button onClick={createTask} className="btn-primary">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statusColumns.map((status) => {
          const columnTasks = tasks.filter((t) => t.status === status);
          return (
            <div key={status}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full" style={{ background: statusColors[status] }} />
                <h3 className="font-semibold text-sm">{statusLabels[status]}</h3>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                  {columnTasks.length}
                </span>
              </div>
              <div className="space-y-3">
                {columnTasks.map((task) => (
                  <div key={task.id} className="card-hover p-4">
                    <div className="font-medium text-sm mb-2">{task.title}</div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`badge-${task.priority === 'URGENT' ? 'red' : task.priority === 'HIGH' ? 'orange' : task.priority === 'LOW' ? 'teal' : 'blue'}`}>
                        {task.priority}
                      </span>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {statusColumns
                        .filter((s) => s !== status)
                        .map((s) => (
                          <button
                            key={s}
                            onClick={() => updateTaskStatus(task.id, s)}
                            className="text-xs px-2 py-1 rounded transition-all hover:opacity-80"
                            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
                          >
                            → {s.replace('_', ' ')}
                          </button>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
