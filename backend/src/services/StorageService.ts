import fs from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { env } from '../config';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/ApiError';

export class StorageService {
  private static s3Client: S3Client | null = null;

  private static getS3Client(): S3Client {
    if (!this.s3Client) {
      if (!env.spacesAccessKey || !env.spacesSecretKey || !env.spacesEndpoint || !env.spacesRegion) {
        throw ApiError.internal('DigitalOcean Spaces credentials not configured');
      }

      this.s3Client = new S3Client({
        endpoint: env.spacesEndpoint,
        region: env.spacesRegion,
        credentials: {
          accessKeyId: env.spacesAccessKey,
          secretAccessKey: env.spacesSecretKey,
        },
      });
    }
    return this.s3Client;
  }

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

    if (env.storageProvider === 'spaces' || env.storageProvider === 's3') {
      return this.saveFileToSpaces(file, filename);
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

  private static async saveFileToSpaces(
    file: Express.Multer.File,
    filename: string
  ): Promise<string> {
    const client = this.getS3Client();
    const bucket = env.storageBucket || env.spacesBucket;

    if (!bucket) {
      throw ApiError.internal('Storage bucket not configured');
    }

    const key = `${env.uploadDir}/${filename}`;

    try {
      const fileBuffer = file.buffer || fs.readFileSync(file.path!);

      const upload = new Upload({
        client,
        params: {
          Bucket: bucket,
          Key: key,
          Body: fileBuffer,
          ContentType: file.mimetype,
          ACL: 'private',
        },
      });

      await upload.done();

      const fileUrl = `${env.spacesEndpoint}/${bucket}/${key}`;
      logger.info(`Archivo guardado en Spaces: ${fileUrl}`);
      
      return key; // Retornar la key para usar como storageKey
    } catch (error) {
      logger.error('Error guardando archivo en Spaces:');
      logger.error('Error details:', error);
      if (error instanceof Error) {
        logger.error('Error message:', error.message);
        logger.error('Error stack:', error.stack);
      }
      throw ApiError.internal(`Error uploading file to Spaces: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async deleteFile(storageKey: string): Promise<void> {
    if (env.storageProvider === 'local') {
      return this.deleteFileLocally(storageKey);
    }

    if (env.storageProvider === 'spaces' || env.storageProvider === 's3') {
      return this.deleteFileFromSpaces(storageKey);
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

  private static async deleteFileFromSpaces(key: string): Promise<void> {
    const client = this.getS3Client();
    const bucket = env.storageBucket || env.spacesBucket;

    if (!bucket) {
      throw ApiError.internal('Storage bucket not configured');
    }

    try {
      const command = new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      await client.send(command);
      logger.info(`Archivo eliminado de Spaces: ${key}`);
    } catch (error) {
      logger.error('Error eliminando archivo de Spaces:', error);
      throw ApiError.internal('Error deleting file from Spaces');
    }
  }

  static async getFilePath(storageKey: string): Promise<string> {
    if (env.storageProvider === 'local') {
      return storageKey;
    }

    if (env.storageProvider === 'spaces' || env.storageProvider === 's3') {
      // Para Spaces, necesitamos descargar el archivo temporalmente
      return this.downloadFromSpaces(storageKey);
    }

    throw ApiError.notImplemented(
      `Storage provider "${env.storageProvider}" no está implementado`
    );
  }

  private static async downloadFromSpaces(key: string): Promise<string> {
    const client = this.getS3Client();
    const bucket = env.storageBucket || env.spacesBucket;

    if (!bucket) {
      throw ApiError.internal('Storage bucket not configured');
    }

    try {
      // Crear directorio temporal si no existe
      const tempDir = path.resolve(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const tempFilePath = path.join(tempDir, path.basename(key));

      // Si ya existe el archivo temporal, usarlo
      if (fs.existsSync(tempFilePath)) {
        return tempFilePath;
      }

      // Descargar el archivo desde Spaces
      const { GetObjectCommand } = await import('@aws-sdk/client-s3');
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      const response = await client.send(command);
      
      if (!response.Body) {
        throw new Error('No file body received');
      }

      // Convertir stream a buffer y guardar
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as any) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);
      fs.writeFileSync(tempFilePath, buffer);

      logger.info(`Archivo descargado de Spaces: ${key} -> ${tempFilePath}`);
      return tempFilePath;
    } catch (error) {
      logger.error('Error descargando archivo de Spaces:', error);
      throw ApiError.internal('Error downloading file from Spaces');
    }
  }
}
