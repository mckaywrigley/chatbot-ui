import { z } from "zod";

export const invitationCodeType = z.enum(["club", "team", "normal"]);
export type InvitationCodeType = z.infer<typeof invitationCodeType>;

// key: invitationCode:${code}
export const invitationCode = z.object({
  type: z.string(),
  limit: z.number(),
  inviterEmail: z.string(),
  inviteeEmails: z.string().array(),
  validOrders: z.string().array().optional(),
});
export type InvitationCode = z.infer<typeof invitationCode>;

export type CreateNewInvitationCodeParams = {
  email: string;
  type: InvitationCodeType;
  code?: string;
  limit?: number;
};
