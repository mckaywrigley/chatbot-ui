import { z } from "zod";

export const unit = z.enum(["ms", "s", "m", "h", "d"]);
export type Unit = z.infer<typeof unit>;

export const duration = z.union([
  z.string().refine((value) => /^\d+\s(ms|s|m|h|d)$/.test(value), {
    message: "Invalid Duration format. Should be `${number} ${Unit}`.",
  }),
  z.string().refine((value) => /^\d+(ms|s|m|h|d)$/.test(value), {
    message: "Invalid Duration format. Should be `${number}${Unit}`.",
  }),
]);
// Copied from @upstash/ratelimit/src/duration.ts
export type Duration = `${number} ${Unit}` | `${number}${Unit}`;

/**
 * Convert a human readable duration to milliseconds
 */
export function ms(d: Duration): number {
  const match = d.match(/^(\d+)\s?(ms|s|m|h|d)$/);
  if (!match) {
    throw new Error(`Unable to parse window size: ${d}`);
  }
  const time = parseInt(match[1]);
  const unit = match[2] as Unit;

  switch (unit) {
    case "ms":
      return time;
    case "s":
      return time * 1000;
    case "m":
      return time * 1000 * 60;
    case "h":
      return time * 1000 * 60 * 60;
    case "d":
      return time * 1000 * 60 * 60 * 24;

    default:
      throw new Error(`Unable to parse window size: ${d}`);
  }
}

export const modelLimit = z.object({
  window: duration,
  limit: z.number().nonnegative(),
});
export type ModelLimit = z.infer<typeof modelLimit>;

// key: plan:${planName}
export const plan = z.object({
  prices: z.object({
    monthly: z.number().nonnegative(),
    quarterly: z.number().nonnegative(),
    yearly: z.number().nonnegative(),
  }),
  limits: z.record(modelLimit),
});
export type Plan = z.infer<typeof plan>;
