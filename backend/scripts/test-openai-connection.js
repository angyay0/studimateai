const path = require('path');
const dotenv = require('dotenv');
const axios = require('axios');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const apiKey = process.env.OPENAI_API_KEY || '';
const model = process.env.OPENAI_MODEL || 'gpt-4-turbo';

function isConfigured(key) {
  return Boolean(key) && !key.includes('your-key');
}

async function main() {
  if (!isConfigured(apiKey)) {
    console.error('OPENAI_API_KEY is not configured. Add it to a local .env file that is not committed.');
    process.exitCode = 1;
    return;
  }

  try {
    const response = await axios.get('https://api.openai.com/v1/models', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      timeout: 10000,
    });

    console.log(`OpenAI API connection successful. Status: ${response.status}. Model configured: ${model}.`);
  } catch (error) {
    const status = error.response?.status;
    const reason = status === 401 ? 'API key was rejected' : 'connection failed';
    console.error(`OpenAI API ${reason}. Status: ${status || 'n/a'}.`);
    process.exitCode = 1;
  }
}

main();
