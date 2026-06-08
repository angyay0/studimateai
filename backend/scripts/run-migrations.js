const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const migrationsDir = path.resolve(__dirname, '../migrations');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'studymate_ai',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
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
