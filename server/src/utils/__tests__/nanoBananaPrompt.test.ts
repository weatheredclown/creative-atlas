import { describe, expect, it } from 'vitest';
import { buildNanoBananaPrompt } from '../nanoBananaPrompt.js';

describe('buildNanoBananaPrompt', () => {
  it('includes project title, summary, and tags', () => {
    const prompt = buildNanoBananaPrompt({
      title: 'Skyward Archives',
      summary: 'A rebel archivist preserves skyship memories while storms erase history.',
      tags: ['Skyships', 'Memory Heists', 'Storm magic'],
      mode: 'sunrise',
    });

    expect(prompt).toContain('Project title: Skyward Archives.');
    expect(prompt).toContain('Project overview: A rebel archivist preserves skyship memories while storms erase history.');
    expect(prompt).toContain('Theme tags: Skyships, Memory Heists, Storm magic.');
    expect(prompt).toContain('Sunrise Bloom');
  });

  it('truncates long summaries and deduplicates tags', () => {
    const longSummary = 'Lore '.repeat(400);
    const prompt = buildNanoBananaPrompt({
      title: 'Echoes of the Pit',
      summary: longSummary,
      tags: ['Echoes', 'echoes', 'Fractures', 'Echoes'],
      mode: 'prismatic',
    });

    expect(prompt).toContain('Echoes of the Pit');
    expect(prompt.match(/Echoes/g)?.length).toBe(2); // title mention + tag line
    expect(prompt).toContain('Theme tags: Echoes, Fractures.');
    expect(prompt.includes('Lore')).toBe(true);
    expect(prompt.length).toBeLessThan(longSummary.length);
  });
});
