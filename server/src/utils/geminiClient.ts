import { GoogleGenerativeAI } from '@google/generative-ai';

let cachedClient: GoogleGenerativeAI | null = null;

export const getGeminiClient = (): GoogleGenerativeAI => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }

  if (!cachedClient) {
    cachedClient = new GoogleGenerativeAI(apiKey);
  }

  return cachedClient;
};

export default getGeminiClient;
