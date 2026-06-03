import { useState, useRef, useEffect } from 'react';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

const STORAGE_KEY = 'taqat-todos';

function loadTodos(): Todo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTodos(todos: Todo[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

export default function App() {
  const [todos, setTodos] = useState<Todo[]>(loadTodos);
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    saveTodos(todos);
  }, [todos]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const addTodo = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setTodos((prev) => [
      ...prev,
      { id: crypto.randomUUID(), text: trimmed, completed: false },
    ]);
    setInput('');
  };

  const toggleTodo = (id: string) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const deleteTodo = (id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  };

  const clearCompleted = () => {
    setTodos((prev) => prev.filter((t) => !t.completed));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') addTodo();
  };

  // Derived counts
  const remaining = todos.filter((t) => !t.completed).length;
  const completedCount = todos.length - remaining;

  return (
    <div className="app">
      <main className="todo-app">
        <h1>Todos</h1>

        {/* Input */}
        <form
          className="todo-form"
          onSubmit={(e) => {
            e.preventDefault();
            addTodo();
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What needs to be done?"
            aria-label="Add a new todo"
          />
          <button type="submit" disabled={!input.trim()} aria-label="Add todo">
            Add
          </button>
        </form>

        {/* Todo list */}
        {todos.length > 0 && (
          <ul className="todo-list" role="list">
            {todos.map((todo) => (
              <li key={todo.id} className={`todo-item ${todo.completed ? 'completed' : ''}`}>
                <label className="todo-label">
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={() => toggleTodo(todo.id)}
                    aria-label={`Mark "${todo.text}" as ${todo.completed ? 'incomplete' : 'complete'}`}
                  />
                  <span className="todo-text">{todo.text}</span>
                </label>
                <button
                  className="delete-btn"
                  onClick={() => deleteTodo(todo.id)}
                  aria-label={`Delete "${todo.text}"`}
                >
                  &times;
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Empty state */}
        {todos.length === 0 && (
          <div className="empty-state">
            <p className="empty-icon">&#9743;</p>
            <p>No todos yet.</p>
            <p className="empty-hint">Type something above and press Enter to get started.</p>
          </div>
        )}

        {/* Footer with counts & clear button */}
        {todos.length > 0 && (
          <footer className="todo-footer">
            <span className="count">
              {remaining} {remaining === 1 ? 'item' : 'items'} left
            </span>
            {completedCount > 0 && (
              <button className="clear-btn" onClick={clearCompleted}>
                Clear completed ({completedCount})
              </button>
            )}
          </footer>
        )}
      </main>
    </div>
  );
}
