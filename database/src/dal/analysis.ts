import { defaultRedis } from '../redis';
import { Order, User } from '../types';

const countKeysScript = `
local pattern = ARGV[1]
local cursor = "0"
local count = 0

repeat
    local result = redis.call('SCAN', cursor, 'MATCH', pattern, "COUNT", 1000)
    cursor = result[1]
    count = count + #result[2]
until cursor == "0"

return count
`;

const getJSONValuesScript = `
local pattern = ARGV[1]
local path = ARGV[2] or "$"
local cursor = "0"
local keys = {}

repeat
    local result = redis.call('SCAN', cursor, 'MATCH', pattern, "COUNT", 1000)
    cursor = result[1]
    for i, key in ipairs(result[2]) do
        keys[#keys + 1] = key
    end
until cursor == "0"

if #keys > 0 then
    local args = {}
    for i, key in ipairs(keys) do
        args[#args + 1] = key
    end
    args[#args + 1] = path
    return redis.call('JSON.MGET', unpack(args))
else
    return {}
end
`;

export class AnalysisDAL {
  constructor(private readonly redis = defaultRedis) {}

  /**
   * Count the total number of users.
   */
  countTotalUsers(): Promise<number> {
    return this.redis.eval(countKeysScript, [], ['user:*']);
  }

  /**
   * Count the total number of orders.
   */
  countTotalOrders(): Promise<number> {
    return this.redis.eval(countKeysScript, [], ['order:*']);
  }

  /**
   * Get the values of all users.
   */
  getUserValues(): Promise<[User][]> {
    return this.redis.eval(getJSONValuesScript, [], ['user:*']);
  }

  /**
   * Get the values of all orders.
   */
  getOrderValues(): Promise<[Order][]> {
    return this.redis.eval(getJSONValuesScript, [], ['order:*']);
  }

  /**
   * Get the specified key from the user.
   */
  getUsersPropertyValues<K extends keyof User>(
    property: K
  ): Promise<[User[K]][]> {
    return this.redis.eval(
      getJSONValuesScript,
      [],
      ['user:*', '$.' + property]
    );
  }

  /**
   * Get the specified key from the order.
   * @param property
   */
  getOrdersPropertyValues<K extends keyof Order>(
    property: K
  ): Promise<[Order[K]][]> {
    return this.redis.eval(
      getJSONValuesScript,
      [],
      ['order:*', '$.' + property]
    );
  }
}
