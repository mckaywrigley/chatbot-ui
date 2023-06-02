import { RegisterCode, registerCode, RegisterCodeType } from "../types";
import { AbstractDataAccessLayer } from "./abstract";

export class RegisterCodeDAL extends AbstractDataAccessLayer<RegisterCode> {
  readonly schema = registerCode;
  readonly namespace = `register:code:`;

  protected async doCreate(id: string, data: string): Promise<void> {
    await this.redis.set(this.getKey(id), data);
  }

  async read(id: string): Promise<string | null> {
    return (await this.redis.get<number>(this.getKey(id)))?.toString() ?? null;
  }

  protected doUpdate(id: string, data: string): Promise<void> {
    return this.doCreate(id, data);
  }

  async delete(id: string): Promise<boolean> {
    return await this.redis.del(this.getKey(id)) > 0;
  }

  async exists(id: string): Promise<boolean> {
    return (await this.redis.exists(this.getKey(id))) > 0;
  }

  async setExpire(id: string, seconds: number): Promise<void> {
    await this.redis.expire(this.getKey(id), seconds);
  }

  async getExpire(id: string): Promise<number> {
    return await this.redis.ttl(this.getKey(id));
  }
}
