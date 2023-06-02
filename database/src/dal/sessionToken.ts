import { AbstractDataAccessLayer } from "./abstract";
import { SessionToken, sessionToken } from "../types";

export class SessionTokenDAL extends AbstractDataAccessLayer<SessionToken> {
  readonly schema = sessionToken;
  readonly namespace = "sessionToken:";

  protected async doCreate(token: string, data: SessionToken): Promise<void> {
    await this.redis.hmset(this.getKey(token), data);
    await this.redis.expire(this.getKey(token), 24 * 60 * 60);
  }

  async read(token: string): Promise<SessionToken | null> {
    return await this.redis.hgetall<SessionToken>(this.getKey(token));
  }

  protected async doUpdate(token: string, data: Partial<SessionToken>) {
    await this.redis.hmset(this.getKey(token), data);
  }

  async setExpiration(token: string, seconds: number) {
    await this.redis.expire(this.getKey(token), seconds);
  }
}
