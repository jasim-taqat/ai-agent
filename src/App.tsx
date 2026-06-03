import { useState, useRef, useEffect, useMemo, useCallback } from 'react';

// ── Types ────────────────────────────────────────────────

type Priority = 'low' | 'medium' | 'high';
type Status = 'active' | 'completed' | 'archived';

interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: Status;
  dueDate: string; // ISO date string or empty
  tags: string[];
  createdAt: number;
  completedAt?: number;
}

interface ActivityLog {
  id: string;
  action: string;
  timestamp: number;
}

interface Note {
  id: string;
  content: string;
  createdAt: number;
}

type FilterStatus = 'all' | 'active' | 'completed' | 'archived';
type SortBy = 'created' | 'dueDate' | 'priority' | 'title';

// ── Storage helpers ──────────────────────────────────────

const TASKS_KEY = 'productivity-tasks';
const NOTES_KEY = 'productivity-notes';
const ACTIVITY_KEY = 'productivity-activity';

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// ── Helpers ──────────────────────────────────────────────

const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
const TAG_COLORS: Record<string, string> = {
  work: '#0071e3',
  personal: '#34c759',
  urgent: '#ff3b30',
  learning: '#af52de',
  health: '#ff9500',
};

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isOverdue(dueDate: string, status: Status): boolean {
  if (!dueDate || status === 'completed') return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

// ── Main App ─────────────────────────────────────────────

export default function App() {
  // State
  const [tasks, setTasks] = useState<Task[]>(() => loadFromStorage(TASKS_KEY, []));
  const [notes, setNotes] = useState<Note[]>(() => loadFromStorage(NOTES_KEY, []));
  const [activityLog, setActivityLog] = useState<ActivityLog[]>(() =>
    loadFromStorage(ACTIVITY_KEY, [])
  );

  // Form state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>('medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskTags, setNewTaskTags] = useState('');

  // Notes state
  const [newNote, setNewNote] = useState('');

  // Filter/search state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortBy>('created');


  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPriority, setEditPriority] = useState<Priority>('medium');
  const [editDueDate, setEditDueDate] = useState('');
  const [editTags, setEditTags] = useState('');

  // UI state
  const [activeTab, setActiveTab] = useState<'tasks' | 'notes' | 'stats'>('tasks');
  const [showAddForm, setShowAddForm] = useState(false);

  const titleRef = useRef<HTMLInputElement>(null);

  // Persist on change
  useEffect(() => saveToStorage(TASKS_KEY, tasks), [tasks]);
  useEffect(() => saveToStorage(NOTES_KEY, notes), [notes]);
  useEffect(() => saveToStorage(ACTIVITY_KEY, activityLog), [activityLog]);

  // Focus title input when adding
  useEffect(() => {
    if (showAddForm && titleRef.current) {
      titleRef.current.focus();
    }
  }, [showAddForm]);

  // ── Activity logging ──────────────────────────────────

  const logActivity = useCallback((action: string) => {
    setActivityLog((prev) => [
      { id: crypto.randomUUID(), action, timestamp: Date.now() },
      ...prev.slice(0, 49), // Keep last 50
    ]);
  }, []);

  // ── Task CRUD ─────────────────────────────────────────

  const addTask = () => {
    const trimmed = newTaskTitle.trim();
    if (!trimmed) return;

    const tags = newTaskTags
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const task: Task = {
      id: crypto.randomUUID(),
      title: trimmed,
      description: newTaskDesc.trim(),
      priority: newTaskPriority,
      status: 'active',
      dueDate: newTaskDueDate,
      tags,
      createdAt: Date.now(),
    };

    setTasks((prev) => [task, ...prev]);
    logActivity(`Added task: "${task.title}"`);
    resetTaskForm();
    setShowAddForm(false);
  };

  const toggleComplete = (id: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              status: t.status === 'completed' ? 'active' : 'completed',
              completedAt: t.status === 'completed' ? undefined : Date.now(),
            }
          : t
      )
    );
    logActivity(`Toggled task: "${tasks.find((t) => t.id === id)?.title}"`);
  };

  const deleteTask = (id: string) => {
    const task = tasks.find((t) => t.id === id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
    logActivity(`Deleted task: "${task?.title}"`);
  };

  const archiveTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: 'archived' as const } : t))
    );
    logActivity(`Archived task: "${tasks.find((t) => t.id === id)?.title}"`);
  };


  const clearCompleted = () => {
    const count = tasks.filter((t) => t.status === 'completed').length;
    setTasks((prev) => prev.filter((t) => t.status !== 'completed'));
    logActivity(`Cleared ${count} completed task${count !== 1 ? 's' : ''}`);
  };

  const startEditing = (task: Task) => {
    setEditingId(task.id);
    setEditTitle(task.title);
    setEditDesc(task.description);
    setEditPriority(task.priority);
    setEditDueDate(task.dueDate);
    setEditTags(task.tags.join(', '));
  };

  const saveEdit = () => {
    if (!editingId || !editTitle.trim()) return;

    const tags = editTags
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    setTasks((prev) =>
      prev.map((t) =>
        t.id === editingId
          ? {
              ...t,
              title: editTitle.trim(),
              description: editDesc.trim(),
              priority: editPriority,
              dueDate: editDueDate,
              tags,
            }
          : t
      )
    );
    logActivity(`Edited task: "${editTitle.trim()}"`);
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const resetTaskForm = () => {
    setNewTaskTitle('');
    setNewTaskDesc('');
    setNewTaskPriority('medium');
    setNewTaskDueDate('');
    setNewTaskTags('');
  };

  // ── Notes CRUD ────────────────────────────────────────

  const addNote = () => {
    const trimmed = newNote.trim();
    if (!trimmed) return;

    const note: Note = {
      id: crypto.randomUUID(),
      content: trimmed,
      createdAt: Date.now(),
    };

    setNotes((prev) => [note, ...prev]);
    logActivity(`Added note`);
    setNewNote('');
  };

  const deleteNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    logActivity(`Deleted note`);
  };

  // ── Filtering & Sorting ───────────────────────────────

  const filteredAndSortedTasks = useMemo(() => {
    let result = [...tasks];

    // Filter by status
    if (filterStatus !== 'all') {
      result = result.filter((t) => t.status === filterStatus);
    }

    // Filter by priority
    if (filterPriority !== 'all') {
      result = result.filter((t) => t.priority === filterPriority);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.includes(q))
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'dueDate':
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        case 'priority':
          return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
        case 'title':
          return a.title.localeCompare(b.title);
        case 'created':
        default:
          return b.createdAt - a.createdAt;
      }
    });

    return result;
  }, [tasks, filterStatus, filterPriority, searchQuery, sortBy]);

  // ── Stats ─────────────────────────────────────────────

  const stats = useMemo(() => {
    const total = tasks.length;
    const active = tasks.filter((t) => t.status === 'active').length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const archived = tasks.filter((t) => t.status === 'archived').length;
    const overdue = tasks.filter((t) => isOverdue(t.dueDate, t.status)).length;

    const byPriority: Record<Priority, number> = { high: 0, medium: 0, low: 0 };
    tasks.forEach((t) => {
      if (t.status !== 'archived') byPriority[t.priority]++;
    });

    const allTags = new Set(tasks.flatMap((t) => t.tags));
    const tagCounts: Record<string, number> = {};
    allTags.forEach((tag) => {
      tagCounts[tag] = tasks.filter((t) => t.tags.includes(tag)).length;
    });

    const completionRate = total > 0 ? Math.round((completed / (total - archived)) * 100) : 0;

    return { total, active, completed, archived, overdue, byPriority, tagCounts, completionRate };
  }, [tasks]);

  // ── Keyboard handler ──────────────────────────────────

  const handleTaskKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addTask();
    }
  };

  const handleNoteKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addNote();
    }
  };

  // ── Render ────────────────────────────────────────────

  return (
    <div className="app">
      <header className="app-header">
        <h1>Productivity Hub</h1>
        <p className="subtitle">Stay organized, stay focused</p>
      </header>

      {/* Tab navigation */}
      <nav className="tab-nav">
        <button
          className={`tab-btn ${activeTab === 'tasks' ? 'active' : ''}`}
          onClick={() => setActiveTab('tasks')}
        >
          Tasks
        </button>
        <button
          className={`tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
          onClick={() => setActiveTab('notes')}
        >
          Notes
        </button>
        <button
          className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          Stats
        </button>
      </nav>

      <main className="main-content">
        {/* ── TASKS TAB ─────────────────────────────────── */}
        {activeTab === 'tasks' && (
          <>
            {/* Add task button/form */}
            {!showAddForm ? (
              <button className="add-task-btn" onClick={() => setShowAddForm(true)}>
                + Add Task
              </button>
            ) : (
              <div className="add-task-form">
                <input
                  ref={titleRef}
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={handleTaskKeyDown}
                  placeholder="Task title *"
                  aria-label="Task title"
                />
                <textarea
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  placeholder="Description (optional)"
                  aria-label="Task description"
                  rows={2}
                />
                <div className="task-meta-row">
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as Priority)}
                    aria-label="Priority"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                  <input
                    type="date"
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                    aria-label="Due date"
                  />
                  <input
                    type="text"
                    value={newTaskTags}
                    onChange={(e) => setNewTaskTags(e.target.value)}
                    placeholder="Tags (comma-separated)"
                    aria-label="Tags"
                  />
                </div>
                <div className="form-actions">
                  <button className="btn-primary" onClick={addTask}>
                    Add Task
                  </button>
                  <button className="btn-secondary" onClick={() => setShowAddForm(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Filters & Search */}
            <div className="filters-bar">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks..."
                aria-label="Search tasks"
                className="search-input"
              />
              <div className="filter-group">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                  aria-label="Filter by status"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value as Priority | 'all')}
                  aria-label="Filter by priority"
                >
                  <option value="all">All Priority</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortBy)}
                  aria-label="Sort by"
                >
                  <option value="created">Created</option>
                  <option value="dueDate">Due Date</option>
                  <option value="priority">Priority</option>
                  <option value="title">Title</option>
                </select>
              </div>
            </div>

            {/* Task list */}
            {filteredAndSortedTasks.length > 0 ? (
              <ul className="task-list" role="list">
                {filteredAndSortedTasks.map((task) => (
                  <li key={task.id} className={`task-item ${task.status}`}>
                    {editingId === task.id ? (
                      /* Inline editing */
                      <div className="edit-form">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          placeholder="Task title *"
                          aria-label="Edit task title"
                        />
                        <textarea
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          placeholder="Description"
                          aria-label="Edit task description"
                          rows={2}
                        />
                        <div className="task-meta-row">
                          <select
                            value={editPriority}
                            onChange={(e) => setEditPriority(e.target.value as Priority)}
                            aria-label="Edit priority"
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                          </select>
                          <input
                            type="date"
                            value={editDueDate}
                            onChange={(e) => setEditDueDate(e.target.value)}
                            aria-label="Edit due date"
                          />
                          <input
                            type="text"
                            value={editTags}
                            onChange={(e) => setEditTags(e.target.value)}
                            placeholder="Tags"
                            aria-label="Edit tags"
                          />
                        </div>
                        <div className="form-actions">
                          <button className="btn-primary" onClick={saveEdit}>
                            Save
                          </button>
                          <button className="btn-secondary" onClick={cancelEdit}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Display mode */
                      <>
                        <div className="task-main">
                          <label className="task-checkbox-label">
                            <input
                              type="checkbox"
                              checked={task.status === 'completed'}
                              onChange={() => toggleComplete(task.id)}
                              aria-label={`Mark "${task.title}" as ${task.status === 'completed' ? 'incomplete' : 'complete'}`}
                            />
                          </label>
                          <div className="task-content">
                            <div className="task-header">
                              <span
                                className={`task-title ${task.status === 'completed' ? 'line-through' : ''}`}
                              >
                                {task.title}
                              </span>
                              <span
                                className={`priority-badge ${task.priority}`}
                                title={`${task.priority} priority`}
                              >
                                {task.priority}
                              </span>
                            </div>
                            {task.description && (
                              <p className="task-desc">{task.description}</p>
                            )}
                            <div className="task-meta">
                              {task.dueDate && (
                                <span
                                  className={`due-date ${isOverdue(task.dueDate, task.status) ? 'overdue' : ''}`}
                                >
                                  📅 {formatDate(task.dueDate)}
                                </span>
                              )}
                              {task.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="tag"
                                  style={{
                                    backgroundColor: `${TAG_COLORS[tag] || '#8e8e93'}20`,
                                    color: TAG_COLORS[tag] || '#8e8e93',
                                  }}
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="task-actions">
                          <button
                            className="icon-btn"
                            onClick={() => startEditing(task)}
                            aria-label={`Edit "${task.title}"`}
                            title="Edit"
                          >
                            ✏️
                          </button>
                          {task.status === 'active' && (
                            <button
                              className="icon-btn"
                              onClick={() => archiveTask(task.id)}
                              aria-label={`Archive "${task.title}"`}
                              title="Archive"
                            >
                              📦
                            </button>
                          )}
                          <button
                            className="icon-btn delete"
                            onClick={() => deleteTask(task.id)}
                            aria-label={`Delete "${task.title}"`}
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state">
                <p className="empty-icon">📋</p>
                <p>No tasks found.</p>
                <p className="empty-hint">
                  {searchQuery
                    ? 'Try adjusting your search or filters.'
                    : 'Click "Add Task" to get started.'}
                </p>
              </div>
            )}

            {/* Footer actions */}
            {tasks.some((t) => t.status === 'completed') && (
              <footer className="task-footer">
                <button className="clear-btn" onClick={clearCompleted}>
                  Clear Completed ({tasks.filter((t) => t.status === 'completed').length})
                </button>
              </footer>
            )}
          </>
        )}

        {/* ── NOTES TAB ─────────────────────────────────── */}
        {activeTab === 'notes' && (
          <>
            <div className="notes-form">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyDown={handleNoteKeyDown}
                placeholder="Write a note... (press Enter to save)"
                aria-label="New note"
                rows={3}
              />
              <button className="btn-primary" onClick={addNote}>
                Add Note
              </button>
            </div>

            {notes.length > 0 ? (
              <ul className="notes-list" role="list">
                {notes.map((note) => (
                  <li key={note.id} className="note-item">
                    <p className="note-content">{note.content}</p>
                    <div className="note-meta">
                      <span className="note-time">
                        {new Date(note.createdAt).toLocaleString()}
                      </span>
                      <button
                        className="icon-btn delete"
                        onClick={() => deleteNote(note.id)}
                        aria-label="Delete note"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state">
                <p className="empty-icon">📝</p>
                <p>No notes yet.</p>
                <p className="empty-hint">Jot down your thoughts above.</p>
              </div>
            )}
          </>
        )}

        {/* ── STATS TAB ─────────────────────────────────── */}
        {activeTab === 'stats' && (
          <>
            {/* Overview cards */}
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-value">{stats.total}</span>
                <span className="stat-label">Total Tasks</span>
              </div>
              <div className="stat-card">
                <span className="stat-value" style={{ color: 'var(--accent)' }}>
                  {stats.active}
                </span>
                <span className="stat-label">Active</span>
              </div>
              <div className="stat-card">
                <span className="stat-value" style={{ color: 'var(--success)' }}>
                  {stats.completed}
                </span>
                <span className="stat-label">Completed</span>
              </div>
              <div className="stat-card">
                <span className="stat-value" style={{ color: 'var(--warning)' }}>
                  {stats.overdue}
                </span>
                <span className="stat-label">Overdue</span>
              </div>
            </div>

            {/* Completion rate */}
            <div className="stat-card wide">
              <div className="stat-header">
                <span className="stat-label">Completion Rate</span>
                <span className="stat-value">{stats.completionRate}%</span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${stats.completionRate}%` }}
                />
              </div>
            </div>

            {/* Priority breakdown */}
            <div className="stat-section">
              <h3>By Priority</h3>
              <div className="priority-breakdown">
                {(Object.keys(PRIORITY_ORDER) as Priority[]).map((p) => (
                  <div key={p} className="priority-item">
                    <span className={`priority-badge ${p}`}>{p}</span>
                    <div className="priority-bar">
                      <div
                        className="priority-fill"
                        style={{
                          width: `${
                            stats.total > 0
                              ? (stats.byPriority[p] / stats.total) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <span className="priority-count">{stats.byPriority[p]}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tags */}
            {Object.keys(stats.tagCounts).length > 0 && (
              <div className="stat-section">
                <h3>Tags</h3>
                <div className="tags-cloud">
                  {Object.entries(stats.tagCounts)
                    .sort((a, b) => b[1] - a[1])
                    .map(([tag, count]) => (
                      <span
                        key={tag}
                        className="tag"
                        style={{
                          backgroundColor: `${TAG_COLORS[tag] || '#8e8e93'}20`,
                          color: TAG_COLORS[tag] || '#8e8e93',
                          fontSize: `${Math.max(0.75, Math.min(1.25, 0.75 + count * 0.1))}rem`,
                        }}
                      >
                        {tag} ({count})
                      </span>
                    ))}
                </div>
              </div>
            )}

            {/* Recent Activity */}
            <div className="stat-section">
              <h3>Recent Activity</h3>
              {activityLog.length > 0 ? (
                <ul className="activity-list">
                  {activityLog.slice(0, 10).map((entry) => (
                    <li key={entry.id} className="activity-item">
                      <span className="activity-action">{entry.action}</span>
                      <span className="activity-time">
                        {new Date(entry.timestamp).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="empty-state">
                  <p className="empty-icon">📊</p>
                  <p>No activity yet.</p>
                  <p className="empty-hint">Start adding tasks to see your activity here.</p>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
