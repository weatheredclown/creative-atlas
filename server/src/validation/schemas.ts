import { z } from 'zod';

const relationsSchema = z
  .string()
  .default('')
  .transform((val, ctx) => {
    if (!val) return [];
    const relations = val
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean);
    const result = [];
    for (const rel of relations) {
      const [kind, toId] = rel.split(':', 2);
      if (!kind || !toId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Invalid relation format: "${rel}". Expected "kind:toId".`,
        });
        return z.NEVER;
      }
      result.push({ kind: kind.trim(), toId: toId.trim() });
    }
    return result;
  });

const jsonSchema = z
  .string()
  .default('{}')
  .transform((val, ctx) => {
    if (!val) return {};
    try {
      return JSON.parse(val);
    } catch (e) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid JSON in 'data' field",
      });
      return z.NEVER;
    }
  });

const tagsSchema = z
  .string()
  .default('')
  .transform((val) => {
    if (!val) return [];
    return val
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean);
  });

export const CsvRowSchema = z.object({
  id: z.string().trim().min(1, 'ID is required and cannot be empty.'),
  type: z.string().trim().min(1, 'Type is required and cannot be empty.'),
  title: z.string().trim().min(1, 'Title is required and cannot be empty.'),
  summary: z.string().optional().default(''),
  status: z.string().optional().default('idea'),
  tags: tagsSchema,
  relations: relationsSchema,
  data: jsonSchema,
  projectid: z.string().optional(),
});
