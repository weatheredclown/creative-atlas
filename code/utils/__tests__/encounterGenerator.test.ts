import { describe, expect, it } from 'vitest';

import {
  createEncounterConfig,
  generateEncounter,
  sanitizeEncounterConfig,
  sanitizeGeneratedEncounter,
} from '../encounterGenerator';

const createDeterministicRng = (sequence: number[]): (() => number) => {
  let index = 0;
  return () => {
    const value = sequence[index % sequence.length];
    index += 1;
    return value;
  };
};

describe('encounterGenerator', () => {
  it('normalizes partial configuration input', () => {
    const config = createEncounterConfig({
      intensity: 'gauntlet',
      objective: 'recon',
      tone: 'grim',
      dustlandAnchor: 'personaMasks',
      pitAnchor: 'feralDrift',
    });

    expect(config).toEqual({
      intensity: 'gauntlet',
      objective: 'recon',
      tone: 'grim',
      dustlandAnchor: 'personaMasks',
      pitAnchor: 'feralDrift',
    });

    const sanitized = sanitizeEncounterConfig({ tone: 'unknown', pitAnchor: 'not-real' } as unknown);
    expect(sanitized).toEqual(createEncounterConfig({ tone: 'tense', pitAnchor: 'emberParliament' }));
  });

  it('produces a blended Dustland and PIT encounter', () => {
    const rng = createDeterministicRng([0.1, 0.3, 0.5, 0.7, 0.9]);
    const encounter = generateEncounter(
      {
        intensity: 'skirmish',
        objective: 'sabotage',
        tone: 'mystic',
        dustlandAnchor: 'signalSpire',
        pitAnchor: 'breachCult',
      },
      rng,
    );

    expect(encounter.title).toContain('Skirmish');
    expect(encounter.location).toContain('Dustland');
    expect(encounter.location).toContain('PIT');
    expect(encounter.briefing).toMatch(/Dustland/i);
    expect(encounter.briefing).toMatch(/PIT/i);
    expect(encounter.beats.length).toBeGreaterThan(0);
    expect(encounter.rewards.length).toBe(3);
  });

  it('sanitizes generated encounters and discards empty payloads', () => {
    expect(sanitizeGeneratedEncounter(null)).toBeUndefined();
    expect(sanitizeGeneratedEncounter({})).toBeUndefined();

    const hydrated = sanitizeGeneratedEncounter({
      title: ' Test ',
      location: ' Location ',
      briefing: ' Brief ',
      beats: [' A ', 4],
      rewards: [' Reward ', null],
    });

    expect(hydrated).toEqual({
      title: 'Test',
      location: 'Location',
      briefing: 'Brief',
      beats: ['A'],
      rewards: ['Reward'],
    });
  });
});

