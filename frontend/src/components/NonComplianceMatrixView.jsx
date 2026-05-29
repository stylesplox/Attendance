import { useState, useEffect } from 'react';
import { getMembers, getOffenders } from '../api.js';

export default function NonComplianceMatrixView() {
  const [members, setMembers] = useState([]);
  const [offenders, setOffenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    Promise.all([getMembers(), getOffenders()])
      .then(([m, o]) => { setMembers(m); setOffenders(o); })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-500">Loading...</p>;
  if (error) return <p className="text-red-600">Error: {error}</p>;

  // Derive available years from all offender records
  const years = [...new Set(offenders.map(r => r.Date.slice(0, 4)))].sort().reverse();

  // Filter offenders to the selected year
  const yearOffenders = offenders.filter(r => r.Date.startsWith(String(selectedYear)));

  // Build unique sessions: (Date, Fellowship_ID, Non_Compliance_Id)
  const sessionMap = new Map();
  for (const r of yearOffenders) {
    const key = `${r.Date}__${r.Fellowship_ID}__${r.Non_Compliance_Id}`;
    if (!sessionMap.has(key)) {
      sessionMap.set(key, {
        key,
        date: r.Date,
        fellowship: r.Fellowship_name || '',
        offense: r.Offense || '',
        fellowshipId: r.Fellowship_ID,
        nonComplianceId: r.Non_Compliance_Id,
      });
    }
  }
  const sessions = [...sessionMap.values()].sort((a, b) => a.date.localeCompare(b.date));

  // Lookup set: "SN|Date|Fellowship_ID|Non_Compliance_Id"
  const offenderSet = new Set(
    yearOffenders.map(r => `${r.SN}|${r.Date}|${r.Fellowship_ID}|${r.Non_Compliance_Id}`)
  );

  function formatDate(d) {
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y.slice(2)}`;
  }

  const yearSelector = years.length > 0 && (
    <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200">
      <label className="text-sm font-medium text-gray-600">Year:</label>
      <select
        value={selectedYear}
        onChange={e => setSelectedYear(Number(e.target.value))}
        className="border border-gray-300 rounded px-2 py-1 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-500"
      >
        {years.map(y => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  );

  if (sessions.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {yearSelector}
        <div className="p-8 text-center text-gray-500">
          No non-compliance records for {selectedYear}. Upload an Excel file to get started.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      {yearSelector}
      <div className="overflow-auto max-h-[70vh]">
        <table className="border-collapse text-sm min-w-max">
          <thead>
            <tr>
              <th className="sticky top-0 left-0 z-20 bg-red-700 text-white px-4 py-3 text-left font-semibold min-w-[180px]">
                Member
              </th>
              {sessions.map(s => (
                <th
                  key={s.key}
                  className="sticky top-0 z-10 bg-red-700 text-white px-3 py-3 text-center font-semibold whitespace-nowrap min-w-[100px]"
                >
                  <div>{formatDate(s.date)}</div>
                  <div className="text-xs font-normal text-red-200 mt-0.5">{s.fellowship}</div>
                  <div className="text-xs font-normal text-red-300">{s.offense}</div>
                </th>
              ))}
              <th className="sticky top-0 z-10 bg-red-700 text-white px-3 py-3 text-center font-semibold min-w-[60px]">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {members.map((m, i) => {
              const count = sessions.filter(s =>
                offenderSet.has(`${m.SN}|${s.date}|${s.fellowshipId}|${s.nonComplianceId}`)
              ).length;
              return (
                <tr key={m.SN} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="sticky left-0 z-10 px-4 py-2 font-medium text-gray-800 border-r border-gray-200 bg-inherit">
                    {m.Full_Name}
                  </td>
                  {sessions.map(s => {
                    const flagged = offenderSet.has(`${m.SN}|${s.date}|${s.fellowshipId}|${s.nonComplianceId}`);
                    return (
                      <td key={s.key} className="px-3 py-2 text-center">
                        {flagged && (
                          <span className="inline-block w-5 h-5 rounded-full bg-red-500" title="Non-compliant" />
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-center font-semibold text-red-700">
                    {count > 0 ? count : ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-red-50 font-semibold">
              <td className="sticky left-0 z-10 px-4 py-2 text-gray-700 border-r border-gray-200 bg-red-50">
                Total Offenders
              </td>
              {sessions.map(s => {
                const count = members.filter(m =>
                  offenderSet.has(`${m.SN}|${s.date}|${s.fellowshipId}|${s.nonComplianceId}`)
                ).length;
                return (
                  <td key={s.key} className="px-3 py-2 text-center text-red-700">
                    {count}
                  </td>
                );
              })}
              <td className="px-3 py-2 text-center text-red-700">{yearOffenders.length}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
