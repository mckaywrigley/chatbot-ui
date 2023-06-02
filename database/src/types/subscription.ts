import { z } from "zod";

// key: user:${email} .subscriptions
export const subscription = z.object({
  startsAt: z.number(),
  endsAt: z.number(),
  plan: z.string(),
  tradeOrderId: z.string(),
});
export type Subscription = z.infer<typeof subscription>;
