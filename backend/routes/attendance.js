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

router.get('/fellowships', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM Fellowships ORDER BY Program_ID');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.Date, a.SN, a.Fullname, a.Fellowship_id, f.Fellowship AS Fellowship_name
       FROM Attendance a
       LEFT JOIN Fellowships f ON f.Program_ID = a.Fellowship_id
       ORDER BY a.Date DESC`
    );
    // Format dates as YYYY-MM-DD strings to avoid timezone shifts
    const formatted = rows.map(r => ({
      ...r,
      Date: r.Date instanceof Date
        ? `${r.Date.getFullYear()}-${String(r.Date.getMonth() + 1).padStart(2, '0')}-${String(r.Date.getDate()).padStart(2, '0')}`
        : r.Date,
    }));
    res.json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    const { date, fellowship_id } = req.body;
    if (!date) return res.status(400).json({ error: 'Date is required' });
    if (!fellowship_id) return res.status(400).json({ error: 'Fellowship is required' });
    if (!req.file) return res.status(400).json({ error: 'File is required' });

    // Parse Excel
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (rows.length === 0) {
      return res.status(400).json({ error: 'Excel file is empty' });
    }

    // Auto-detect First Name / Last Name columns (case-insensitive)
    const headers = Object.keys(rows[0]);
    const firstCol = headers.find(h => /first.?name/i.test(h));
    const lastCol = headers.find(h => /last.?name/i.test(h));

    if (!firstCol || !lastCol) {
      return res.status(400).json({
        error: `Could not find First Name and Last Name columns. Found: ${headers.join(', ')}`,
      });
    }

    // Build name list
    const names = rows
      .map(r => ({
        firstName: String(r[firstCol]).trim(),
        lastName: String(r[lastCol]).trim(),
      }))
      .filter(n => n.firstName || n.lastName);

    if (names.length === 0) {
      return res.status(400).json({ error: 'No names found in file' });
    }

    // Match each name to Members table
    const whereClauses = names.map(() => '(LOWER(Full_Name) LIKE ? AND LOWER(Full_Name) LIKE ?)');
    const params = names.flatMap(n => [`%${n.firstName.toLowerCase()}%`, `%${n.lastName.toLowerCase()}%`]);

    const [members] = await pool.query(
      `SELECT DISTINCT SN, Full_Name FROM Members WHERE ${whereClauses.join(' OR ')}`,
      params
    );

    // Determine which input names were matched
    const matchedNames = new Set();
    for (const member of members) {
      const lower = member.Full_Name.toLowerCase();
      for (const n of names) {
        if (
          lower.includes(n.firstName.toLowerCase()) &&
          lower.includes(n.lastName.toLowerCase())
        ) {
          matchedNames.add(`${n.firstName}|${n.lastName}`);
        }
      }
    }

    const unmatched = names.filter(
      n => !matchedNames.has(`${n.firstName}|${n.lastName}`)
    );

    // Bulk insert matched records
    let inserted = 0;
    if (members.length > 0) {
      const values = members.map(m => [date, m.SN, m.Full_Name, fellowship_id]);
      const [result] = await pool.query(
        'INSERT IGNORE INTO Attendance (Date, SN, Fullname, Fellowship_id) VALUES ?',
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
