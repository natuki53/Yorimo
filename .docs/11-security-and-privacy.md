# 11. Security and Privacy

Yorimoは高校生も対象に含まれる寄り道マッピングSNSです。位置情報、投稿、写真・動画、通報、ブロックを扱うため、安全設計とプライバシー設計を初期から明確にする必要があります。

## 実装済みの安全設計

| 項目 | 実装内容 |
| --- | --- |
| パスワード管理 | `bcryptjs` でcost 12のhashを保存し、平文passwordは保存しない |
| JWT認証 | `Authorization: Bearer <token>` を `requireAuth` で検証 |
| JWT秘密鍵 | productionでは `JWT_SECRET` 必須 |
| CORS | `.env` の `CORS_ORIGIN` に含まれるoriginのみ許可 |
| Helmet | `helmet()` を全体に適用 |
| JSONサイズ制限 | `express.json({ limit: "10mb" })` |
| 入力バリデーション | Zodでbody/query/paramsを検証 |
| 共通エラー形式 | 詳細な例外をそのまま漏らさず `code/message` に変換 |
| 投稿公開範囲 | `public`, `followers`, `private` enumを保持 |
| story期限 | `expiresAt` で期限切れ投稿を除外 |
| 通報 | `Report` モデルと `POST /api/reports` |
| ブロック | `Block` モデルとフィード除外 |
| 自分のデータ保護 | Route、Post、SavedSpotで自分のデータに限定した操作 |

## パスワード管理

実装済み:

- 登録時に `hashPassword` でbcrypt hash化
- ログイン時に `verifyPassword` で照合
- APIレスポンスでは `toPublicUser` により `passwordHash` を除外

未実装:

- パスワードリセット
- メール認証
- パスワード変更
- ログイン試行回数制限
- 侵害済みパスワードチェック

## JWT管理

実装済み:

- JWTの `sub` に `user.id` を設定
- 有効期限は `JWT_EXPIRES_IN`、デフォルト `7d`
- `requireAuth` でtoken検証とUser存在確認

未実装:

- refresh token
- logout
- token失効リスト
- 端末ごとのセッション管理
- token rotation

## CORS

`src/config/env.ts` で `CORS_ORIGIN` をカンマ区切りで読み込みます。未指定時は以下を許可します。

- `http://localhost:3000`
- `http://localhost:5173`

`credentials: true` が設定されています。将来Cookie認証に移す場合は、許可originとSameSite/Secure属性の設計を合わせる必要があります。

## バリデーション

実装済み:

- email形式
- password長
- 緯度経度範囲
- 予算範囲
- rating範囲
- stayMinutes範囲
- 投稿タイプ、visibility、feedback action、通報理由のenum
- URL形式の `mediaUrl` と `imageUrl`

注意点:

- `mediaUrl` はURL形式のみ検証します。実際に安全な画像・動画かは検証していません。
- `caption` や `detail` のNGワード、個人情報、誹謗中傷検出は未実装です。

## 投稿公開範囲

実装済み:

- `visibility` enumとして `public`, `followers`, `private` を保存できる
- `GET /api/feed` と `GET /api/spots/:id/posts` は `public` のみ返す
- `GET /api/posts` と `GET /api/posts/:id` は `public` または自分の投稿を返す

未実装:

- フォロー関係
- `followers` の閲覧許可判定
- 投稿単位の年齢制限
- 投稿の非公開化、管理者削除、モデレーション状態

## 通報

実装済み:

- `post`, `user`, `spot` を通報可能
- `reason` は `inappropriate`, `harassment`, `spam`, `location_privacy`, `other`
- controllerで対象の存在確認をしてから `Report` 作成

未実装:

- 通報後の自動非表示
- 通報件数によるレビューキュー
- 管理者画面
- 通報対応ステータス
- 通報者への結果通知

## ブロック

実装済み:

- 自分自身はブロック不可
- 対象User存在確認
- `Block` をupsert
- フィードでは相互ブロック関係を除外

未実装:

- 投稿詳細や投稿一覧での完全なブロック反映
- スポット投稿一覧でのブロック反映
- DMやコメント機能でのブロック反映
- ブロック一覧取得API

## 位置情報の扱い

実装済み:

- `currentLat/currentLng` は推薦APIのリクエストとして受け取る
- `Spot.lat/lng` と `Route.start/end` はDBに保存する
- ユーザーの現在地はDBには保存しない
- リアルタイム位置共有は実装されていない

プライバシー上の意味:

- 現在地は推薦計算にのみ使われ、履歴として永続化されない
- マイルートはユーザー本人のデータとして認証必須APIでのみ扱う
- 投稿に紐づく位置はSpot単位であり、ユーザーのリアルタイム位置そのものではない

## リアルタイム位置共有をしない設計

現時点のYorimoは「今いる場所を他人に共有する」アプリではありません。推薦APIに現在地を渡しますが、その値はDB保存されず、フィードにも表示されません。

高校生を含むユーザーに対しては、この方針は安全上重要です。将来リアルタイム機能を追加する場合でも、初期設定はオフ、共有相手限定、時間制限、保護者・学校環境への配慮が必要です。

## 未成年ユーザーへの配慮

実装済み:

- `User.ageRange` を保存できる
- 通報、ブロックの基礎モデルがある
- 現在地履歴を保存しない

未実装:

- 年齢帯に応じたスポット除外
- 深夜帯スポットの除外
- アルコール、ギャンブル、成人向けスポットの除外
- 学校、自宅周辺など高感度地点のぼかし
- 未成年向け通報導線の強化
- 保護者や学校利用を想定した安全説明

## 年齢に合わないスポットの除外方針

今後の想定:

- `Spot` に `ageRestriction`、`isAdultOnly`、`safetyCategory` を追加
- `User.ageRange` をもとに推薦前段で除外
- 夜遅い時間帯、治安リスク、成人向けカテゴリを除外または警告
- 通報理由 `location_privacy` や `inappropriate` の多いスポットを推薦から下げる

## 今後追加すべき安全機能

- rate limit
- refresh tokenとlogout
- 管理者ロール
- 投稿モデレーション状態
- 不適切画像・動画検出
- NGワード、個人情報検出
- 通報レビューキュー
- ブロック一覧取得API
- フォロー承認制
- `followers` visibilityの正しい実装
- スポット作成・更新の審査制
- 監査ログ
- productionでのHTTPS、secure cookie、HSTS確認
