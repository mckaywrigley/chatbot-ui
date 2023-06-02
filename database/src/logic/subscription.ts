import { PlanDAL, UserDAL } from '../dal';
import { Plan, Subscription } from '../types';

export class SubscriptionLogic {
  constructor(
    private readonly userDAL = new UserDAL(),
    private readonly planDAL = new PlanDAL()
  ) {}

  /**
   * @returns the plan of the user, or "free" if the user does not exist
   */
  async getPlanOf(email: string): Promise<string> {
    return (await this.userDAL.readPlan(email)) ?? 'free';
  }

  /**
   * @returns true if subscription was appended, false if the user does not exist
   */
  append(email: string, sub: Subscription): Promise<boolean> {
    return this.userDAL.appendSubscription(email, sub);
  }

  /**
   *
   */
  listUserSubscriptions(email: string) {
    return this.userDAL.readSubscriptions(email);
  }

  /**
   * @returns plans
   */
  listPlans(): Promise<Record<string, Plan | null>> {
    return this.planDAL.listPlans();
  }
}
