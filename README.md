# Yorimo Backend

Yorimo は「寄り道マッピングSNS」のバックエンドMVPです。

Node.js、TypeScript、Express、Prisma、PostgreSQL、JWT認証、Zodバリデーション、Swagger UI、Vitestで構成されています。

## 必要環境

- Node.js 20+
- Docker / Docker Compose
- npm

## セットアップ

```bash
npm install
cp .env.example .env
npm run db:up
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run prisma:seed
npm run dev
```

APIサーバー:

- ベースURL: `http://localhost:4000`
- ヘルスチェック: `http://localhost:4000/health`
- Swagger UI: `http://localhost:4000/api-docs`
- OpenAPI JSON: `http://localhost:4000/openapi.json`

## ドキュメント

- API実行例: [docs/api.md](./docs/api.md)
- 技術ドキュメント: [.docs/README.md](./.docs/README.md)

シードユーザー:

- Email: `demo@yorimo.local`
- Password: `password123`

## npm scripts

```bash
npm run dev
npm run build
npm test
npm run db:up
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run prisma:seed
```

## APIレスポンス形式

成功時:

```json
{
  "success": true,
  "data": {}
}
```

エラー時:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力内容が正しくありません"
  }
}
```

## 主なAPI

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `PATCH /api/auth/me`
- `GET /api/routes`
- `POST /api/routes`
- `GET /api/routes/:id`
- `PATCH /api/routes/:id`
- `DELETE /api/routes/:id`
- `GET /api/spots`
- `GET /api/spots/:id`
- `POST /api/spots`
- `PATCH /api/spots/:id`
- `DELETE /api/spots/:id`
- `POST /api/recommendations`
- `GET /api/posts`
- `POST /api/posts`
- `GET /api/posts/:id`
- `PATCH /api/posts/:id`
- `DELETE /api/posts/:id`
- `GET /api/spots/:id/posts`
- `GET /api/feed`
- `POST /api/feedback`
- `GET /api/saved-spots`
- `POST /api/saved-spots`
- `DELETE /api/saved-spots/:spotId`
- `POST /api/reports`
- `POST /api/blocks`
- `DELETE /api/blocks/:blockedUserId`

アーキテクチャ、データフロー、API契約、DB図は [.docs/README.md](./.docs/README.md) から確認できます。
