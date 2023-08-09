import { PrismaCommonError } from './common'
import { PrismaQueryError } from './query'
import { PrismaMigrationError } from './migration'
import { PrismaIntrospectionError } from './introspection'
import { PrismaDataProxyError } from './data-proxy'

/** Prisma Error Codes */
export const PrismaError = {
  ...PrismaDataProxyError,
  ...PrismaIntrospectionError,
  ...PrismaMigrationError,
  ...PrismaQueryError,
  ...PrismaCommonError,
} as const

export type PrismaError = typeof PrismaError
export type PrismaErrorKey = keyof PrismaError
export type PrismaErrorGroup =
  | 'PrismaCommonError'
  | 'PrismaQueryError'
  | 'PrismaMigrationError'
  | 'PrismaIntrospectionError'
  | 'PrismaDataProxyError'
export type PrismaErrorGroupKey<
  T extends PrismaErrorGroup
> = T extends 'PrismaCommonError'
  ? keyof PrismaCommonError
  : T extends 'PrismaQueryError'
  ? keyof PrismaQueryError
  : T extends 'PrismaMigrationError'
  ? keyof PrismaMigrationError
  : T extends 'PrismaIntrospectionError'
  ? keyof PrismaIntrospectionError
  : T extends 'PrismaDataProxyError'
  ? keyof PrismaDataProxyError
  : never
