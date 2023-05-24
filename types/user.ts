import { ExportFormatV4 } from "./export";
import { PluginID } from "./plugin";

export interface User {
  id: string;
  email: string;
  name: string;
  plan: SubscriptionPlan;
  token: string;
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

export interface CreditUsage {
  [PluginID.GPT4]: {
    remainingCredits: number;
  }
  [PluginID.IMAGE_GEN]: {
    remainingCredits: number;
  }
}