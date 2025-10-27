import { describe, expect, it } from 'vitest';
import { formatStatusLabel, getStatusClasses, STATUS_STYLE_MAP } from '../status';

describe('status utilities', () => {
  it('returns mapped classes for known statuses', () => {
    Object.entries(STATUS_STYLE_MAP).forEach(([status, classes]) => {
      expect(getStatusClasses(status)).toBe(classes);
      expect(getStatusClasses(status.toUpperCase())).toBe(classes);
    });
  });

  it('falls back to the default style for unknown statuses', () => {
    expect(getStatusClasses('mystery')).toBe(STATUS_STYLE_MAP.idea);
  });

  it('formats status labels into title case words', () => {
    expect(formatStatusLabel('in-progress')).toBe('In Progress');
    expect(formatStatusLabel('alpha_phase')).toBe('Alpha Phase');
    expect(formatStatusLabel('ready to ship')).toBe('Ready To Ship');
  });
});
