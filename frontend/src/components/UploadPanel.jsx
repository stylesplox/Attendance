import { useState } from 'react';
import { uploadAttendance } from '../api.js';

function getMostRecentSunday() {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day;
  const sunday = new Date(today.setDate(diff));
  return sunday.toISOString().slice(0, 10);
}

export default function UploadPanel({ onUploaded }) {
  const [date, setDate] = useState(getMostRecentSunday());
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setResult(null);
    setError('');
    try {
      const data = await uploadAttendance(file, date);
      setResult(data);
      onUploaded();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow p-6 space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">Upload Attendance</h2>

      <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            required
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Excel File (.xlsx / .xls)
          </label>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={e => setFile(e.target.files[0] || null)}
            required
            className="block text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !file}
          className="bg-blue-700 hover:bg-blue-600 disabled:bg-blue-400 text-white font-medium px-5 py-2 rounded-lg text-sm transition"
        >
          {loading ? 'Uploading...' : 'Upload'}
        </button>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-3">
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-green-800 text-sm">
            {result.inserted} record{result.inserted !== 1 ? 's' : ''} inserted successfully.
          </div>

          {result.unmatched && result.unmatched.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-sm">
              <p className="font-semibold text-yellow-800 mb-2">
                {result.unmatched.length} name{result.unmatched.length !== 1 ? 's' : ''} could not be matched:
              </p>
              <ul className="space-y-0.5">
                {result.unmatched.map((n, i) => (
                  <li key={i} className="text-yellow-700">
                    {n.firstName} {n.lastName}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
