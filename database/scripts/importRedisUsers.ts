import { defaultRedis } from "../src/redis/client";

interface RedisUser {
  email: string;
  password_hash: string;
  created_at: number;
  last_login: number;
  subscription_level: number;
  subscription_until: number;
  is_activated: boolean;
  is_blocked: boolean;
}
