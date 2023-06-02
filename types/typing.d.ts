import { Role, Plan } from "database";

export enum ResponseStatus {
  Success,
  Failed,
  tooFast,
  invalidCode,
  notExist,
  alreadyExisted,
  contentBlock,
  wrongPassword,
  unknownError,
}

export enum ReturnStatus {
  SUCCESS,
  FAILED,
  TOO_FAST,
  WRONG_CODE,
}

export enum MiddlewareStatus {
  AuthSuccess,
  AuthFailed,
  RateLimit,
}

export interface RegisterResponse {
  status: ResponseStatus;
  sessionToken?: any;
}

export interface InfoResponse {
  status: ResponseStatus;
  email: string;
  role: Role;
  plan: Plan;
  inviteCode?: string;
  chances?: number;
  resetChances: number;
}
