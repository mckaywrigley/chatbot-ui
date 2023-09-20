import { z } from 'zod';

// | Argument            | Type                 | Default | Description                                                                                          |
// |---------------------|----------------------|---------|---------------------------------------------------|
// | do_sample           | bool                 | False   | Use sampling for text generation.                                                                  |
// | max_new_tokens      | int                  | 20      | Max number of new tokens to generate for each prompt.                                              |
// | repetition_penalty  | Optional[float]      | None    | Penalty for repeating tokens in the generated text.                                               |
// | return_full_text    | bool                 | False   | Return full generated text or just the top `n` sequences.                                          |
// | seed                | Optional[int]        | None    | Seed for controlling randomness in text generation.                                                |
// | stop_sequences      | Optional[List[str]]  | None    | List of strings that stop text generation when encountered.                                        |
// | temperature         | Optional[float]      | 1.0     | Control randomness of sampling. Lower values make it more deterministic, higher values more random. |
// | top_k               | Optional[int]        | -1      | Number of top tokens to consider. Set to -1 to consider all tokens.                                |
// | top_p               | Optional[float]      | 1.0     | Cumulative probability of top tokens to consider (0 < p <= 1). Set to 1 to consider all tokens.     |
// | truncate            | Optional[int]        | None    | Max length of generated text (number of tokens).                                                    |
// | watermark           | bool                 | False   | Add a watermark to the generated text.

const generateParametersSchema = z
  .object({
    do_sample: z.boolean(),
    max_new_tokens: z.number(),
    repetition_penalty: z.number().optional(),
    return_full_text: z.boolean(),
    seed: z.number().optional(),
    stop_sequences: z.array(z.string()).optional(),
    temperature: z.number().optional(),
    top_k: z.number().optional(),
    top_p: z.number().optional(),
    truncate: z.number().optional(),
    watermark: z.boolean(),
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
