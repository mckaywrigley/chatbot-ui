import { z } from "zod";

// key: sessionToken:${token}
export const sessionToken = z.object({
  createdAt: z.number(),
  isRevoked: z.boolean(),
  userEmail: z.string(),
});

export type SessionToken = z.infer<typeof sessionToken>;
