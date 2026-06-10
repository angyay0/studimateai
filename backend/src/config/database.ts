/**
 * Conexión a PostgreSQL mediante un pool de `pg`.
 *
 * El pool se crea de forma perezosa (lazy): no se abre ninguna conexión al
 * importar este módulo, de modo que el servidor pueda arrancar aunque la base
 * de datos todavía no esté disponible (útil en desarrollo y para el health check).
 */

import { Pool, QueryResultRow } from 'pg';
import { databaseConfig, env } from './index';

let pool: Pool | null = null;

/**
 * Devuelve el pool de conexiones, creándolo en la primera llamada.
 */
export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: databaseConfig.connectionString,
      // En producción muchos proveedores gestionados requieren SSL.
      ssl: env.isProduction ? { rejectUnauthorized: false } : undefined,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return pool;
}

/**
 * Verifica la conectividad con la base de datos.
 * No lanza errores: devuelve `false` si la conexión falla (apto para health checks).
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await getPool().query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

/**
 * Cierra el pool de conexiones. Útil para un apagado ordenado (SIGTERM/SIGINT)
 * y para limpiar recursos entre pruebas.
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Ejecuta una query SQL en la base de datos.
 */
export async function query<T extends QueryResultRow = any>(text: string, params?: unknown[]) {
  return getPool().query<T>(text, params);
}
