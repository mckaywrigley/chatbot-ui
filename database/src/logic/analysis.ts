import { AnalysisDAL } from '../dal';
import { OrderStatus } from '../types';

export class AnalysisLogic {
  constructor(private readonly dal = new AnalysisDAL()) {}

  countUsers(): Promise<number> {
    return this.dal.countTotalUsers();
  }

  countOrders(): Promise<number> {
    return this.dal.countTotalOrders();
  }

  /**
   * Count the number of users starting from a certain day.
   * @param timestamp
   */
  async countUsersCreatedSince(timestamp: number): Promise<number> {
    const creationDates = await this.dal.getUsersPropertyValues('createdAt');
    const count = creationDates.filter(([date]) => date > timestamp).length;
    return count;
  }

  /**
   * Count the number of orders starting from a certain day.
   * @param timestamp
   */
  async countOrdersCreatedSince(timestamp: number): Promise<number> {
    const creationDates = await this.dal.getOrdersPropertyValues('createdAt');
    const count = creationDates.filter(([t]) => t > timestamp).length;
    return count;
  }

  /**
   * Count the number of orders in different states.
   * @param status
   */
  async countOrdersWhoseStatusIs(status: OrderStatus): Promise<number> {
    const orders = await this.dal.getOrdersPropertyValues('status');
    const count = orders.filter(([s]) => s === status).length;
    return count;
  }

  /** count all users who has at least one related order even if unpaid or refund */
  async countUsersHavingOrder(): Promise<number> {
    const emails = await this.dal.getOrdersPropertyValues('email');
    const count = new Set(emails.map(([email]) => email)).size;
    return count;
  }

  async countPaidUsersSince(timestamp: number): Promise<number> {
    const orders = await this.dal.getOrderValues();
    const paidEmails = orders
      .filter(([{ createdAt }]) => createdAt > timestamp)
      .filter(([{ status }]) => status === 'paid')
      .map(([{ email }]) => email);
    const count = new Set(paidEmails).size;
    return count;
  }

  async countPaidUsers(): Promise<number> {
    const orders = await this.dal.getOrderValues();
    const paidEmails = orders
      .filter(([{ status }]) => status === 'paid')
      .map(([{ email }]) => email);
    const count = new Set(paidEmails).size;
    return count;
  }

  async countPaidCountPerPlan(): Promise<Record<string, number>> {
    const orders = await this.dal.getOrderValues();
    const paidCountPerPlan = orders
      .filter(([{ status }]) => status === 'paid')
      .reduce((acc, [{ plan }]) => {
        acc[plan] ??= 0;
        acc[plan]++;
        return acc;
      }, {} as Record<string, number>);
    return paidCountPerPlan;
  }

  async countPaidCountPerPlanSince(
    timestamp: number
  ): Promise<Record<string, number>> {
    const orders = await this.dal.getOrderValues();
    const paidCountPerPlan = orders
      .filter(([{ createdAt }]) => createdAt > timestamp)
      .filter(([{ status }]) => status === 'paid')
      .reduce((acc, [{ plan }]) => {
        acc[plan] ??= 0;
        acc[plan]++;
        return acc;
      }, {} as Record<string, number>);
    return paidCountPerPlan;
  }
}
