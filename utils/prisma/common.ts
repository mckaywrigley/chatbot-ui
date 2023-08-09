/** Prisma Common Error Codes `P1XXX` */
export const PrismaCommonError = {
  /**
   * Authentication failed against database server at `{database_host}`, the provided database credentials for `{database_user}` are not valid. Please make sure to provide valid database credentials for the database server at `{database_host}`.
   */
  AuthenticationFailed: 'P1000',

  /**
   * Can't reach database server at `{database_host}`:`{database_port}` Please make sure your database server is running at `{database_host}`:`{database_port}`.
   */
  CouldNotConnectToDatabase: 'P1001',

  /**
   * The database server at `{database_host}`:`{database_port}` was reached but timed out. Please try again. Please make sure your database server is running at `{database_host}`:`{database_port}`.
   */
  ConnectionTimedOut: 'P1002',

  /**
   * Database `{database_file_name}` does not exist at `{database_file_path}`
   *
   * Database `{database_name}.{database_schema_name}` does not exist on the database server at `{database_host}:{database_port}`.
   *
   * Database `{database_name}` does not exist on the database server at `{database_host}:{database_port}`.
   */
  DatabaseFileNotFound: 'P1003',

  /**
   * Operations timed out after `{time}`
   */
  OperationsTimedOut: 'P1008',

  /**
   * Database `{database_name}` already exists on the database server at `{database_host}:{database_port}`
   */
  DatabaseAlreadyExists: 'P1009',

  /**
   * User `{database_user}` was denied access on the database `{database_name}`
   */
  AccessDeniedForUser: 'P1010',

  /**
   * Error opening a TLS connection: `{message}`
   */
  TLSConnectionError: 'P1011',

  /**
   * Note: If you get error code {@link PrismaCommonError.Error|P1012} after you upgrade Prisma to version 4.0.0 or later,
   * see the {@link https://www.prisma.io/docs/guides/upgrade-guides/upgrading-versions/upgrading-to-prisma-4#upgrade-your-prisma-schema|version 4.0.0 upgrade guide}.
   * A schema that was valid before version 4.0.0 might be invalid in version 4.0.0 and later. The upgrade guide explains how to update your schema to make it valid.
   *
   * `{full_error}`
   *
   * Possible {@link PrismaCommonError.Error|P1012} error messages:
   * - Argument `{}` is missing.
   * - Function `{}` takes `{}` arguments, but received `{}`.
   * - Argument `{}` is missing in attribute `@{}`.
   * - Argument `{}` is missing in data source block `{}`.
   * - Argument `{}` is missing in generator block `{}`.
   * - Error parsing attribute `@{}`: `{}`
   * - Attribute `@{}` is defined twice.
   * - The model with database name `{}` could not be defined because another model with this name exists: `{}`
   * - `{}` is a reserved scalar type name and can not be used.
   * - The `{}` `{}` cannot be defined because a `{}` with that name already exists.
   * - Key `{}` is already defined in `{}`.
   * - Argument `{}` is already specified as unnamed argument.
   * - Argument `{}` is already specified.
   * - No such argument.
   * - Field `{}` is already defined on model `{}`.
   * - Field `{}` in model `{}` can't be a list. The current connector does not support lists of primitive types.
   * - The index name `{}` is declared multiple times. With the current connector index names have to be globally unique.
   * - Value `{}` is already defined on enum `{}`.
   * - Attribute not known: `@{}`.
   * - Function not known: `{}`.
   * - Datasource provider not known: `{}`.
   * - `shadowDatabaseUrl` is the same as url for datasource `{}`. Please specify a different database as shadow database.
   * - The preview feature `{}` is not known. Expected one of: `{}`
   * - `{}` is not a valid value for `{}`.
   * - Type `{}` is neither a built-in type, nor refers to another model, custom type, or enum.
   * - Type `{}` is not a built-in type.
   * - Unexpected token. Expected one of: `{}`
   * - Environment variable not found: `{}`.
   * - Expected a `{}` value, but received `{}` value `{}`.
   * - Expected a `{}` value, but failed while parsing `{}`: `{}`.
   * - Error validating model `{}`: `{}`
   * - Error validating field `{}` in model `{}`: `{}`
   * - Error validating datasource `{datasource}`: `{message}`
   * - Error validating enum `{}`: `{}`
   * - Error validating: `{}`
   */
  Error: 'P1012',

  /**
   * The provided database string is invalid. `{details}`
   */
  InvalidDatabaseString: 'P1013',

  /**
   * The underlying `{kind}` for model `{model}` does not exist.
   */
  KindForModelDoesNotExist: 'P1014',

  /**
   * Your Prisma schema is using features that are not supported for the version of the database. Database version: `{database_version}`
   *
   * Errors: `{errors}`
   */
  UnsupportedFeaturesAtPrismaSchema: 'P1015',

  /**
   * Your raw query had an incorrect number of parameters. Expected: `{expected}`, actual: `{actual}`.
   */
  IncorrectNumberOfParameters: 'P1016',

  /**
   * Server has closed the connection.
   */
  ServerClosedConnection: 'P1017',
} as const

export type PrismaCommonError = typeof PrismaCommonError

/**
 * @deprecated Use {@link PrismaCommonError} instead.
 * @example
 * ```ts
 * import { PrismaCommonError } from 'prisma-error-enum'
 * ```
 */
export const CommonError = PrismaCommonError
