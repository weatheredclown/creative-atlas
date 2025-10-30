import { describe, it, expect } from 'vitest';
import { CsvRowSchema } from './schemas';

describe('CsvRowSchema', () => {
  it('should validate a correct row', () => {
    const row = {
      id: 'art-1',
      type: 'character',
      title: 'John Doe',
      summary: 'A character',
      status: 'active',
      tags: 'tag1;tag2',
      relations: 'knows:art-2',
      data: '{"age": 30}',
      projectid: 'proj-1',
    };
    const result = CsvRowSchema.safeParse(row);
    expect(result.success).toBe(true);
  });

  it('should fail validation if id is missing', () => {
    const row = {
      type: 'character',
      title: 'John Doe',
    };
    const result = CsvRowSchema.safeParse(row);
    expect(result.success).toBe(false);
  });

  it('should fail validation if type is missing', () => {
    const row = {
      id: 'art-1',
      title: 'John Doe',
    };
    const result = CsvRowSchema.safeParse(row);
    expect(result.success).toBe(false);
  });

  it('should fail validation if title is missing', () => {
    const row = {
      id: 'art-1',
      type: 'character',
    };
    const result = CsvRowSchema.safeParse(row);
    expect(result.success).toBe(false);
  });

  it('should fail validation on invalid relations format', () => {
    const row = {
      id: 'art-1',
      type: 'character',
      title: 'John Doe',
      relations: 'invalid-relation',
    };
    const result = CsvRowSchema.safeParse(row);
    expect(result.success).toBe(false);
  });

  it('should fail validation on invalid JSON in data', () => {
    const row = {
      id: 'art-1',
      type: 'character',
      title: 'John Doe',
      data: 'invalid-json',
    };
    const result = CsvRowSchema.safeParse(row);
    expect(result.success).toBe(false);
  });
});
