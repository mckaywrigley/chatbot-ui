import { z } from "zod";

// key: auditLog:${id}
export const auditLog = z.object({
  timestamp: z.number(),
  ip: z.string(),
  userEmail: z.string(),
});
export type AuditLog = z.infer<typeof auditLog>;

// key: auditLog:payment:${tradeOrderId}
export const paymentAuditLog = auditLog.extend({
  cents: z.number(),
  appid: z.string(),
  transactionId: z.string(),
  openOrderId: z.string(),
});
export type PaymentAuditLog = z.infer<typeof paymentAuditLog>;
