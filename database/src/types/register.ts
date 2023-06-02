import { z } from "zod";

export enum RegisterReturnStatus {
  Success,
  AlreadyRegister,
  TooFast,
  UnknownError,
}
export const registerReturnStatus = z.nativeEnum(RegisterReturnStatus);

export const registerCodeType = z.enum(["email", "phone"]);
export type RegisterCodeType = z.infer<typeof registerCodeType>;

export const registerCode = z.string().regex(/^\d{6}$/);
export type RegisterCode = z.infer<typeof registerCode>;

export type CreateRegisterCodeReturnValue =
  | {
    status: RegisterReturnStatus.Success;
    code: string;
    ttl: number;
  }
  | {
    status: RegisterReturnStatus.TooFast;
    ttl: number;
  }
  | {
    status:
      | RegisterReturnStatus.AlreadyRegister
      | RegisterReturnStatus.UnknownError;
  };
