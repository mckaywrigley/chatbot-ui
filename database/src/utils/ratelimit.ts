import { Ratelimit } from "@upstash/ratelimit";
import { defaultRedis } from "../redis";
import { Redis } from "@upstash/redis";
import { PlanDAL, UserDAL } from "../dal";
import { Duration, ms } from "../types";

export class ModelRateLimiter extends Ratelimit {
  /**
   * construct a new model rate limiter by email and model provided
   * @returns null if the plan or model does not exist
   */
  static async of(
    { email, model, redis = defaultRedis }: CreateModelRateLimiterParams,
  ): Promise<ModelRateLimiter | null> {
    const userDAL = new UserDAL(redis);
    const planDAL = new PlanDAL(redis);

    const planName = await userDAL.readPlan(email) ?? "free";
    const planLimit = await planDAL.readProperty(planName, "limits");
    const modelLimit = planLimit?.[model];

    if (!modelLimit) return null;

    const { limit, window } = modelLimit;
    return new ModelRateLimiter({
      redis,
      email,
      planName,
      model,
      limit,
      window: window as Duration,
    });
  }

  #email: string;
  #windowSize: number;
  #redis: Redis;
  #limit: number;
  #prefix: string;

  private constructor(
    { redis = defaultRedis, planName, model, limit, window, email }:
      ConstructModelRateLimiterParams,
  ) {
    const prefix = `ratelimit:${planName}:${model}`;

    super({
      redis,
      prefix,
      limiter: Ratelimit.slidingWindow(limit, window),
    });

    this.#email = email;
    this.#windowSize = ms(window);
    this.#redis = redis;
    this.#limit = limit;
    this.#prefix = prefix;
  }

  limitEmail() {
    return this.limit(this.#email);
  }

  async remaining() {
    const script = `
    local currentKey  = KEYS[1]           -- identifier including prefixes
    local previousKey = KEYS[2]           -- key of the previous bucket
    local tokens      = tonumber(ARGV[1]) -- tokens per window
    local now         = ARGV[2]           -- current timestamp in milliseconds
    local window      = ARGV[3]           -- interval in milliseconds
    
    local requestsInCurrentWindow = redis.call("GET", currentKey)
    if requestsInCurrentWindow == false then
      requestsInCurrentWindow = -1
    end
    
    local requestsInPreviousWindow = redis.call("GET", previousKey)
    if requestsInPreviousWindow == false then
      requestsInPreviousWindow = 0
    end
    
    local percentageInCurrent = ( now % window) / window
    if requestsInPreviousWindow * ( 1 - percentageInCurrent ) + requestsInCurrentWindow >= tokens then
      return -1
    end
    
    return tokens - requestsInCurrentWindow
    `;

    const now = Date.now();

    const currentWindow = Math.floor(now / this.#windowSize);
    const currentKey = [this.#email, currentWindow].join(":");
    const previousWindow = currentWindow - this.#windowSize;
    const previousKey = [this.#email, previousWindow].join(":");

    const remaining = (await this.#redis.eval(
      script,
      [
        currentKey,
        previousKey,
      ],
      [
        this.#limit,
        now,
        this.#windowSize,
      ],
    )) as number;

    const success = remaining >= 0;
    const reset = (currentWindow + 1) * this.#windowSize;

    return {
      remaining,
      success,
      reset,
    };
  }

  clear() {
    return this.#redis.del(`${this.#prefix}:${this.#email}:*`);
  }
}

/**
 * construct a new model rate limiter by specified prefix
 * @returns ratelimit
 */
export function keywordRateLimiterOf(
  { prefix, limit, window, ephemeralCache = undefined, redis = defaultRedis }:
    CreateKeywordRateLimiterParams,
): Ratelimit {
  return new Ratelimit({
    redis,
    prefix: `ratelimit:${prefix}`,
    limiter: Ratelimit.slidingWindow(limit, window),
    ephemeralCache,
  });
}

export type CreateKeywordRateLimiterParams = {
  prefix: string;
  limit: number;
  window: Duration;
  ephemeralCache?: Map<string, number> | undefined;
  redis?: Redis;
};

export type CreateModelRateLimiterParams = {
  email: string;
  model: string;
  redis?: Redis;
};

type ConstructModelRateLimiterParams = {
  redis?: Redis;
  email: string;
  planName: string;
  model: string;
  limit: number;
  window: Duration;
};
