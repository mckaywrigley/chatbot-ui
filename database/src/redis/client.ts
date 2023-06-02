import { Redis } from "@upstash/redis";

export const defaultRedis = new Redis({
  url: process.env.REDIS_URL ?? "",
  token: process.env.REDIS_TOKEN ?? "",
});
