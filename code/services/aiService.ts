const normalizeText = (response: { text?: unknown }): string => {
  if (response && typeof response.text === 'string') {
    const trimmed = response.text.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  throw new Error('Received an empty response from the AI.');
};

export const generateText = async (
  prompt: string,
  config: Record<string, unknown> = {},
): Promise<string> => {
  const response = await fetch('/api/ai/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, config }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: 'Failed to generate text with AI.',
      details: response.statusText,
    }));
    throw new Error(
      `Failed to generate text with AI. ${error.details ?? ''}`,
    );
  }

  const result = await response.json();
  return normalizeText(result);
};
