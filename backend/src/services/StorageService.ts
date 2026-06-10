import fs from 'fs';
import path from 'path';
import { env } from '../config';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/ApiError';

export class StorageService {
  private static ensureUploadDir(): void {
    const uploadDir = path.resolve(process.cwd(), env.uploadDir);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      logger.info(`Directorio de uploads creado: ${uploadDir}`);
    }
  }

  static async saveFile(file: Express.Multer.File, filename: string): Promise<string> {
    if (env.storageProvider === 'local') {
      return this.saveFileLocally(file, filename);
    }

    throw ApiError.notImplemented(
      `Storage provider "${env.storageProvider}" no está implementado`
    );
  }

  private static async saveFileLocally(
    file: Express.Multer.File,
    filename: string
  ): Promise<string> {
    this.ensureUploadDir();

    const uploadDir = path.resolve(process.cwd(), env.uploadDir);
    const filePath = path.join(uploadDir, filename);

    if (file.buffer) {
      fs.writeFileSync(filePath, file.buffer);
    } else if (file.path) {
      fs.copyFileSync(file.path, filePath);
    } else {
      throw ApiError.internal('El archivo no tiene buffer ni path');
    }

    logger.info(`Archivo guardado localmente: ${filePath}`);
    return filePath;
  }

  static async deleteFile(storageKey: string): Promise<void> {
    if (env.storageProvider === 'local') {
      return this.deleteFileLocally(storageKey);
    }

    throw ApiError.notImplemented(
      `Storage provider "${env.storageProvider}" no está implementado`
    );
  }

  private static async deleteFileLocally(filePath: string): Promise<void> {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info(`Archivo eliminado: ${filePath}`);
    }
  }

  static async getFilePath(storageKey: string): Promise<string> {
    if (env.storageProvider === 'local') {
      return storageKey;
    }

    throw ApiError.notImplemented(
      `Storage provider "${env.storageProvider}" no está implementado`
    );
  }
}
