import { Plan, plan } from '../types';
import { AbstractDataAccessLayer } from './abstract';

export class PlanDAL extends AbstractDataAccessLayer<Plan> {
  schema = plan;
  namespace: `${string}:` = 'plan:';

  async doCreate(name: string, data: Plan) {
    await this.redis.json.set(this.getKey(name), '$', data);
  }

  async read(name: string): Promise<Plan | null> {
    return (await this.redis.json.get(this.getKey(name), '$'))?.[0] ?? null;
  }

  protected doUpdate(name: string, data: Partial<Plan>) {
    return this.doJSONUpdate(name, data);
  }

  async listPlans(): Promise<Record<string, Plan>> {
    const keys = await this.redis.keys(`${this.namespace}*`);
    const values = await this.listJSONValuesOfKeys(keys);
    return Object.fromEntries(keys.map((k, i) => [k, values[i]!]));
  }

  readProperty<K extends keyof Plan>(id: string, property: K) {
    return this.readJSONProperty(id, property);
  }

  listValuesOfKeys(...keys: string[]) {
    return this.listJSONValuesOfKeys(keys);
  }
}
