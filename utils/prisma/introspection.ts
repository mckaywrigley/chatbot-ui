/** `prisma db pull` (Introspection Engine) Error Codes `P4XXX` */
export const PrismaIntrospectionError = {
  /**
   * Introspection operation failed to produce a schema file: `{introspection_error}`
   */
  FailedProducingSchemaFile: 'P4000',

  /**
   * The introspected database was empty.
   */
  EmptyDatabase: 'P4001',

  /**
   * The schema of the introspected database was inconsistent: {explanation}
   */
  InconsistentSchema: 'P4002',
} as const

export type PrismaIntrospectionError = typeof PrismaIntrospectionError
