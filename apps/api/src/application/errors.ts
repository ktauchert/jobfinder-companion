export class NotFoundError extends Error {
  readonly code = "not_found";

  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends Error {
  readonly code = "conflict";

  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}
