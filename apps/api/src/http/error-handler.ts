import type { NextFunction, Request, Response } from "express";
import type { ApiError } from "@jobfinder/types";
import type { Logger } from "pino";

export class AppError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    if (details !== undefined) {
      this.details = details;
    }
  }
}

export interface MappedApiError {
  status: number;
  body: ApiError;
}

export function toApiError(err: unknown): MappedApiError {
  if (err instanceof AppError) {
    const error: ApiError["error"] = {
      code: err.code,
      message: err.message,
    };
    if (err.details !== undefined) {
      error.details = err.details;
    }
    return {
      status: err.status,
      body: { error },
    };
  }

  return {
    status: 500,
    body: {
      error: {
        code: "internal_error",
        message: "Internal server error",
      },
    },
  };
}

export function createErrorHandler(logger: Logger) {
  return function errorHandler(
    err: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction,
  ): void {
    const mapped = toApiError(err);
    if (mapped.status >= 500) {
      logger.error({ err }, "Unhandled error");
    } else {
      logger.warn({ err, code: mapped.body.error.code }, "Request error");
    }
    res.status(mapped.status).json(mapped.body);
  };
}
