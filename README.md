# Yorimo Backend

## 公開プロトタイプモード

`DEMO_MODE=true` では、フロントの「デモを始める」ボタンから固定ユーザーへ1クリックでログインします。メールアドレスやパスワードは公開せず、ログインごとに独立した8時間のJWTを発行します。保存、口コミ、追加ルートは同じデモユーザーを利用する参加者間で共有されます。公開デモ中も通常のログイン・新規登録を併用でき、個人アカウントのデータは共有デモユーザーとは分離されます。

```bash
npm run db:up
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
npm run frontend:dev
```

Google Maps / Placesのキーは任意です。未設定または接続失敗時は、同梱した東京周辺のスポット、駅候補、簡易地図を使用します。

共有データを基準状態へ戻す場合だけ、専用DBで次を実行します。公開APIからのリセットはできません。

```bash
DEMO_MODE=true ALLOW_DEMO_RESET=true npm run demo:reset -- --confirm
```

公開配布はルートの`Dockerfile`を使用します。コンテナはマイグレーションを適用後、Express APIとReactアプリを同じURLで配信します。必須環境変数は`DATABASE_URL`、十分に長い`JWT_SECRET`、`DEMO_MODE=true`です。

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

現在地周辺の実店舗と駅検索を使う場合は、ルートの `.env` に `GOOGLE_MAPS_SERVER_API_KEY` を設定してください。このキーは Places API (New) を許可し、サーバー/IP制限で運用します。フロントの地図表示用キー `VITE_GOOGLE_MAPS_API_KEY` とは別に扱います。未設定でも固定データでデモを継続できます。

## ドキュメント

- API実行例: [docs/api.md](./docs/api.md)
- 技術ドキュメント: [.docs/README.md](./.docs/README.md)

`npm run prisma:seed` は固定デモユーザー、基準ルート、8スポット、fixture投稿者と投稿を冪等に作成します。固定ユーザーのパスワードログインは公開せず、固定ユーザーには `POST /api/auth/demo` を利用します。通常ユーザーは `POST /api/auth/login` と `POST /api/auth/register` をデモモード中も利用できます。

## npm scripts

```bash
npm run dev
npm run build
npm test
npm run db:up
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run prisma:seed
npm run demo:reset -- --confirm
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

- `POST /api/auth/demo`（デモモード）
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
