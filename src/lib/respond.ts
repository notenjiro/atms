import { NextResponse } from "next/server";

import type { AppErrorShape, OperationResult } from "@/types/common";

export function ok<T>(data?: T, message = "OK", status = 200): NextResponse {
  const payload: OperationResult<T> = {
    success: true,
    message,
    data,
  };

  return NextResponse.json(payload, { status });
}

export function fail(
  code: string,
  message: string,
  status = 400,
  details?: AppErrorShape["details"],
): NextResponse {
  const payload: {
    success: false;
    error: AppErrorShape;
  } = {
    success: false,
    error: {
      code,
      message,
      details,
    },
  };

  return NextResponse.json(payload, { status });
}

export function validationFail(details?: AppErrorShape["details"]): NextResponse {
  return fail("VALIDATION_ERROR", "The request payload is invalid.", 422, details);
}

export function unauthorized(message = "You are not authorized to perform this action."): NextResponse {
  return fail("UNAUTHORIZED", message, 401);
}

export function forbidden(message = "You do not have permission to access this resource."): NextResponse {
  return fail("FORBIDDEN", message, 403);
}

export function notFound(message = "The requested resource was not found."): NextResponse {
  return fail("NOT_FOUND", message, 404);
}

export function serverError(
  message = "An unexpected server error occurred.",
  details?: AppErrorShape["details"],
): NextResponse {
  return fail("INTERNAL_SERVER_ERROR", message, 500, details);
}