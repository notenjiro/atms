import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AppError } from "@/lib/errors";
import { serverError, validationFail } from "@/lib/respond";

type AsyncRouteHandler<TArgs extends unknown[] = []> = (...args: TArgs) => Promise<Response>;

export function withApiHandler<TArgs extends unknown[] = []>(
  handler: AsyncRouteHandler<TArgs>,
): AsyncRouteHandler<TArgs> {
  return async (...args: TArgs): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof ZodError) {
        return validationFail(error.flatten().fieldErrors);
      }

      if (error instanceof AppError) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: error.code,
              message: error.message,
              details: error.details,
            },
          },
          {
            status: error.status,
          },
        );
      }

      console.error("Unhandled API error:", error);
      return serverError();
    }
  };
}