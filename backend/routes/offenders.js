import { Router } from 'express';
import mysql from 'mysql2/promise';
import multer from 'multer';
import * as XLSX from 'xlsx';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

function requireAuth(req, res, next) {
  if (req.session && req.session.authenticated) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

function formatDate(d) {
  if (!(d instanceof Date)) return d;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

router.get('/types', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM Non_Compliance ORDER BY UID');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT o.Num, o.SN, o.Fullname, o.Date, o.Fellowship_ID, o.Non_Compliance_Id,
              f.Fellowship AS Fellowship_name,
              nc.Offense
       FROM Offenders o
       LEFT JOIN Fellowships f ON f.Fellowship_ID = o.Fellowship_ID
       LEFT JOIN Non_Compliance nc ON nc.UID = o.Non_Compliance_Id
       ORDER BY o.Date DESC`
    );
    const formatted = rows.map(r => ({ ...r, Date: formatDate(r.Date) }));
    res.json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    const { date, fellowship_id, non_compliance_id } = req.body;
    if (!date) return res.status(400).json({ error: 'Date is required' });
    if (!fellowship_id) return res.status(400).json({ error: 'Fellowship is required' });
    if (!non_compliance_id) return res.status(400).json({ error: 'Non-compliance type is required' });
    if (!req.file) return res.status(400).json({ error: 'File is required' });

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (rows.length === 0) return res.status(400).json({ error: 'Excel file is empty' });

    const headers = Object.keys(rows[0]);
    const firstCol = headers.find(h => /first.?name/i.test(h));
    const lastCol = headers.find(h => /last.?name/i.test(h));

    if (!firstCol || !lastCol) {
      return res.status(400).json({
        error: `Could not find First Name and Last Name columns. Found: ${headers.join(', ')}`,
      });
    }

    const names = rows
      .map(r => ({ firstName: String(r[firstCol]).trim(), lastName: String(r[lastCol]).trim() }))
      .filter(n => n.firstName || n.lastName);

    if (names.length === 0) return res.status(400).json({ error: 'No names found in file' });

    const whereClauses = names.map(() => '(LOWER(Full_Name) LIKE ? AND LOWER(Full_Name) LIKE ?)');
    const params = names.flatMap(n => [`%${n.firstName.toLowerCase()}%`, `%${n.lastName.toLowerCase()}%`]);

    const [members] = await pool.query(
      `SELECT DISTINCT SN, Full_Name FROM Members WHERE ${whereClauses.join(' OR ')}`,
      params
    );

    const matchedNames = new Set();
    for (const member of members) {
      const lower = member.Full_Name.toLowerCase();
      for (const n of names) {
        if (lower.includes(n.firstName.toLowerCase()) && lower.includes(n.lastName.toLowerCase())) {
          matchedNames.add(`${n.firstName}|${n.lastName}`);
        }
      }
    }

    const unmatched = names.filter(n => !matchedNames.has(`${n.firstName}|${n.lastName}`));

    let inserted = 0;
    if (members.length > 0) {
      const values = members.map(m => [m.SN, m.Full_Name, date, fellowship_id, non_compliance_id]);
      const [result] = await pool.query(
        'INSERT INTO Offenders (SN, Fullname, Date, Fellowship_ID, Non_Compliance_Id) VALUES ?',
        [values]
      );
      inserted = result.affectedRows;
    }

    res.json({ inserted, unmatched });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

export default router;
