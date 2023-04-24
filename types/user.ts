import { ExportFormatV4 } from "./export";

export interface User {
  id: string;
  email: string;
  name: string;
  plan: SubscriptionPlan;
}

export type SubscriptionPlan = 'free' | 'pro';

export interface UserConversation {
  id: string;
  uid: string;
  conversations: ExportFormatV4
}

export interface UserProfile {
  id: string;
  plan: "free" | "pro";
  name: string;
}
