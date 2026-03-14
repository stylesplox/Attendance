import { useState, useEffect } from 'react';
import { getAttendance } from '../api.js';

export default function WeeklyListView() {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  useEffect(() => {
    getAttendance()
      .then(data => {
        setAttendance(data);
        if (data.length > 0) {
          const dates = [...new Set(data.map(r => r.Date))].sort().reverse();
          setSelectedDate(dates[0]);
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-500">Loading...</p>;
  if (error) return <p className="text-red-600">Error: {error}</p>;

  const dates = [...new Set(attendance.map(r => r.Date))].sort().reverse();
  const weekAttendees = attendance
    .filter(r => r.Date === selectedDate)
    .sort((a, b) => a.Fullname.localeCompare(b.Fullname));

  function formatDate(d) {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    return `${m}/${day}/${y}`;
  }

  if (dates.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
        No attendance records yet. Upload an Excel file to get started.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow p-6 space-y-4">
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700">Week:</label>
        <select
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {dates.map(d => (
            <option key={d} value={d}>
              {formatDate(d)}
            </option>
          ))}
        </select>
        {selectedDate && (
          <span className="text-sm text-gray-500">
            {weekAttendees.length} attended
          </span>
        )}
      </div>

      {weekAttendees.length === 0 ? (
        <p className="text-gray-500 text-sm">No records for this date.</p>
      ) : (
        <ol className="divide-y divide-gray-100">
          {weekAttendees.map((r, i) => (
            <li key={r.SN} className="flex items-center gap-3 py-2">
              <span className="text-gray-400 text-sm w-6 text-right">{i + 1}.</span>
              <span className="text-gray-800 font-medium">{r.Fullname}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
