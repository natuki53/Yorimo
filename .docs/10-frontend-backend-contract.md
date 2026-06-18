# 10. Frontend Backend Contract

このドキュメントはフロントエンド担当者がYorimo Backend APIに接続するための契約書です。

## ベースURL

```ts
export const API_BASE_URL = "http://localhost:4000";
```

アプリAPIは `/api` 配下です。

## 認証方式

ログインまたは登録成功時に返る `token` を保存し、認証が必要なAPIで送ります。

```http
Authorization: Bearer <token>
```

tokenはlocalStorage、sessionStorage、またはアプリの認証状態管理に保持できます。XSS対策を考えると、将来的にはHttpOnly Cookieや短命access token + refresh tokenも検討対象です。現行APIはBearer token前提です。

## 共通レスポンス

```ts
export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiError = {
  success: false;
  error: {
    code: string;
    message: string;
  };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
```

## フロントで保持するべき状態

| 状態 | 用途 |
| --- | --- |
| `token` | 認証API呼び出し |
| `currentUser` | 表示名、興味、デフォルト予算、ログイン判定 |
| `selectedRoute` | 推薦時の `routeId` |
| `recommendationFilters` | 現在地、空き時間、予算、気分、興味タグ |
| `selectedSpot` | 地図や詳細画面で選択中のSpot |

## 画面ごとに必要なAPI

| 画面 | API |
| --- | --- |
| ログイン画面 | `POST /api/auth/login` |
| 新規登録画面 | `POST /api/auth/register` |
| ホーム画面 | `GET /api/feed`, `GET /api/auth/me`, `GET /api/routes` |
| おすすめ一覧画面 | `POST /api/recommendations`, `POST /api/feedback`, `POST /api/saved-spots` |
| 地図画面 | `GET /api/spots`, `POST /api/recommendations` |
| スポット詳細画面 | `GET /api/spots/:id`, `GET /api/spots/:id/posts`, `POST /api/saved-spots`, `POST /api/feedback` |
| 投稿画面 | `GET /api/spots`, `POST /api/posts` |
| フィード画面 | `GET /api/feed`, `POST /api/feedback`, `POST /api/reports`, `POST /api/blocks` |
| マイルート画面 | `GET /api/routes`, `POST /api/routes`, `PATCH /api/routes/:id`, `DELETE /api/routes/:id` |
| プロフィール画面 | `GET /api/auth/me`, `PATCH /api/auth/me`, `GET /api/saved-spots`, `GET /api/posts?userId=<id>` |

## TypeScript型定義

```ts
export type User = {
  id: string;
  name: string;
  email: string;
  ageRange: string | null;
  homeStation: string | null;
  schoolOrWorkStation: string | null;
  interests: string[];
  defaultBudgetMin: number | null;
  defaultBudgetMax: number | null;
  createdAt: string;
  updatedAt: string;
};

export type Route = {
  id: string;
  userId: string;
  name: string;
  startName: string;
  startLat: number;
  startLng: number;
  endName: string;
  endLat: number;
  endLng: number;
  viaStationNames: string[];
  usualDepartureTime: string | null;
  usualArrivalTime: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Spot = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  lat: number;
  lng: number;
  address: string | null;
  stationName: string | null;
  priceMin: number | null;
  priceMax: number | null;
  openingHours: string | null;
  tags: string[];
  imageUrl: string | null;
  averageStayMinutes: number | null;
  createdAt: string;
  updatedAt: string;
};

export type RecommendationRequest = {
  currentLat: number;
  currentLng: number;
  routeId?: string | null;
  availableMinutes: number;
  budgetMin?: number | null;
  budgetMax?: number | null;
  mood?: string | null;
  interestTags?: string[];
};

export type ScoreBreakdown = {
  behavior: number;
  route: number;
  interest: number;
  time: number;
  budget: number;
  mood: number;
  freshness: number;
};

export type RecommendationItem = {
  spot: Spot;
  yorimichiScore: number;
  scoreBreakdown: ScoreBreakdown;
  reasons: string[];
};

export type PostType = "photo" | "short_video" | "story" | "review";
export type Visibility = "public" | "followers" | "private";

export type Post = {
  id: string;
  userId: string;
  spotId: string;
  type: PostType;
  mediaUrl: string | null;
  caption: string | null;
  rating: number | null;
  moodTags: string[];
  crowdLevel: string | null;
  stayMinutes: number | null;
  budgetUsed: number | null;
  visibility: Visibility;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; name: string };
  spot?: Spot;
};

export type FeedbackAction =
  | "view"
  | "save"
  | "skip"
  | "visited"
  | "like"
  | "dislike"
  | "report";
```

## API呼び出し例

### 共通fetch関数

```ts
async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, headers, ...rest } = options;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers
    }
  });

  const payload = (await response.json()) as ApiResponse<T>;

  if (!payload.success) {
    throw new Error(`${payload.error.code}: ${payload.error.message}`);
  }

  return payload.data;
}
```

### ログイン

```ts
const data = await apiFetch<{ user: User; token: string }>("/api/auth/login", {
  method: "POST",
  body: JSON.stringify({
    email: "demo@yorimo.local",
    password: "password123"
  })
});
```

### 推薦取得

```ts
const data = await apiFetch<{ items: RecommendationItem[] }>("/api/recommendations", {
  method: "POST",
  token,
  body: JSON.stringify({
    currentLat: 35.681236,
    currentLng: 139.767125,
    availableMinutes: 45,
    budgetMin: 0,
    budgetMax: 1500,
    mood: "甘いものを食べたい",
    interestTags: ["スイーツ", "カフェ"]
  })
});
```

### スポット検索

```ts
const params = new URLSearchParams({
  category: "カフェ",
  maxBudget: "1500",
  lat: "35.681236",
  lng: "139.767125",
  radiusKm: "3"
});

const data = await apiFetch<{ items: Spot[]; total: number }>(`/api/spots?${params}`);
```

### 投稿作成

```ts
const post = await apiFetch<Post>("/api/posts", {
  method: "POST",
  token,
  body: JSON.stringify({
    spotId,
    type: "review",
    caption: "帰り道にちょうどよかった",
    rating: 5,
    moodTags: ["甘いもの"],
    stayMinutes: 25,
    budgetUsed: 800,
    visibility: "public"
  })
});
```

## エラーハンドリング方針

- `VALIDATION_ERROR`: 入力フォームの該当項目に表示する
- `UNAUTHORIZED`: tokenを破棄し、ログイン画面へ戻す
- `FORBIDDEN`: 操作不可メッセージを表示する
- `NOT_FOUND`: 詳細画面なら一覧へ戻す、または「見つかりません」を表示する
- `CONFLICT`: 登録時のemail重複などとして表示する
- `INTERNAL_SERVER_ERROR`: 汎用エラー表示と再試行導線を出す

## 実装上の注意

- `POST /api/recommendations` の数値はJSON numberとして送る
- query stringの数値はバックエンドがZodでcoerceする
- `followers` visibilityは未実装扱いにする
- ファイルアップロードAPIは未実装なので、投稿作成時は外部URLを `mediaUrl` に渡す
- `GET /api/spots/:id/posts` は認証不要だがpublic投稿のみ返る
- `GET /api/posts` は認証必須で、自分のprivate/followers投稿も取得できる
