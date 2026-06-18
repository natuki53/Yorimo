# 03. データフロー

このドキュメントでは、現在実装されているAPIの代表的なデータフローを説明します。フロントエンドは未実装ですが、APIクライアントから呼び出される前提で記述します。

## 1. ユーザー登録からログインまで

```mermaid
flowchart TD
  start["ユーザーが登録情報を入力"]
  registerApi["POST /api/auth/register"]
  validate["registerSchemaで検証"]
  exists["email重複確認"]
  hash["bcryptでpasswordHash作成"]
  createUser["User作成"]
  token["JWT発行"]
  loginApi["POST /api/auth/login"]
  verify["passwordHashと照合"]
  response["userとtokenを返却"]

  start --> registerApi --> validate --> exists --> hash --> createUser --> token --> response
  start --> loginApi --> verify --> token
```

登録時は `name`、`email`、`password` が必須です。任意項目として `ageRange`、`homeStation`、`schoolOrWorkStation`、`interests`、`defaultBudgetMin`、`defaultBudgetMax` を保存できます。レスポンスの `user` には `passwordHash` は含まれません。

## 2. ログイン・認証API呼び出しフロー

```mermaid
sequenceDiagram
  participant FE as Frontend
  participant API as Backend API
  participant Auth as auth middleware
  participant DB as PostgreSQL

  FE->>API: POST /api/auth/login
  API->>DB: Userをemailで検索
  DB-->>API: User + passwordHash
  API->>API: bcrypt.compare
  API-->>FE: user + JWT
  FE->>API: GET /api/routes Authorization: Bearer token
  API->>Auth: token検証
  Auth->>DB: payload.subのUser確認
  DB-->>Auth: id/email/name
  Auth-->>API: req.userへ設定
  API->>DB: userIdでRoute取得
  DB-->>API: routes
  API-->>FE: success response
```

認証が必要なAPIでは `Authorization: Bearer <token>` を送ります。tokenがない場合は `UNAUTHORIZED`、tokenが不正な場合は `トークンが無効です` が返ります。

## 3. スポット一覧取得のデータフロー

```mermaid
flowchart TD
  fe["Frontend"]
  api["GET /api/spots"]
  query["spotQuerySchemaでquery検証"]
  prisma["prisma.spot.findMany"]
  filter["lat/lng/radiusKmがあればdistanceKmで絞り込み"]
  page["offset/limitでslice"]
  res["{ items, total }を返却"]

  fe --> api --> query --> prisma --> filter --> page --> res
```

`GET /api/spots` は認証不要です。DB検索では `category`、`tag`、`minBudget`、`maxBudget`、`keyword` を使い、その後アプリ側で `lat/lng/radiusKm` による距離フィルタを行います。

## 4. 寄り道推薦取得のデータフロー

```mermaid
flowchart TD
  fe["Frontend"]
  api["POST /api/recommendations"]
  auth["requireAuth"]
  validate["recommendationRequestSchema"]
  service["recommendationService.getRecommendations"]
  user["User + Feedback + SavedSpot取得"]
  route["routeIdがあればRoute取得と所有者確認"]
  spots["Spot候補を最大200件取得"]
  scoring["7要素で寄り道スコア算出"]
  reasons["reasons生成"]
  sort["score降順で上位20件"]
  res["{ items }を返却"]

  fe --> api --> auth --> validate --> service --> user --> route --> spots --> scoring --> reasons --> sort --> res
```

推薦は現在ルールベースです。ユーザーの興味、保存履歴、フィードバック履歴、現在地、任意のマイルート、空き時間、予算、気分を使って `yorimichiScore` を計算します。

## 5. 投稿作成のデータフロー

```mermaid
sequenceDiagram
  participant FE as Frontend
  participant API as Backend API
  participant Media as mediaService
  participant DB as PostgreSQL

  FE->>API: POST /api/posts
  API->>API: requireAuth + postCreateSchema
  API->>DB: Spot存在確認
  DB-->>API: Spot
  API->>Media: resolveMediaUrl(mediaUrl)
  Media-->>API: mediaUrlまたはnull
  API->>API: type=storyかつexpiresAtなしなら24時間後を設定
  API->>DB: Post作成
  DB-->>API: Post + user + spot
  API-->>FE: 201 success
```

`photo`、`short_video`、`story`、`review` の投稿タイプを受け付けます。現時点ではファイルアップロードはなく、`mediaUrl` をURLとして受け取ります。

## 6. SNS投稿・フィード表示フロー

```mermaid
flowchart TD
  create["POST /api/postsで投稿作成"]
  post["Post保存"]
  feedReq["GET /api/feed"]
  block["Blockから相互ブロック対象を取得"]
  publicOnly["visibility=publicを対象"]
  activeOnly["expiresAtがnullまたは未来の投稿のみ"]
  exclude["blockedUserIdsを除外"]
  latest["createdAt descで最大50件"]
  feed["フィード表示"]

  create --> post
  feedReq --> block --> publicOnly --> activeOnly --> exclude --> latest --> feed
```

フィードはログイン必須です。自分がブロックしたユーザー、または自分をブロックしているユーザーの投稿を除外します。

## 7. フィードバック保存のデータフロー

```mermaid
flowchart TD
  fe["Frontend"]
  api["POST /api/feedback"]
  auth["requireAuth"]
  validate["feedbackCreateSchema"]
  spot["Spot存在確認"]
  post["postIdがあればPost存在確認"]
  feedback["Feedback作成"]
  save["action=saveならSavedSpot upsert"]
  res["201 success"]

  fe --> api --> auth --> validate --> spot --> post --> feedback --> save --> res
```

`action` は `view`、`save`、`skip`、`visited`、`like`、`dislike`、`report` です。`save` の場合は `SavedSpot` も作成または維持され、推薦ロジックの行動履歴にも使われます。
