export interface ErrorDetail {
  path: (string | number)[];
  message: string;
}

/** An expected failure with an HTTP status. Anything else that reaches the error handler is a 500. */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: ErrorDetail[],
  ) {
    super(message);
    this.name = "AppError";
  }

  static notFound(what = "Resource") {
    return new AppError(404, "NOT_FOUND", `${what} not found`);
  }

  static badRequest(message: string, details?: ErrorDetail[]) {
    return new AppError(400, "BAD_REQUEST", message, details);
  }

  static validation(details: ErrorDetail[], message = "Some fields are invalid") {
    return new AppError(400, "VALIDATION_ERROR", message, details);
  }
}
