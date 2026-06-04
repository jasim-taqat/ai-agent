import { useState, useEffect, type FormEvent } from 'react';
import './style.css';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

const STORAGE_KEY = 'todo-app-todos';

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

  useEffect(() => {
    saveTodos(todos);
  }, [todos]);

  const addTodo = (e: FormEvent) => {
    e.preventDefault();
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
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
    );
  };

  const deleteTodo = (id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  };

  const clearCompleted = () => {
    setTodos((prev) => prev.filter((t) => !t.completed));
  };

  const remaining = todos.filter((t) => !t.completed).length;
  const completedCount = todos.length - remaining;

  return (
    <main className="todo-app">
      <h1>Todos</h1>

      <form onSubmit={addTodo} className="todo-form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="What needs to be done?"
          aria-label="New todo"
        />
        <button type="submit" disabled={!input.trim()}>
          Add
        </button>
      </form>

      {todos.length === 0 && (
        <div className="empty-state">
          <p>No todos yet — add one above!</p>
        </div>
      )}

      {todos.length > 0 && (
        <>
          <ul className="todo-list">
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
                  ✕
                </button>
              </li>
            ))}
          </ul>

          <footer className="todo-footer">
            <span>{remaining} item{remaining !== 1 ? 's' : ''} left</span>
            {completedCount > 0 && (
              <button onClick={clearCompleted}>Clear completed ({completedCount})</button>
            )}
          </footer>
        </>
      )}
    </main>
  );
}
