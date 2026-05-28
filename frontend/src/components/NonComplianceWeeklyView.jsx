import { useState, useEffect } from 'react';
import { getOffenders } from '../api.js';

function sessionKey(r) {
  return `${r.Date}__${r.Fellowship_ID}`;
}

function formatDate(d) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

function buildSessions(data) {
  const seen = new Map();
  for (const r of data) {
    const k = sessionKey(r);
    if (!seen.has(k)) {
      const fellowship = r.Fellowship_name || `Fellowship ${r.Fellowship_ID}`;
      seen.set(k, { key: k, date: r.Date, label: `${formatDate(r.Date)} — ${fellowship}` });
    }
  }
  return [...seen.values()].sort((a, b) => b.date.localeCompare(a.date));
}

export default function NonComplianceWeeklyView() {
  const [offenders, setOffenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedKey, setSelectedKey] = useState('');

  useEffect(() => {
    getOffenders()
      .then(data => {
        setOffenders(data);
        const sessions = buildSessions(data);
        if (sessions.length > 0) setSelectedKey(sessions[0].key);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-500">Loading...</p>;
  if (error) return <p className="text-red-600">Error: {error}</p>;

  const sessions = buildSessions(offenders);

  if (sessions.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
        No non-compliance records yet. Upload an Excel file to get started.
      </div>
    );
  }

  const sessionOffenders = offenders.filter(r => sessionKey(r) === selectedKey);

  // Group by offense type
  const grouped = new Map();
  for (const r of sessionOffenders) {
    const offense = r.Offense || 'Unknown';
    if (!grouped.has(offense)) grouped.set(offense, []);
    grouped.get(offense).push(r);
  }
  // Sort each group alphabetically
  for (const list of grouped.values()) {
    list.sort((a, b) => a.Fullname.localeCompare(b.Fullname));
  }

  const totalOffenders = sessionOffenders.length;

  return (
    <div className="bg-white rounded-xl shadow p-6 space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <label className="text-sm font-medium text-gray-700">Session:</label>
        <select
          value={selectedKey}
          onChange={e => setSelectedKey(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          {sessions.map(s => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
        {selectedKey && (
          <span className="text-sm text-gray-500">{totalOffenders} offender{totalOffenders !== 1 ? 's' : ''}</span>
        )}
      </div>

      {totalOffenders === 0 ? (
        <p className="text-gray-500 text-sm">No records for this session.</p>
      ) : (
        <div className="space-y-5">
          {[...grouped.entries()].map(([offense, members]) => (
            <div key={offense}>
              <h3 className="text-sm font-semibold text-red-700 uppercase tracking-wide mb-2 flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" />
                {offense}
                <span className="text-gray-400 font-normal normal-case tracking-normal">
                  ({members.length})
                </span>
              </h3>
              <ol className="divide-y divide-gray-100">
                {members.map((r, i) => (
                  <li key={r.Num} className="flex items-center gap-3 py-2">
                    <span className="text-gray-400 text-sm w-6 text-right">{i + 1}.</span>
                    <span className="text-gray-800 font-medium">{r.Fullname}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
