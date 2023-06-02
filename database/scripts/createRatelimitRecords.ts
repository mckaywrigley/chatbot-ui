import { keywordRateLimiterOf, ModelRateLimiter } from "../src";
import { testRedis } from "../tests/client";

(async () => {
  const limiter = keywordRateLimiterOf({
    prefix: "test",
    limit: 10,
    window: "30s",
    redis: testRedis,
  });

  console.log(await limiter.limit("me"));
  await delay(1000);
  console.log(await limiter.limit("me"));
  await delay(1000);
  console.log(await limiter.limit("me"));
})();

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
