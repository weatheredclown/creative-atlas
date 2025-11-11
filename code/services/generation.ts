
import { getGeminiErrorMessage, requestGeminiText } from './aiProxy';

const MODEL_NAME = 'gemini-2.5-flash';
const DEFAULT_TEMPERATURE = 0.85;
const MAX_OUTPUT_TOKENS = 2048;

const applySubstitutions = (input: string, substitutions?: Record<string, string>): string => {
  if (!substitutions || Object.keys(substitutions).length === 0) {
    return input;
  }

  return Object.entries(substitutions).reduce((result, [token, replacement]) => {
    if (!token) {
      return result;
    }

    return result.split(token).join(replacement);
  }, input);
};

export interface GenerateTextOptions {
  substitutions?: Record<string, string>;
}

export async function generateText(prompt: string, options: GenerateTextOptions = {}): Promise<string> {
  const trimmedPrompt = prompt.trim();

  if (!trimmedPrompt) {
    throw new Error('Provide a prompt before calling Atlas Intelligence.');
  }

  const finalPrompt = applySubstitutions(trimmedPrompt, options.substitutions);

  try {
    const text = (await requestGeminiText({
      prompt: finalPrompt,
      model: MODEL_NAME,
      config: {
        temperature: DEFAULT_TEMPERATURE,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
      },
    })).trim();

    if (!text) {
      throw new Error('Atlas Intelligence returned an empty response.');
    }

    return text;
  } catch (error) {
    console.error('Failed to generate text with Gemini:', error);
    const message = getGeminiErrorMessage(error, 'Failed to generate text.');
    throw new Error(message);
  }
}
