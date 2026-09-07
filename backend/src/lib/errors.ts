// Typed application error carrying an HTTP status code and a stable error key.
export class AppError extends Error {
  status: number;
  error: string;

  constructor(status: number, error: string, message: string) {
    super(message);
    this.status = status;
    this.error = error;
  }
}

export const notFound = (message = 'Resource not found') =>
  new AppError(404, 'not_found', message);

export const badRequest = (message: string) =>
  new AppError(400, 'bad_request', message);

export const conflict = (message: string) =>
  new AppError(409, 'conflict', message);

export const unauthorized = (message = 'Authentication required') =>
  new AppError(401, 'unauthorized', message);
