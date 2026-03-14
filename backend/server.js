import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import authRouter from './routes/auth.js';
import membersRouter from './routes/members.js';
import attendanceRouter from './routes/attendance.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, maxAge: 24 * 60 * 60 * 1000 },
}));

app.use('/api/auth', authRouter);
app.use('/api/members', membersRouter);
app.use('/api/attendance', attendanceRouter);

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
