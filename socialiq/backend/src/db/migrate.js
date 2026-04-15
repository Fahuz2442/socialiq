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

const __dirname = dirname(fileURLToPath(import.meta.url));

const migrations = [
  '001_users_tokens.sql',
  '002_posts_metrics.sql',
  '002_posts_metrics.sql',
   '004_team_kpis.sql',
    '005_competitors.sql',
];

console.log('Connecting to database...');
console.log('URL:', process.env.DATABASE_URL);

try {
  console.log('\nRunning migrations...');
  for (const file of migrations) {
    const filePath = join(__dirname, 'migrations', file);
    const sql = readFileSync(filePath, 'utf8');
    await pool.query(sql);
    console.log(`  ✓ ${file}`);
  }
  console.log('\nAll migrations complete.');
} catch (err) {
  console.error('\nMigration failed:', err.message);
  process.exit(1);
} finally {
  await pool.end();
}