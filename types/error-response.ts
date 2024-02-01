import { z } from "zod"

export type ErrorResponse = {
  error: {
    code: number
    message: string
  }
}

export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.number({ coerce: true }).default(500),
    message: z.string().default("Internal Server Error")
  })
})
