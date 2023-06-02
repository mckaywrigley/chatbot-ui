import { defaultRedis } from '../redis';

export class NoticeDAL {
  private readonly namespace = 'notice';

  constructor(private readonly redis = defaultRedis) {}

  async setNotice(data: string): Promise<void> {
    await this.redis.set('notice', data);
  }

  async getNotice(): Promise<string | null> {
    return this.redis.get('notice');
  }
}
