import { defaultRedis } from "../redis";

export class RequestLimitDAL {
  private readonly namespace = "limit:";

  constructor(private readonly redis = defaultRedis) {}

  async addRequestTimestamp(
    emailOrIP: string,
    timestamp: number,
  ): Promise<void> {
    await this.redis.zadd(this.getKey(emailOrIP), {
      member: timestamp,
      score: timestamp,
    });
  }

  async getRequestTimestamps(emailOrIP: string): Promise<number[]> {
    return await this.redis.zrange<number[]>(
      this.getKey(emailOrIP),
      0,
      -1,
    );
  }

  async removeExpiredTimestamps(
    emailOrIP: string,
    expiration: number,
  ): Promise<void> {
    await this.redis.zremrangebyscore(
      this.getKey(emailOrIP),
      0,
      Date.now() - expiration,
    );
  }

  async resetLimit(emailOrIP: string): Promise<void> {
    await this.redis.zremrangebyrank(this.getKey(emailOrIP), 0, -1);
  }

  private getKey(key: string): string {
    return `${this.namespace}${key}`;
  }
}
