const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Carga el archivo .env igual que el backend (raíz del monorepo o backend/).
const candidateEnvPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '../../.env'),
];
for (const candidate of candidateEnvPaths) {
  if (fs.existsSync(candidate)) {
    require('dotenv').config({ path: candidate });
    break;
  }
}

const migrationsDir = path.resolve(__dirname, '../migrations');

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL no está definida. Verifica que el archivo .env exista y contenga la cadena de conexión.'
    );
  }

  // Si la conexión requiere SSL (DigitalOcean), habilítalo.
  const needsSsl = /sslmode=require/i.test(process.env.DATABASE_URL);

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
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
  if (error.detail) console.error('Detail:', error.detail);
  if (error.code) console.error('Code:', error.code);
  process.exit(1);
});
