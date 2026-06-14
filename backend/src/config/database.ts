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
    const connStr = databaseConfig.connectionString ?? '';
    
    // Detectar si es una base de datos remota (no localhost)
    const isRemoteDb = connStr && 
      !connStr.includes('localhost') && 
      !connStr.includes('127.0.0.1') &&
      !connStr.includes('::1');
    
    // Usar SSL si: es producción, tiene sslmode=require, o es base de datos remota
    const requireSsl =
      env.isProduction || 
      connStr.includes('sslmode=require') ||
      connStr.includes('sslmode=no-verify') ||
      isRemoteDb;

    const poolConfig: any = {
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl: requireSsl ? { rejectUnauthorized: false } : undefined,
    };

    if (
      databaseConfig.host &&
      databaseConfig.user &&
      databaseConfig.password &&
      databaseConfig.database
    ) {
      poolConfig.host = databaseConfig.host;
      poolConfig.port = databaseConfig.port;
      poolConfig.database = databaseConfig.database;
      poolConfig.user = databaseConfig.user;
      poolConfig.password = databaseConfig.password;
    } else if (connStr) {
      poolConfig.connectionString = connStr;
    }

    pool = new Pool(poolConfig);
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
