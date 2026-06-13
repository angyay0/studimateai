const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Carga el .env (raíz del monorepo, backend/, o un nivel más arriba)
const candidateEnvPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '../../.env'),
];
for (const candidate of candidateEnvPaths) {
  if (fs.existsSync(candidate)) {
    require('dotenv').config({ path: candidate });
    console.log(`Cargando .env desde: ${candidate}`);
    break;
  }
}

const migrationsDir = path.resolve(__dirname, '../migrations');

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL no está definida. Verifica que exista un archivo .env con la cadena de conexión.');
  }

  console.log('Conectando a base de datos...');
  const needsSsl = /sslmode=require/i.test(process.env.DATABASE_URL);
  console.log(`SSL: ${needsSsl}`);

  // Quita sslmode de la URL para que pg no lo interprete (conflicto con rejectUnauthorized).
  // El SSL se maneja por la opción `ssl` del cliente.
  const cleanUrl = process.env.DATABASE_URL
    .replace(/[?&]sslmode=[^&]*/i, '')
    .replace(/[?&]uselibpqcompat=[^&]*/i, '');

  const client = new Client({
    connectionString: cleanUrl,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
  });

  await client.connect();
  console.log('Conexión exitosa!');

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
  console.log('Migraciones completadas!');
}

main().catch((error) => {
  console.error('Migration failed:', error.message || JSON.stringify(error));
  if (error.code) console.error('Code:', error.code);
  if (error.detail) console.error('Detail:', error.detail);
  if (error.cause) console.error('Cause:', error.cause);
  process.exit(1);
});
