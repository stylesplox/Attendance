import { useState, useEffect } from 'react';
import { getMembers, getOffenders } from '../api.js';

export default function NonComplianceMatrixView() {
  const [members, setMembers] = useState([]);
  const [offenders, setOffenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getMembers(), getOffenders()])
      .then(([m, o]) => { setMembers(m); setOffenders(o); })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-500">Loading...</p>;
  if (error) return <p className="text-red-600">Error: {error}</p>;

  // Build unique sessions: (Date, Fellowship_ID, Non_Compliance_Id)
  const sessionMap = new Map();
  for (const r of offenders) {
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
    offenders.map(r => `${r.SN}|${r.Date}|${r.Fellowship_ID}|${r.Non_Compliance_Id}`)
  );

  function formatDate(d) {
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y.slice(2)}`;
  }

  if (sessions.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
        No non-compliance records yet. Upload an Excel file to get started.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
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
              <td className="px-3 py-2 text-center text-red-700">{offenders.length}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
