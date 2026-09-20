import { describe, expect, it } from "vitest";

import { AppError, toApiError } from "./error-handler.js";

describe("toApiError", () => {
  it("maps AppError to an ApiError body with the given code and status", () => {
    const err = new AppError("not_found", "Job not found", 404);

    expect(toApiError(err)).toEqual({
      status: 404,
      body: {
        error: {
          code: "not_found",
          message: "Job not found",
        },
      },
    });
  });

  it("maps unknown errors to a generic 500 ApiError without leaking internals", () => {
    expect(toApiError(new Error("secret stack detail"))).toEqual({
      status: 500,
      body: {
        error: {
          code: "internal_error",
          message: "Internal server error",
        },
      },
    });
  });

  it("includes details when AppError carries them", () => {
    const err = new AppError("validation_error", "Invalid query", 400, {
      field: "limit",
    });

    expect(toApiError(err).body.error.details).toEqual({ field: "limit" });
  });
});
