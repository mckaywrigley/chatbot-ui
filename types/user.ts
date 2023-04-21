export interface User {
  id: string;
  email: string;
  name: string;
  plan: SubscriptionPlan;
}

export type SubscriptionPlan = 'free' | 'pro';
