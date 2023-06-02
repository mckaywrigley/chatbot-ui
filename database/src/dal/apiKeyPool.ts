import { defaultRedis } from "../redis";

export class APIKeyPoolDAL {
  // data type: list<string>
  readonly key = "apikey:pool";

  constructor(private readonly redis = defaultRedis) {}

  async push(value: string): Promise<void> {
    await this.redis.rpush(this.key, value);
  }

  shift(): Promise<string | null> {
    return this.redis.lpop(this.key);
  }

  at(index: number): Promise<string | null> {
    return this.redis.lindex(this.key, index);
  }

  length(): Promise<number> {
    return this.redis.llen(this.key);
  }
}
