import { useState, useEffect } from 'react';
import { getAttendance } from '../api.js';

export default function WeeklyListView() {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedKey, setSelectedKey] = useState('');

  useEffect(() => {
    getAttendance()
      .then(data => {
        setAttendance(data);
        if (data.length > 0) {
          // Build sorted unique (Date, Fellowship_id) keys
          const keys = buildSessionKeys(data);
          setSelectedKey(keys[0]?.key ?? '');
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-500">Loading...</p>;
  if (error) return <p className="text-red-600">Error: {error}</p>;

  const sessions = buildSessionKeys(attendance);

  const weekAttendees = attendance
    .filter(r => sessionKey(r) === selectedKey)
    .sort((a, b) => a.Fullname.localeCompare(b.Fullname));

  if (sessions.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
        No attendance records yet. Upload an Excel file to get started.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow p-6 space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <label className="text-sm font-medium text-gray-700">Session:</label>
        <select
          value={selectedKey}
          onChange={e => setSelectedKey(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {sessions.map(s => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
        {selectedKey && (
          <span className="text-sm text-gray-500">
            {weekAttendees.length} attended
          </span>
        )}
      </div>

      {weekAttendees.length === 0 ? (
        <p className="text-gray-500 text-sm">No records for this session.</p>
      ) : (
        <ol className="divide-y divide-gray-100">
          {weekAttendees.map((r, i) => (
            <li key={`${r.SN}-${i}`} className="flex items-center gap-3 py-2">
              <span className="text-gray-400 text-sm w-6 text-right">{i + 1}.</span>
              <span className="text-gray-800 font-medium">{r.Fullname}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function sessionKey(r) {
  return `${r.Date}__${r.Fellowship_id ?? ''}`;
}

function formatDate(d) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

function buildSessionKeys(data) {
  const seen = new Map();
  for (const r of data) {
    const k = sessionKey(r);
    if (!seen.has(k)) {
      const fellowship = r.Fellowship_name || (r.Fellowship_id ? `Fellowship ${r.Fellowship_id}` : 'Unknown Fellowship');
      seen.set(k, { key: k, date: r.Date, label: `${formatDate(r.Date)} — ${fellowship}` });
    }
  }
  return [...seen.values()].sort((a, b) => b.date.localeCompare(a.date));
}
