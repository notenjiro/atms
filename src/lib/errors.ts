export class AppError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: Record<string, string[] | string | undefined>;

  constructor(
    code: string,
    message: string,
    status = 400,
    details?: Record<string, string[] | string | undefined>,
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(
    message = "The request payload is invalid.",
    details?: Record<string, string[] | string | undefined>,
  ) {
    super("VALIDATION_ERROR", message, 422, details);
    this.name = "ValidationError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "You are not authorized to perform this action.") {
    super("UNAUTHORIZED", message, 401);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to access this resource.") {
    super("FORBIDDEN", message, 403);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "The requested resource was not found.") {
    super("NOT_FOUND", message, 404);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message = "The request could not be completed because of a conflict.") {
    super("CONFLICT", message, 409);
    this.name = "ConflictError";
  }
}

export class ExternalServiceError extends AppError {
  constructor(
    message = "An external service request failed.",
    details?: Record<string, string[] | string | undefined>,
  ) {
    super("EXTERNAL_SERVICE_ERROR", message, 502, details);
    this.name = "ExternalServiceError";
  }
}