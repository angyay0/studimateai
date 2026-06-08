import path from 'path';

export const backendRoot = path.resolve(__dirname, '..', '..');
export const uploadsRoot = path.join(backendRoot, 'uploads');
/**
 * Utilidades de rutas del sistema de archivos (compatibles con CommonJS).
 *
 * Nota: en CommonJS `__dirname` está disponible globalmente, por lo que no se
 * usa `import.meta.url` (que solo existe en módulos ES y rompería la compilación
 * con `"module": "commonjs"`).
 */

/** Raíz del paquete backend (un nivel por encima de `src/` o `dist/`). */
export const projectRoot = path.resolve(__dirname, '../..');

/** Resuelve una ruta absoluta a partir de segmentos relativos a la raíz del backend. */
export function resolveFromRoot(...segments: string[]): string {
  return path.resolve(projectRoot, ...segments);
}

