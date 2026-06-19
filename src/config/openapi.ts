export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Yorimo Backend API",
    version: "0.1.0",
    description: "寄り道マッピングSNS Yorimo のMVPバックエンドAPI"
  },
  servers: [
    {
      url: "http://localhost:4000",
      description: "Local development"
    }
  ],
  tags: [
    { name: "Auth" },
    { name: "Routes" },
    { name: "Spots" },
    { name: "Recommendations" },
    { name: "Posts" },
    { name: "Feedback" },
    { name: "Safety" }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT"
      }
    },
    schemas: {
      ApiSuccess: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          data: { type: "object" }
        }
      },
      ApiError: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          error: {
            type: "object",
            properties: {
              code: { type: "string", example: "VALIDATION_ERROR" },
              message: { type: "string", example: "入力内容が正しくありません" }
            }
          }
        }
      },
      RegisterRequest: {
        type: "object",
        required: ["name", "email", "password"],
        properties: {
          name: { type: "string", example: "Yorimo User" },
          email: { type: "string", format: "email", example: "user@example.com" },
          password: { type: "string", minLength: 8, example: "password123" },
          ageRange: { type: "string", nullable: true, example: "18-22" },
          homeStation: { type: "string", nullable: true, example: "吉祥寺" },
          schoolOrWorkStation: { type: "string", nullable: true, example: "渋谷" },
          interests: { type: "array", items: { type: "string" }, example: ["カフェ", "スイーツ"] },
          defaultBudget: {
            type: "integer",
            minimum: 0,
            nullable: true,
            description: "単一スライダーで指定するデフォルト予算上限。defaultBudgetMax が未指定の場合に使われます。",
            example: 1500
          },
          defaultBudgetMin: { type: "integer", minimum: 0, nullable: true, example: 0 },
          defaultBudgetMax: { type: "integer", minimum: 0, nullable: true, example: 1500 }
        }
      },
      UpdateProfileRequest: {
        type: "object",
        properties: {
          name: { type: "string", example: "Yorimo User" },
          ageRange: { type: "string", nullable: true, example: "18-22" },
          homeStation: { type: "string", nullable: true, example: "吉祥寺" },
          schoolOrWorkStation: { type: "string", nullable: true, example: "渋谷" },
          interests: { type: "array", items: { type: "string" }, example: ["カフェ", "スイーツ"] },
          defaultBudget: {
            type: "integer",
            minimum: 0,
            nullable: true,
            description: "単一スライダーで指定するデフォルト予算上限。defaultBudgetMax が未指定の場合に使われます。",
            example: 1500
          },
          defaultBudgetMin: { type: "integer", minimum: 0, nullable: true, example: 0 },
          defaultBudgetMax: { type: "integer", minimum: 0, nullable: true, example: 1500 }
        }
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string" }
        }
      },
      RouteRequest: {
        type: "object",
        required: ["name", "startName", "startLat", "startLng", "endName", "endLat", "endLng"],
        properties: {
          name: { type: "string", example: "学校帰り" },
          startName: { type: "string", example: "東京駅" },
          startLat: { type: "number", example: 35.681236 },
          startLng: { type: "number", example: 139.767125 },
          endName: { type: "string", example: "新宿駅" },
          endLat: { type: "number", example: 35.689592 },
          endLng: { type: "number", example: 139.700413 },
          viaStationNames: {
            type: "array",
            items: { type: "string" },
            description: "電車・駅ベースのルートでは経由駅を指定してください。推薦では Spot.stationName と照合されます。",
            example: ["神田", "御茶ノ水", "四ツ谷"]
          },
          usualDepartureTime: { type: "string", nullable: true, example: "18:00" },
          usualArrivalTime: { type: "string", nullable: true, example: "18:35" }
        }
      },
      SpotRequest: {
        type: "object",
        required: ["name", "category", "lat", "lng"],
        properties: {
          name: { type: "string", example: "駅前クレープ" },
          description: { type: "string", nullable: true },
          category: { type: "string", example: "スイーツ" },
          lat: { type: "number", example: 35.681236 },
          lng: { type: "number", example: 139.767125 },
          address: { type: "string", nullable: true },
          stationName: { type: "string", nullable: true },
          priceMin: { type: "integer", nullable: true, example: 500 },
          priceMax: { type: "integer", nullable: true, example: 1000 },
          openingHours: { type: "string", nullable: true },
          tags: { type: "array", items: { type: "string" }, example: ["スイーツ", "友達と行ける場所"] },
          imageUrl: { type: "string", nullable: true },
          averageStayMinutes: { type: "integer", nullable: true, example: 30 }
        }
      },
      RecommendationRequest: {
        type: "object",
        required: ["currentLat", "currentLng", "availableMinutes"],
        properties: {
          currentLat: { type: "number", example: 35.681236 },
          currentLng: { type: "number", example: 139.767125 },
          routeId: { type: "string", nullable: true },
          availableMinutes: { type: "integer", example: 45 },
          budget: {
            type: "integer",
            minimum: 0,
            nullable: true,
            description: "単一スライダーで指定する予算上限。budgetMax が未指定の場合に上限として使われます。",
            example: 1500
          },
          budgetMin: { type: "integer", minimum: 0, nullable: true, example: 0 },
          budgetMax: { type: "integer", minimum: 0, nullable: true, example: 1500 },
          mood: { type: "string", nullable: true, example: "甘いものを食べたい" },
          interestTags: { type: "array", items: { type: "string" }, example: ["スイーツ", "カフェ"] }
        }
      },
      PostRequest: {
        type: "object",
        required: ["spotId", "type"],
        properties: {
          spotId: { type: "string" },
          type: { type: "string", enum: ["photo", "short_video", "story", "review"] },
          mediaUrl: { type: "string", nullable: true },
          caption: { type: "string", nullable: true },
          rating: { type: "integer", minimum: 1, maximum: 5, nullable: true },
          moodTags: { type: "array", items: { type: "string" } },
          crowdLevel: { type: "string", nullable: true },
          stayMinutes: { type: "integer", nullable: true },
          budgetUsed: { type: "integer", nullable: true },
          visibility: { type: "string", enum: ["public", "followers", "private"] },
          expiresAt: { type: "string", format: "date-time", nullable: true }
        }
      }
    }
  },
  paths: {
    "/health": {
      get: {
        summary: "Health check",
        responses: { "200": { description: "OK" } }
      }
    },
    "/api/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "ユーザー登録",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/RegisterRequest" } } }
        },
        responses: { "201": { description: "Registered" }, "400": { description: "Validation error" } }
      }
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "ログイン",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/LoginRequest" } } }
        },
        responses: { "200": { description: "Logged in" } }
      }
    },
    "/api/auth/me": {
      get: {
        tags: ["Auth"],
        security: [{ bearerAuth: [] }],
        summary: "ログイン中ユーザー取得",
        responses: { "200": { description: "Current user" } }
      },
      patch: {
        tags: ["Auth"],
        security: [{ bearerAuth: [] }],
        summary: "プロフィール更新",
        requestBody: {
          content: { "application/json": { schema: { $ref: "#/components/schemas/UpdateProfileRequest" } } }
        },
        responses: { "200": { description: "Updated" } }
      }
    },
    "/api/routes": {
      get: {
        tags: ["Routes"],
        security: [{ bearerAuth: [] }],
        summary: "マイルート一覧",
        responses: { "200": { description: "Routes" } }
      },
      post: {
        tags: ["Routes"],
        security: [{ bearerAuth: [] }],
        summary: "マイルート作成",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/RouteRequest" } } }
        },
        responses: { "201": { description: "Created" } }
      }
    },
    "/api/routes/{id}": {
      get: { tags: ["Routes"], security: [{ bearerAuth: [] }], summary: "マイルート詳細", responses: { "200": { description: "Route" } } },
      patch: { tags: ["Routes"], security: [{ bearerAuth: [] }], summary: "マイルート更新", responses: { "200": { description: "Updated" } } },
      delete: { tags: ["Routes"], security: [{ bearerAuth: [] }], summary: "マイルート削除", responses: { "200": { description: "Deleted" } } },
      parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }]
    },
    "/api/spots": {
      get: {
        tags: ["Spots"],
        summary: "スポット検索",
        parameters: [
          { in: "query", name: "category", schema: { type: "string" } },
          { in: "query", name: "tag", schema: { type: "string" } },
          { in: "query", name: "minBudget", schema: { type: "integer", minimum: 0 } },
          { in: "query", name: "maxBudget", schema: { type: "integer", minimum: 0 } },
          { in: "query", name: "lat", schema: { type: "number" } },
          { in: "query", name: "lng", schema: { type: "number" } },
          { in: "query", name: "radiusKm", schema: { type: "number" } },
          { in: "query", name: "keyword", schema: { type: "string" } }
        ],
        responses: { "200": { description: "Spots" } }
      },
      post: {
        tags: ["Spots"],
        security: [{ bearerAuth: [] }],
        summary: "スポット作成",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/SpotRequest" } } }
        },
        responses: { "201": { description: "Created" } }
      }
    },
    "/api/spots/{id}": {
      get: { tags: ["Spots"], summary: "スポット詳細", responses: { "200": { description: "Spot" } } },
      patch: { tags: ["Spots"], security: [{ bearerAuth: [] }], summary: "スポット更新", responses: { "200": { description: "Updated" } } },
      delete: { tags: ["Spots"], security: [{ bearerAuth: [] }], summary: "スポット削除", responses: { "200": { description: "Deleted" } } },
      parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }]
    },
    "/api/recommendations": {
      post: {
        tags: ["Recommendations"],
        security: [{ bearerAuth: [] }],
        summary: "寄り道推薦",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/RecommendationRequest" } } }
        },
        responses: { "200": { description: "Recommendations" } }
      }
    },
    "/api/posts": {
      get: { tags: ["Posts"], security: [{ bearerAuth: [] }], summary: "投稿一覧", responses: { "200": { description: "Posts" } } },
      post: {
        tags: ["Posts"],
        security: [{ bearerAuth: [] }],
        summary: "投稿作成",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/PostRequest" } } }
        },
        responses: { "201": { description: "Created" } }
      }
    },
    "/api/posts/{id}": {
      get: { tags: ["Posts"], security: [{ bearerAuth: [] }], summary: "投稿詳細", responses: { "200": { description: "Post" } } },
      patch: { tags: ["Posts"], security: [{ bearerAuth: [] }], summary: "投稿更新", responses: { "200": { description: "Updated" } } },
      delete: { tags: ["Posts"], security: [{ bearerAuth: [] }], summary: "投稿削除", responses: { "200": { description: "Deleted" } } },
      parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }]
    },
    "/api/spots/{id}/posts": {
      get: {
        tags: ["Posts"],
        summary: "スポットに紐づく公開投稿",
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Spot posts" } }
      }
    },
    "/api/feed": {
      get: { tags: ["Posts"], security: [{ bearerAuth: [] }], summary: "フィード", responses: { "200": { description: "Feed" } } }
    },
    "/api/feedback": {
      post: {
        tags: ["Feedback"],
        security: [{ bearerAuth: [] }],
        summary: "行動フィードバック保存",
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["spotId", "action"],
                properties: {
                  spotId: { type: "string" },
                  postId: { type: "string", nullable: true },
                  action: { type: "string", enum: ["view", "save", "skip", "visited", "like", "dislike", "report"] }
                }
              }
            }
          }
        },
        responses: { "201": { description: "Created" } }
      }
    },
    "/api/saved-spots": {
      get: { tags: ["Feedback"], security: [{ bearerAuth: [] }], summary: "保存スポット一覧", responses: { "200": { description: "Saved spots" } } },
      post: { tags: ["Feedback"], security: [{ bearerAuth: [] }], summary: "スポット保存", responses: { "201": { description: "Saved" } } }
    },
    "/api/saved-spots/{spotId}": {
      delete: {
        tags: ["Feedback"],
        security: [{ bearerAuth: [] }],
        summary: "保存スポット削除",
        parameters: [{ in: "path", name: "spotId", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Deleted" } }
      }
    },
    "/api/reports": {
      post: { tags: ["Safety"], security: [{ bearerAuth: [] }], summary: "通報作成", responses: { "201": { description: "Created" } } }
    },
    "/api/blocks": {
      post: { tags: ["Safety"], security: [{ bearerAuth: [] }], summary: "ユーザーブロック", responses: { "201": { description: "Blocked" } } }
    },
    "/api/blocks/{blockedUserId}": {
      delete: {
        tags: ["Safety"],
        security: [{ bearerAuth: [] }],
        summary: "ブロック解除",
        parameters: [{ in: "path", name: "blockedUserId", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Deleted" } }
      }
    }
  }
} as const;
