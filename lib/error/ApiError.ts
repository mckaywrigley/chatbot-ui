export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message) // Call the constructor of the base Error class with the message.
    this.name = "ApiError" // Set the error name to "ApiError".
    this.status = status // Set the custom status property.
  }
}
