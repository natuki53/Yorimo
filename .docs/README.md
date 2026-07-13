# Yorimo 技術ドキュメント

この `.docs` ディレクトリは、Yorimo の現在のバックエンド実装をもとに、システム全体像、API契約、データ構造、処理フロー、安全設計、今後の拡張方針を整理するための技術ドキュメントです。

このリポジトリは現時点では Express / Prisma / PostgreSQL によるバックエンドAPI実装です。フロントエンド実装、外部地図API連携、画像アップロード基盤、フォロー機能、AI推薦は未実装のため、該当箇所では「未実装」または「今後の想定」と明記しています。

## ドキュメント一覧

| ファイル | 内容 |
| --- | --- |
| [01-system-overview.md](./01-system-overview.md) | アプリ目的、主要機能、全体構成 |
| [02-architecture.md](./02-architecture.md) | 技術スタック、レイヤー構成、責務分担 |
| [03-data-flow.md](./03-data-flow.md) | 登録、ログイン、推薦、投稿、フィードなどのデータフロー |
| [04-database-er-diagram.md](./04-database-er-diagram.md) | Prisma schemaに基づくDB設計とER図 |
| [05-api-flow.md](./05-api-flow.md) | API一覧、認証要否、共通レスポンス、呼び出しルール |
| [06-auth-flow.md](./06-auth-flow.md) | 認証、JWT、認可、auth middleware |
| [07-recommendation-flow.md](./07-recommendation-flow.md) | 寄り道推薦ロジック、スコアリング、将来AI化方針 |
| [08-posting-sns-flow.md](./08-posting-sns-flow.md) | 投稿、ストーリー、フィード、mediaUrl、visibility |
| [09-class-and-module-diagram.md](./09-class-and-module-diagram.md) | routes/controllers/services/middlewares/utilsのモジュール関係 |
| [10-frontend-backend-contract.md](./10-frontend-backend-contract.md) | フロントエンド接続用API契約とTypeScript型 |
| [11-security-and-privacy.md](./11-security-and-privacy.md) | セキュリティ、プライバシー、未成年配慮 |
| [12-future-extension.md](./12-future-extension.md) | Google Maps、AI推薦、メディア基盤、管理機能などの拡張案 |
| [13-home-server-deployment.md](./13-home-server-deployment.md) | 自宅サーバー、Docker Compose、Cloudflare Tunnel、公開・停止手順 |

## 推奨の読む順番

1. [01-system-overview.md](./01-system-overview.md)
2. [02-architecture.md](./02-architecture.md)
3. [04-database-er-diagram.md](./04-database-er-diagram.md)
4. [05-api-flow.md](./05-api-flow.md)
5. [07-recommendation-flow.md](./07-recommendation-flow.md)
6. 必要に応じて各詳細ドキュメント

## フロントエンド担当者向け

最初に読むべきファイル:

- [10-frontend-backend-contract.md](./10-frontend-backend-contract.md)
- [05-api-flow.md](./05-api-flow.md)
- [06-auth-flow.md](./06-auth-flow.md)
- [08-posting-sns-flow.md](./08-posting-sns-flow.md)

API接続では、全レスポンスが `success` を持つこと、認証API以外の多くが `Authorization: Bearer <token>` を要求すること、投稿の `followers` は現時点でフォロー関係未実装のため本人以外には表示されないことに注意してください。

## バックエンド担当者向け

最初に読むべきファイル:

- [02-architecture.md](./02-architecture.md)
- [04-database-er-diagram.md](./04-database-er-diagram.md)
- [05-api-flow.md](./05-api-flow.md)
- [07-recommendation-flow.md](./07-recommendation-flow.md)
- [11-security-and-privacy.md](./11-security-and-privacy.md)

現在は一部の業務ロジックが controllers に直接置かれています。今後の拡張では `routeService`、`spotService`、`postService` などを切り出す余地があります。

## 発表・審査員向け

Yorimoの独自性を説明する場合は、以下を中心に読むと全体像を把握しやすいです。

- [01-system-overview.md](./01-system-overview.md)
- [03-data-flow.md](./03-data-flow.md)
- [07-recommendation-flow.md](./07-recommendation-flow.md)
- [08-posting-sns-flow.md](./08-posting-sns-flow.md)
- [12-future-extension.md](./12-future-extension.md)

発表では「通学・通勤などの日常ルート」「現在地・空き時間・予算・気分」「地図上のSNS投稿」が推薦と投稿体験につながる点を強調できます。
