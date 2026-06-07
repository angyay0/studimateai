import axios from 'axios';
import { openAiConfig } from '../config';

type OpenAIConnectionStatus = {
  configured: boolean;
  ok: boolean;
  model: string;
  status?: number;
  message: string;
};

export class OpenAIService {
  static isConfigured() {
    return Boolean(openAiConfig.apiKey) && !openAiConfig.apiKey.includes('your-key');
  }

  static async testConnection(): Promise<OpenAIConnectionStatus> {
    if (!this.isConfigured()) {
      return {
        configured: false,
        ok: false,
        model: openAiConfig.model,
        message: 'OPENAI_API_KEY is not configured',
      };
    }

    try {
      const response = await axios.get('https://api.openai.com/v1/models', {
        headers: {
          Authorization: `Bearer ${openAiConfig.apiKey}`,
        },
        timeout: 10000,
      });

      return {
        configured: true,
        ok: true,
        model: openAiConfig.model,
        status: response.status,
        message: 'OpenAI API connection successful',
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return {
          configured: true,
          ok: false,
          model: openAiConfig.model,
          status: error.response?.status,
          message: error.response?.status === 401
            ? 'OpenAI API key was rejected'
            : 'OpenAI API connection failed',
        };
      }

      return {
        configured: true,
        ok: false,
        model: openAiConfig.model,
        message: 'OpenAI API connection failed',
      };
    }
  }
}
