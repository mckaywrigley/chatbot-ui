export interface User {
  id: string;
  email: string;
  name: string;
  subscriptionPlan: SubscriptionPlan;
}

export type SubscriptionPlan = 'free' | 'pro';
