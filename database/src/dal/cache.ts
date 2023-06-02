import { defaultRedis } from "../redis";

export class CacheDAL<T> {
  constructor(
    private readonly id: string,
    private readonly redis = defaultRedis,
  ) {}

  get key() {
    return `cache:${this.id}`;
  }

  async cacheValue(value: T, expiry?: number) {
    await this.redis.set(this.key, JSON.stringify(value));

    if (typeof expiry === "number") {
      await this.redis.expire(this.key, expiry);
    }
  }

  async getCacheExpiry(): Promise<number | null> {
    return this.redis.ttl(this.key);
  }

  async getCachedValue(): Promise<T | null> {
    const value = await this.redis.get<T>(this.key);
    if (typeof value === "string") return JSON.parse(value);
    return value;
  }

  async clearCache(): Promise<boolean> {
    return (await this.redis.del(this.key)) > 0;
  }
}
