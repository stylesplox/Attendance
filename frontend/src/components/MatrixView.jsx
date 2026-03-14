import { useState, useEffect } from 'react';
import { getMembers, getAttendance } from '../api.js';

export default function MatrixView() {
  const [members, setMembers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getMembers(), getAttendance()])
      .then(([m, a]) => {
        setMembers(m);
        setAttendance(a);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-500">Loading...</p>;
  if (error) return <p className="text-red-600">Error: {error}</p>;

  // Build sorted list of unique dates
  const dates = [...new Set(attendance.map(r => r.Date))].sort();

  // Build attendance set for O(1) lookup
  const attended = new Set(attendance.map(r => `${r.SN}|${r.Date}`));

  function formatDate(d) {
    const [y, m, day] = d.split('-');
    return `${m}/${day}/${y.slice(2)}`;
  }

  if (dates.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
        No attendance records yet. Upload an Excel file to get started.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      <div className="overflow-auto max-h-[70vh]">
        <table className="border-collapse text-sm min-w-max">
          <thead>
            <tr>
              <th className="sticky top-0 left-0 z-20 bg-blue-700 text-white px-4 py-3 text-left font-semibold min-w-[180px]">
                Member
              </th>
              {dates.map(d => (
                <th
                  key={d}
                  className="sticky top-0 z-10 bg-blue-700 text-white px-3 py-3 text-center font-semibold whitespace-nowrap min-w-[80px]"
                >
                  {formatDate(d)}
                </th>
              ))}
              <th className="sticky top-0 z-10 bg-blue-700 text-white px-3 py-3 text-center font-semibold min-w-[60px]">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {members.map((m, i) => {
              const count = dates.filter(d => attended.has(`${m.SN}|${d}`)).length;
              return (
                <tr
                  key={m.SN}
                  className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                >
                  <td className="sticky left-0 z-10 px-4 py-2 font-medium text-gray-800 border-r border-gray-200 bg-inherit">
                    {m.Full_Name}
                  </td>
                  {dates.map(d => (
                    <td key={d} className="px-3 py-2 text-center text-green-600 font-bold">
                      {attended.has(`${m.SN}|${d}`) ? '✓' : ''}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-center font-semibold text-blue-700">
                    {count > 0 ? count : ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-blue-50 font-semibold">
              <td className="sticky left-0 z-10 px-4 py-2 text-gray-700 border-r border-gray-200 bg-blue-50">
                Total Present
              </td>
              {dates.map(d => {
                const count = members.filter(m => attended.has(`${m.SN}|${d}`)).length;
                return (
                  <td key={d} className="px-3 py-2 text-center text-blue-700">
                    {count}
                  </td>
                );
              })}
              <td className="px-3 py-2 text-center text-blue-700">
                {attendance.length}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
