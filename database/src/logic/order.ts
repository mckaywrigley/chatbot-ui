import { InvitationCodeDAL, OrderDAL, UserDAL } from "../dal";
import { Order, OrderStatus } from "../types";

export class OrderLogic {
  constructor(
    private readonly invitationCodeDAL = new InvitationCodeDAL(),
    private readonly orderDAL = new OrderDAL(),
    private readonly userDAL = new UserDAL(),
  ) {}

  /**
   * create a new order and append to invitationCode if the user is newly created (in 7 days)
   */
  async newOrder(newOrder: Order): Promise<string | null> {
    const id = this.orderDAL.getNextId();
    const isSuccess = await this.orderDAL.create(id, newOrder);

    if (!isSuccess) return null;

    const inviterCode = await this.userDAL.readProperty(
      newOrder.email,
      "inviterCode",
    );

    if (!inviterCode) return id;

    const createdAt = await this.userDAL.readProperty(
      newOrder.email,
      "createdAt",
    );

    if (!createdAt) return id;
    if (Date.now() - createdAt > 7 * 24 * 60 * 60 * 1000) return id;

    await this.invitationCodeDAL.appendValidOrder(inviterCode, id);

    return id;
  }

  async getOrder(orderId: string): Promise<Order | null> {
    return await this.orderDAL.read(orderId);
  }

  async checkStatus(orderId: string): Promise<OrderStatus | null> {
    return await this.orderDAL.readStatus(orderId);
  }

  async updateStatus(
    orderId: string,
    newStatus: OrderStatus,
  ): Promise<boolean> {
    return await this.orderDAL.update(orderId, { status: newStatus });
  }

  async listAllPaidEmails(): Promise<string[]> {
    let cursor = 0;
    const keys: string[] = [];

    do {
      const [nextCursor, nextKeys] = await this.orderDAL.listKeys(cursor);
      cursor = nextCursor;
      keys.push(...nextKeys);
    } while (cursor !== 0);

    const emails = await this.orderDAL.listEmailsOfKeys(keys);
    return [...new Set(emails)];
  }
}
