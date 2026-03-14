import { Router } from 'express';
import mysql from 'mysql2/promise';

const router = Router();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT SN, Full_Name FROM Members ORDER BY Full_Name ASC'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

export default router;
