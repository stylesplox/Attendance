import { useState, useEffect } from 'react';
import { checkAuth, logout } from './api.js';
import LoginScreen from './components/LoginScreen.jsx';
import MatrixView from './components/MatrixView.jsx';
import WeeklyListView from './components/WeeklyListView.jsx';
import UploadPanel from './components/UploadPanel.jsx';

export default function App() {
  const [authenticated, setAuthenticated] = useState(null);
  const [view, setView] = useState('matrix');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    checkAuth()
      .then(d => setAuthenticated(d.authenticated))
      .catch(() => setAuthenticated(false));
  }, []);

  if (authenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!authenticated) {
    return <LoginScreen onLogin={() => setAuthenticated(true)} />;
  }

  function handleLogout() {
    logout().finally(() => setAuthenticated(false));
  }

  function handleUploaded() {
    setRefreshKey(k => k + 1);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-700 text-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">SOJ Protocol Attendance</h1>
          <button
            onClick={handleLogout}
            className="text-sm bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded transition"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <UploadPanel onUploaded={handleUploaded} />

        <div className="flex gap-2">
          <button
            onClick={() => setView('matrix')}
            className={`px-4 py-2 rounded font-medium text-sm transition ${
              view === 'matrix'
                ? 'bg-blue-700 text-white'
                : 'bg-white text-gray-700 border hover:bg-gray-100'
            }`}
          >
            Full Matrix
          </button>
          <button
            onClick={() => setView('weekly')}
            className={`px-4 py-2 rounded font-medium text-sm transition ${
              view === 'weekly'
                ? 'bg-blue-700 text-white'
                : 'bg-white text-gray-700 border hover:bg-gray-100'
            }`}
          >
            Weekly List
          </button>
        </div>

        {view === 'matrix' ? (
          <MatrixView key={refreshKey} />
        ) : (
          <WeeklyListView key={refreshKey} />
        )}
      </main>
    </div>
  );
}
