import { AbstractDataAccessLayer } from "./abstract";
import { Order, order, OrderStatus } from "../types";

export class OrderDAL extends AbstractDataAccessLayer<Order> {
  readonly schema = order;
  readonly namespace = "order:";

  getNextId(): string {
    const timestamp: string = new Date().getTime().toString();
    const randomDigits: string = (Math.random() * 1e6)
      .toFixed(0)
      .padStart(6, "0");
    return `${timestamp}${randomDigits}`;
  }

  protected async doCreate(id: string, data: Order): Promise<void> {
    await this.redis.json.set(this.getKey(id), "$", data);
  }

  async read(orderId: string): Promise<Order | null> {
    return (await this.redis.json.get(this.getKey(orderId), "$"))?.[0] ?? null;
  }

  async readStatus(orderId: string): Promise<OrderStatus | null> {
    return (
      (await this.redis.json.get(this.getKey(orderId), "$.status"))?.[0] ?? null
    );
  }

  protected async doUpdate(
    orderId: string,
    data: Partial<Order>,
  ): Promise<void> {
    await this.redis.json.set(
      this.getKey(orderId),
      "$.status",
      JSON.stringify(data.status),
    );
  }

  listEmailsOfKeys(keys: string[]) {
    return this.listJSONPropertiesOfKeys(keys, "email");
  }

  listValuesOfKeys(...keys: string[]) {
    return this.listJSONValuesOfKeys(keys);
  }
}
