import { z } from 'zod';

const GenerateParametersGenerateParameters = z.object({
  best_of: z.union([z.literal(null), z.number().min(0)]).nullable(),
  decoder_input_details: z.boolean().default(true),
  details: z.boolean().default(true),
  do_sample: z.boolean().default(false),
  max_new_tokens: z.number().int().min(0).max(511),
  repetition_penalty: z.union([z.literal(null), z.number().min(0)]).nullable(),
  return_full_text: z.union([z.literal(null), z.boolean()]).nullable(),
  seed: z.union([z.literal(null), z.number().int().min(0)]).nullable(),
  stop: z.array(z.string()).max(4),
  temperature: z.union([z.literal(null), z.number().min(0)]).nullable(),
  top_k: z.union([z.literal(null), z.number().int().min(0)]).nullable(),
  top_n_tokens: z.union([z.literal(null), z.number().int().min(0)]).nullable(),
  top_p: z.union([z.literal(null), z.number().min(0).max(1)]).nullable(),
  truncate: z.union([z.literal(null), z.number().int().min(0)]).nullable(),
  typical_p: z.union([z.literal(null), z.number().min(0).max(1)]).nullable(),
  watermark: z.boolean().default(false),
});

const InputSchema = z.object({
  inputs: z.string(),
  parameters: GenerateParametersGenerateParameters,
});
