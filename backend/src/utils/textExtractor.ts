import fs from 'fs';
import { logger } from './logger';

const pdfParse = require('pdf-parse');

export interface TextExtractionResult {
  text: string;
  hasText: boolean;
  pageCount?: number;
  characterCount: number;
}

const MIN_TEXT_THRESHOLD = 100;

export class TextExtractor {
  static async extractFromPDF(filePath: string): Promise<TextExtractionResult> {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);

      const text = data.text
        .replace(/\r\n/g, '\n')           // normaliza saltos de línea Windows
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // quita caracteres de control no imprimibles
        .replace(/\uFFFD/g, '')              // quita caracteres de reemplazo Unicode
        .replace(/\n{3,}/g, '\n\n')         // colapsa líneas vacías múltiples
        .trim();
      const characterCount = text.length;
      const hasText = characterCount >= MIN_TEXT_THRESHOLD;

      logger.info(
        `PDF procesado: ${data.numpages} páginas, ${characterCount} caracteres, hasText: ${hasText}`
      );

      return {
        text,
        hasText,
        pageCount: data.numpages,
        characterCount,
      };
    } catch (error) {
      logger.error('Error extrayendo texto de PDF:', error);
      throw error;
    }
  }

  static async extractFromText(filePath: string): Promise<TextExtractionResult> {
    try {
      const text = fs.readFileSync(filePath, 'utf-8').trim();
      const characterCount = text.length;
      const hasText = characterCount >= MIN_TEXT_THRESHOLD;

      logger.info(`Archivo de texto procesado: ${characterCount} caracteres, hasText: ${hasText}`);

      return {
        text,
        hasText,
        characterCount,
      };
    } catch (error) {
      logger.error('Error leyendo archivo de texto:', error);
      throw error;
    }
  }

  static async extractText(
    filePath: string,
    mimeType: string
  ): Promise<TextExtractionResult> {
    if (mimeType === 'application/pdf') {
      return this.extractFromPDF(filePath);
    }

    if (mimeType === 'text/plain' || mimeType === 'text/markdown') {
      return this.extractFromText(filePath);
    }

    logger.warn(`Tipo de archivo no soportado para extracción de texto: ${mimeType}`);
    return {
      text: '',
      hasText: false,
      characterCount: 0,
    };
  }
}
