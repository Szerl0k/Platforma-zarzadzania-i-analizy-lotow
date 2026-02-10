import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const app = express();
const port = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'flight_management',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Database connected successfully:', res.rows[0]);
  }
});

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', message: 'Backend is running' });
});

app.get('/api/welcome', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT version()');
    res.json({
      message: 'Witaj w Platformie zarządzania i analizy lotów!',
      database: 'PostgreSQL connected',
      version: result.rows[0].version
    });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.listen(port, () => {
  console.log(`Backend server running on port ${port}`);
});
