import { z } from 'zod';

const GenerateParametersGenerateParameters = z
  .object({
    best_of: z.number().min(0),
    decoder_input_details: z.boolean().default(true),
    details: z.boolean().default(true),
    do_sample: z.boolean().default(false),
    max_new_tokens: z.number().int().min(0).max(511),
    repetition_penalty: z.number().min(0),
    return_full_text: z.boolean(),
    seed: z.number().int().min(0),
    stop: z.array(z.string()).max(4),
    temperature: z.number().min(0),
    top_k: z.number().int().min(0),
    top_n_tokens: z.number().int().min(0),
    top_p: z.number().min(0).max(1),
    truncate: z.number().int().min(0),
    typical_p: z.number().min(0).max(1),
    watermark: z.boolean().default(false),
  })
  .deepPartial();

const InputSchema = z.object({
  inputs: z.string(),
  parameters: GenerateParametersGenerateParameters,
});
