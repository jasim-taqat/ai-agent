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
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-lg mx-auto space-y-6">
        {/* Header */}
        <h1 className="text-3xl font-bold text-primary text-center tracking-tight">
          Todos
        </h1>

        {/* Input form */}
        <form onSubmit={addTodo} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="What needs to be done?"
            aria-label="New todo"
            className="flex-1 px-4 py-2.5 text-base border-2 border-transparent rounded-lg bg-white dark:bg-gray-800 text-primary outline-none transition-colors focus:border-blue-500 placeholder:text-secondary"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="px-5 py-2.5 text-base font-semibold text-white bg-black rounded-lg hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity whitespace-nowrap"
          >
            Add
          </button>
        </form>

        {/* Empty state */}
        {todos.length === 0 && (
          <div className="text-center py-8 text-secondary italic">
            No todos yet — add one above!
          </div>
        )}

        {/* Todo list */}
        {todos.length > 0 && (
          <>
            <ul className="space-y-2">
              {todos.map((todo) => (
                <li
                  key={todo.id}
                  className={`flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm transition-opacity ${
                    todo.completed ? 'opacity-50' : ''
                  }`}
                >
                  <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={todo.completed}
                      onChange={() => toggleTodo(todo.id)}
                      aria-label={`Mark "${todo.text}" as ${todo.completed ? 'incomplete' : 'complete'}`}
                      className="w-[1.1rem] h-[1.1rem] accent-blue-500 flex-shrink-0 cursor-pointer"
                    />
                    <span className="truncate">{todo.text}</span>
                  </label>
                  <button
                    className="px-2 py-1 text-sm border-none rounded-md bg-transparent text-gray-300 cursor-pointer flex-shrink-0 transition-colors hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                    onClick={() => deleteTodo(todo.id)}
                    aria-label={`Delete "${todo.text}"`}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>

            {/* Footer */}
            <footer className="flex items-center justify-between text-sm text-secondary pt-1">
              <span>
                {remaining} item{remaining !== 1 ? 's' : ''} left
              </span>
              {completedCount > 0 && (
                <button
                  onClick={clearCompleted}
                  className="bg-transparent border-none text-blue-500 text-sm cursor-pointer underline decoration-transparent hover:text-blue-600 p-0"
                >
                  Clear completed ({completedCount})
                </button>
              )}
            </footer>
          </>
        )}
      </div>
    </main>
  );
}
