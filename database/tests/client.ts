import { Redis } from "@upstash/redis";
import { InvitationCodeDAL, UserDAL } from "../src";

export const testRedis = new Redis({
  url: "***REMOVED***",
  token:
    "***REMOVED***",
});

export const testUserDAL = new UserDAL(testRedis);
export const testInvitationCodeDAL = new InvitationCodeDAL(testRedis);
