const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const migrationsDir = path.resolve(__dirname, '../migrations');

async function main() {
  const connectionString = process.env.DATABASE_URL;
  const useSsl =
    connectionString?.includes('sslmode=require') ||
    process.env.DB_SSL === 'true';

  const client = new Client({
    connectionString,
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'studymate_ai',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  });

  await client.connect();

  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    await client.query(sql);
    console.log(`Applied migration: ${file}`);
  }

  await client.end();
}

main().catch((error) => {
  console.error('Migration failed:', error.message);
  process.exit(1);
});
