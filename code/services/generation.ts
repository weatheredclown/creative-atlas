
import { GoogleGenAI } from '@google/genai';

const MODEL_NAME = 'gemini-2.5-flash';
const DEFAULT_TEMPERATURE = 0.85;
const MAX_OUTPUT_TOKENS = 768;

let cachedClient: GoogleGenAI | null = null;

const getClient = (): GoogleGenAI | null => {
  const apiKey = import.meta.env.VITE_API_KEY ?? import.meta.env.VITE_GENAI_API_KEY;

  if (!apiKey) {
    return null;
  }

  if (!cachedClient) {
    cachedClient = new GoogleGenAI({ apiKey });
  }

  return cachedClient;
};

const buildFallbackResponse = (prompt: string): string => {
  const cleaned = prompt.replace(/\s+/g, ' ').trim();

  if (!cleaned) {
    return 'Atlas Intelligence needs a prompt to riff on. Try sharing a short description or a few evocative keywords!';
  }

  const words = cleaned
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .split(/\s+/)
    .filter((word) => word.length > 3);

  const uniqueKeywords = Array.from(new Set(words)).slice(0, 6);
  const headline = uniqueKeywords.length > 0 ? uniqueKeywords.join(' • ') : cleaned;

  const cadenceHints = [
    'Consider what changes if this idea collides with an older piece of canon.',
    'Spotlight a sensory detail that would hook a curious reader.',
    'Note the tension or unanswered question that keeps the scene alive.',
  ];

  const cadence = cadenceHints[Math.floor(cleaned.length % cadenceHints.length)];

  return [
    `✨ **Atlas Intelligence** riffs on your prompt: _${headline}_`,
    '— A snapshot to anchor the beat: sketch how this idea manifests right now and which artifact should hold it.',
    `— Push it forward: ${cadence}`,
    '— Next experiment: jot down a related artifact you could prototype in the next session.',
  ].join('\n');
};

export async function generateText(prompt: string): Promise<string> {
  const trimmedPrompt = prompt.trim();

  if (!trimmedPrompt) {
    throw new Error('Provide a prompt before calling Atlas Intelligence.');
  }

  const client = getClient();

  if (client) {
    try {
      const response = await client.models.generateContent({
        model: MODEL_NAME,
        contents: {
          role: 'user',
          parts: [{ text: trimmedPrompt }],
        },
        config: {
          temperature: DEFAULT_TEMPERATURE,
          maxOutputTokens: MAX_OUTPUT_TOKENS,
        },
      });

      const text = response.text?.trim();

      if (text) {
        return text;
      }
    } catch (error) {
      console.error('Failed to generate text with Gemini:', error);
    }
  }

  return buildFallbackResponse(trimmedPrompt);
}
