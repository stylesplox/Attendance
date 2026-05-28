import { useState, useEffect } from 'react';
import { getMembers, getOffenders } from '../api.js';

export default function NonComplianceSummary() {
  const [members, setMembers] = useState([]);
  const [offenders, setOffenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState('total'); // 'total' | offense UID string

  useEffect(() => {
    Promise.all([getMembers(), getOffenders()])
      .then(([m, o]) => { setMembers(m); setOffenders(o); })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-500">Loading...</p>;
  if (error) return <p className="text-red-600">Error: {error}</p>;

  if (offenders.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
        No non-compliance records yet. Upload an Excel file to get started.
      </div>
    );
  }

  // Collect unique offense types
  const offenseMap = new Map();
  for (const r of offenders) {
    if (!offenseMap.has(r.Non_Compliance_Id)) {
      offenseMap.set(r.Non_Compliance_Id, r.Offense || `Type ${r.Non_Compliance_Id}`);
    }
  }
  const offenseTypes = [...offenseMap.entries()].sort((a, b) => a[0] - b[0]);

  // Build per-member counts
  const rows = members
    .map(m => {
      const memberOffences = offenders.filter(o => o.SN === m.SN);
      const total = memberOffences.length;
      const byCat = new Map();
      for (const [uid] of offenseTypes) byCat.set(uid, 0);
      for (const o of memberOffences) byCat.set(o.Non_Compliance_Id, (byCat.get(o.Non_Compliance_Id) || 0) + 1);
      return { ...m, total, byCat };
    })
    .filter(r => r.total > 0);

  // Sort
  const sorted = [...rows].sort((a, b) => {
    if (sortBy === 'total') return b.total - a.total;
    const uid = Number(sortBy);
    return (b.byCat.get(uid) || 0) - (a.byCat.get(uid) || 0);
  });

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      <div className="overflow-auto max-h-[70vh]">
        <table className="border-collapse text-sm min-w-max w-full">
          <thead>
            <tr>
              <th className="sticky top-0 left-0 z-20 bg-red-700 text-white px-4 py-3 text-left font-semibold min-w-[180px]">
                Member
              </th>
              {offenseTypes.map(([uid, name]) => (
                <th
                  key={uid}
                  onClick={() => setSortBy(String(uid))}
                  className={`sticky top-0 z-10 px-3 py-3 text-center font-semibold whitespace-nowrap min-w-[120px] cursor-pointer transition ${
                    sortBy === String(uid)
                      ? 'bg-red-900 text-white'
                      : 'bg-red-700 text-white hover:bg-red-600'
                  }`}
                >
                  {name}
                  {sortBy === String(uid) && <span className="ml-1">↓</span>}
                </th>
              ))}
              <th
                onClick={() => setSortBy('total')}
                className={`sticky top-0 z-10 px-3 py-3 text-center font-semibold min-w-[70px] cursor-pointer transition ${
                  sortBy === 'total'
                    ? 'bg-red-900 text-white'
                    : 'bg-red-700 text-white hover:bg-red-600'
                }`}
              >
                Total {sortBy === 'total' && <span>↓</span>}
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((m, i) => (
              <tr key={m.SN} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="sticky left-0 z-10 px-4 py-2 font-medium text-gray-800 border-r border-gray-200 bg-inherit">
                  {m.Full_Name}
                </td>
                {offenseTypes.map(([uid]) => {
                  const count = m.byCat.get(uid) || 0;
                  return (
                    <td key={uid} className="px-3 py-2 text-center">
                      {count > 0 && (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-700 font-semibold text-xs">
                          {count}
                        </span>
                      )}
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-center font-bold text-red-700">{m.total}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-red-50 font-semibold">
              <td className="sticky left-0 z-10 px-4 py-2 text-gray-700 border-r border-gray-200 bg-red-50">
                Total
              </td>
              {offenseTypes.map(([uid]) => {
                const count = offenders.filter(o => o.Non_Compliance_Id === uid).length;
                return (
                  <td key={uid} className="px-3 py-2 text-center text-red-700">{count}</td>
                );
              })}
              <td className="px-3 py-2 text-center text-red-700">{offenders.length}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
