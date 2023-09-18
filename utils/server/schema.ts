import { z } from 'zod';

const generateParametersSchema = z
  .object({
    temperature: z.number(),
    top_p: z.number(),
    top_k: z.number(),
    max_new_tokens: z.number(),
    token_repetition_penalty: z.number(),
    token_repetition_range: z.number(),
    token_repetition_decay: z.number(),
  })
  .deepPartial();
export type GenerateParameters = z.infer<typeof generateParametersSchema>;

export const generateInputSchema = z.object({
  inputs: z.string(),
  parameters: generateParametersSchema,
});
export type GenerateInput = z.infer<typeof generateInputSchema>;

export const statusSchema = z.enum([
  'UNINITIALIZED',
  'COMPLETED',
  'IN_PROGRESS',
]);
export type Status = z.infer<typeof statusSchema>;
