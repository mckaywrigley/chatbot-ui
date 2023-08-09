/** Prisma Data Proxy Error Codes `P5XXX` */
export const PrismaDataProxyError = {
  /**
   * This request could not be understood by the server
   */
  BadRequest: 'P5000',

  /**
   * This request must be retried
   */
  Retry: 'P5001',

  /**
   * The datasource provided is invalid:
   * - Could not parse the URL of the datasource
   * - Datasource URL must use `prisma://` protocol when `--data-proxy` is used
   * - No valid API key found
   */
  InvalidDatasource: 'P5002',

  /**
   * Requested resource does not exist
   */
  ResourceNotFound: 'P5003',

  /**
   * The feature is not yet implemented:
   * - `beforeExit` event is not yet supported
   */
  NotImplemented: 'P5004',

  /**
   * Schema needs to be uploaded
   */
  SchemaNotUploaded: 'P5005',

  /**
   * Unknown server error
   */
  UnknownServerError: 'P5006',

  /**
   * Unauthorized, check your connection string
   */
  Unauthorized: 'P5007',

  /**
   * Usage exceeded, retry again later
   */
  UsageExceeded: 'P5008',

  /**
   * Request timed out
   */
  RequestTimedOut: 'P5009',

  /**
   * Cannot fetch data from service
   */
  CannotFetchFromService: 'P5010',

  /**
   * Request parameters are invalid.
   *
   * Note
   * ----
   * You see error {@link PrismaDataProxyError.BadRequest|P5000} when the server cannot understand the request.
   *
   * In comparison, {@link PrismaDataProxyError.InvalidRequestParameters|P5011} indicates that the server understands the request but rejects it due to failed validation checks, such as parameters being out of range.
   */
  InvalidRequestParameters: 'P5011',

  /**
   * Engine version is not supported
   */
  EngineVersionNotSupported: 'P5012',

  /**
   * Engine not started: healthcheck timeout
   */
  EngineNotStarted: 'P5013',

  /**
   * Unknown engine startup error (contains message and logs)
   */
  UnknownEngineStartupError: 'P5014',

  /**
   * Interactive transaction error:
   * - Could not parse interactive transaction ID
   * - Could not find Query Engine for the specified host and transaction ID
   * - Could not start interactive transaction
   */
  InteractiveTransactionError: 'P5015',
} as const

export type PrismaDataProxyError = typeof PrismaDataProxyError
