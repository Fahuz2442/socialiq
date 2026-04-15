import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import 'dotenv/config';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('Unexpected Postgres pool error', err);
});

export const db = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
};

// ─── Migration runner ────────────────────────────────────────
// Run with: node src/db/migrate.js
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const migrations = [
    '001_users_tokens.sql',
    '002_posts_metrics.sql',
  ];

  console.log('Running migrations...');
  for (const file of migrations) {
    const sql = readFileSync(join(__dirname, 'migrations', file), 'utf8');
    await pool.query(sql);
    console.log(`  ✓ ${file}`);
  }
  console.log('All migrations complete.');
  await pool.end();
}
