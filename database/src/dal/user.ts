import { AbstractDataAccessLayer } from './abstract';
import { Subscription, subscription, User, user } from '../types';

export class UserDAL extends AbstractDataAccessLayer<User> {
  readonly schema = user;
  readonly namespace = 'user:';

  protected async doCreate(email: string, data: User): Promise<void> {
    await this.redis.json.set(this.getKey(email), '$', data);
  }

  async read(email: string): Promise<User | null> {
    return (await this.redis.json.get(this.getKey(email), '$'))?.[0] ?? null;
  }

  readPassword(email: string): Promise<User['passwordHash'] | null> {
    return this.readProperty(email, 'passwordHash');
  }

  readRole(email: string): Promise<User['role'] | null> {
    return this.readProperty(email, 'role');
  }

  readSubscriptions(email: string): Promise<User['subscriptions'] | null> {
    return this.readProperty(email, 'subscriptions');
  }

  async readPlan(email: string): Promise<string | null> {
    return (
      (
        await this.redis.json.get(
          this.getKey(email),
          '$.subscriptions[-1].plan'
        )
      )?.[0] ?? null
    );
  }

  readInvitationCodes(email: string): Promise<User['invitationCodes'] | null> {
    return this.readProperty(email, 'invitationCodes');
  }

  readResetChances(email: string): Promise<User['resetChances'] | null> {
    return this.readProperty(email, 'resetChances');
  }

  /**
   * Operations to increase or decrease the resetChances of users.
   * @param email
   * @param value 1 or -1 generally speaking.
   */
  async incrResetChances(email: string, value: number): Promise<number | null> {
    return (
      (
        await this.redis.json.numincrby(
          this.getKey(email),
          '$.resetChances',
          value
        )
      )?.[0] ?? null
    );
  }

  async appendSubscription(email: string, sub: Subscription): Promise<boolean> {
    return (
      await this.redis.json.arrappend(
        this.getKey(email),
        '$.subscriptions',
        await subscription.parseAsync(sub)
      )
    ).every(Boolean);
  }

  async appendInvitationCode(email: string, code: string): Promise<void> {
    await this.redis.json.arrappend(
      this.getKey(email),
      '$.invitationCodes',
      JSON.stringify(code)
    );
  }

  protected doUpdate(email: string, data: Partial<User>) {
    return this.doJSONUpdate(email, data);
  }

  readProperty<K extends keyof User>(id: string, property: K) {
    return this.readJSONProperty(id, property);
  }

  listValuesOfKeys(...keys: string[]) {
    return this.listJSONValuesOfKeys(keys);
  }
}
