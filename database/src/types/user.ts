import { z } from "zod";
import { subscription } from "./subscription";

export const role = z.enum(["user", "mod", "admin"]);
export type Role = z.infer<typeof role>;

// key: user:${email}
export const user = z.object({
  name: z.string(),
  passwordHash: z.string(),
  createdAt: z.number(),
  lastLoginAt: z.number(),
  isBlocked: z.boolean(),
  resetChances: z.number(),
  inviterCode: z.string().optional(),
  invitationCodes: z.string().array(),
  phone: z.string().optional(),
  subscriptions: subscription.array(),
  role,
});
export type User = z.infer<typeof user>;
