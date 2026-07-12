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

現在地周辺の実店舗と駅検索を使うには、ルートの `.env` に `GOOGLE_MAPS_SERVER_API_KEY` を設定してください。このキーは Places API (New) を許可し、サーバー/IP制限で運用します。フロントの地図表示用キー `VITE_GOOGLE_MAPS_API_KEY` とは別に扱います。

## ドキュメント

- API実行例: [docs/api.md](./docs/api.md)
- 技術ドキュメント: [.docs/README.md](./.docs/README.md)

`npm run prisma:seed` はログイン確認用ユーザーとルートだけを作成します。店舗データは seed せず、ログイン後の現在地を使って Google Places から取得します。

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
- `GET /api/stations?keyword=東京`
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
