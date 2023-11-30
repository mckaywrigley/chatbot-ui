import { Message } from "./chat";

export interface Thread {
  id: string;
  messages: Message[];
}

export enum RunStatus {
  Queued = "queued",
  InProgress = "in_progress",
  RequiresAction = "requires_action",
  Cancelling = "cancelling",
  Cancelled = "cancelled",
  Failed = "failed",
  Completed = "completed",
  Expired = "expired",
}

export interface RequiredAction {
  type: string;
  submit_tool_outputs: object;
}

export interface Run {
  id: string;
  assistant_id: string;
  thread_id: string;
  status: RunStatus;
  required_action: RequiredAction;
}

export interface Assistant {
  id: string;
  name: string;
  model: string;
  instructions: string;
  description?: string;
  tools: any[];
  file_ids: string[];
}