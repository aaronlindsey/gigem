export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly expose = true,
  ) {
    super(message);
  }
}

export class ValidationError extends HttpError {
  constructor(message: string) {
    super(400, message);
  }
}
