export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code = 'ERROR',
    public details?: unknown,
  ) {
    super(message);
  }
  static badRequest(msg: string, details?: unknown) { return new AppError(400, msg, 'BAD_REQUEST', details); }
  static unauthorized(msg = 'Authentication required') { return new AppError(401, msg, 'UNAUTHORIZED'); }
  static forbidden(msg = 'Forbidden') { return new AppError(403, msg, 'FORBIDDEN'); }
  static notFound(msg = 'Not found') { return new AppError(404, msg, 'NOT_FOUND'); }
  static conflict(msg: string, details?: unknown) { return new AppError(409, msg, 'CONFLICT', details); }
}
