import { APIKeyPoolDAL } from "../dal";

export class APIKeyPoolLogic {
  constructor(private readonly dal = new APIKeyPoolDAL()) {}

  async getOneKey(): Promise<string | null> {
    const key = await this.dal.shift();
    if (key) {
      await this.dal.push(key);
      return key;
    }
    return null;
  }
}
