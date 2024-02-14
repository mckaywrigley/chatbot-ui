// Result type utility that is friendly to server actions.

export type PlainError = { message: string }

export type ResultOk<T> = { type: "ok"; value: T }
export type ResultError<E extends PlainError> = { type: "error"; error: E }
export type ResultBase<T, E extends PlainError> = ResultOk<T> | ResultError<E>
export type Result<T> = ResultBase<T, PlainError>

export function ok<T>(value: T): ResultOk<T> {
  return { type: "ok", value }
}
export function err<E extends PlainError>(error: E): ResultError<E> {
  return { type: "error", error }
}
export function errStr(error: string): ResultError<PlainError> {
  return { type: "error", error: { message: error } }
}
