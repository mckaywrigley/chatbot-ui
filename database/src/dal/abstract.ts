import { ZodSchema } from "zod";
import { DataAccessLayer } from "./interfaces";
import { defaultRedis } from "../redis";
import { Redis } from "@upstash/redis";

/**
 * Abstract class for data access layer
 *
 * This class provides the following:
 * 1. simplify the creation logic by ensuring existence and validation
 * 2. simplify the update logic by ensuring existence
 * 3. provide a default implementation for listKeys
 * 4. provide a helper fn for getKey
 */
export abstract class AbstractDataAccessLayer<T> implements DataAccessLayer<T> {
  protected readonly redis: Redis;
  constructor(
    redis: Redis | AbstractDataAccessLayer<unknown> = defaultRedis,
  ) {
    if (redis instanceof AbstractDataAccessLayer) {
      this.redis = redis.redis;
    } else {
      this.redis = redis;
    }
  }

  abstract readonly schema: ZodSchema<T>;
  abstract readonly namespace: `${string}:`;

  protected abstract doCreate(id: string, data: T): Promise<void>;

  /**
   * this methods simplifies the creation logic by ensuring existence and validation
   */
  async create(id: string, data: T): Promise<boolean> {
    if (await this.exists(id)) return false;
    await this.doCreate(id, await this.schema.parseAsync(data));
    return true;
  }

  abstract read(id: string): Promise<T | null>;

  protected abstract doUpdate(id: string, data: Partial<T>): Promise<void>;

  protected async doJSONUpdate(
    id: string,
    data: Partial<T>,
  ): Promise<void> {
    await Object.entries(data).reduce(
      (pipe, [key, value]) =>
        pipe.json.set(this.getKey(id), `$.${key}`, JSON.stringify(value)),
      this.redis.pipeline(),
    ).exec();
  }

  /**
   * this methods simplifies the update logic by ensuring existence
   */
  async update(id: string, data: Partial<T>): Promise<boolean> {
    if (!await this.exists(id)) return false;
    await this.doUpdate(id, data);
    return true;
  }

  async delete(id: string): Promise<boolean> {
    return await this.redis.del(this.getKey(id)) > 0;
  }

  async exists(id: string): Promise<boolean> {
    return (await this.redis.exists(this.getKey(id))) > 0;
  }

  async listKeys(cursor = 0, count = 500): Promise<[number, string[]]> {
    const [newCursor, keys] = await this.redis.scan(cursor, {
      match: `${this.namespace}*`,
      count,
    });

    return [Number(newCursor), keys];
  }

  async scanKeys(
    idPattern: string,
    cursor = 0,
    count = 500,
  ): Promise<[number, string[]]> {
    const [newCursor, keys] = await this.redis.scan(cursor, {
      match: `${this.namespace}*${idPattern}*`,
      count,
    });

    return [Number(newCursor), keys];
  }

  protected async listJSONValuesOfKeys(
    keys: string[],
  ): Promise<Array<T | null>> {
    const values: [T][] = await this.redis.json.mget(keys, "$");
    return values.map((v) => v?.[0] ?? null);
  }

  protected getKey(id: string): string {
    return `${this.namespace}${id}`;
  }

  protected async readJSONProperty<K extends (keyof T) & string>(
    id: string,
    property: K,
  ): Promise<Exclude<T[K], undefined> | null> {
    return (await this.redis.json.get(this.getKey(id), `$.${property}`))
      ?.[0] ?? null;
  }

  protected async listJSONPropertiesOfKeys<K extends (keyof T) & string>(
    keys: string[],
    property: K,
  ): Promise<(T[K])[]> {
    const values: [T[K]][] = await this.redis.json.mget(keys, `$.${property}`);
    return values.map(([v]) => v);
  }

  countKeys(): Promise<number> {
    const script =
      "local cursor = '0'; local count = 0; repeat local result = redis.call('SCAN', cursor, 'MATCH', KEYS[1], 'COUNT', 65535); cursor = result[1]; count = count + #result[2]; until cursor == '0'; return count";
    return this.redis.eval(script, [`${this.namespace}*`], []);
  }
}
