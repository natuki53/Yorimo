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

export const demoDataLocked = (message = "共有デモの基準データは変更できません") =>
  new AppError(403, "DEMO_DATA_LOCKED", message);

export const demoCapReached = (message = "共有デモの保存上限に達しました") =>
  new AppError(409, "DEMO_CAP_REACHED", message);

export const prototypeRestriction = (message = "公開デモではこの操作を利用できません") =>
  new AppError(400, "PROTOTYPE_RESTRICTION", message);

export const demoNotReady = (message = "デモ環境を準備しています。しばらくしてから再試行してください") =>
  new AppError(503, "DEMO_NOT_READY", message);
