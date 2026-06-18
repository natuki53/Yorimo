export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export const badRequest = (message = "入力内容が正しくありません") =>
  new AppError(400, "BAD_REQUEST", message);

export const unauthorized = (message = "認証が必要です") =>
  new AppError(401, "UNAUTHORIZED", message);

export const forbidden = (message = "この操作は許可されていません") =>
  new AppError(403, "FORBIDDEN", message);

export const notFound = (message = "対象が見つかりません") =>
  new AppError(404, "NOT_FOUND", message);

export const conflict = (message = "既に存在しています") =>
  new AppError(409, "CONFLICT", message);
