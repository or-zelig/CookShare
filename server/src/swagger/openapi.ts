export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "CookShare API",
    version: "1.0.0",
    description: "CookShare backend API (Auth + Posts).",
  },
  servers: [{ url: "http://localhost:4000" }],
  tags: [{ name: "Auth" }, { name: "Posts" }],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          message: { type: "string", example: "Something went wrong" },
        },
        required: ["message"],
      },

      // --- Auth ---
      UserPublic: {
        type: "object",
        properties: {
          _id: { type: "string", example: "65f1c9e7c7b7b5b2e9d2a111" },
          username: { type: "string", example: "sir" },
          email: { type: "string", example: "sir@test.com" },
          avatarUrl: { type: "string", example: "https://..." },
        },
        required: ["_id", "username", "email"],
      },

      AuthResponse: {
        type: "object",
        properties: {
          user: { $ref: "#/components/schemas/UserPublic" },
          accessToken: { type: "string", example: "eyJhbGciOi..." },
        },
        required: ["user", "accessToken"],
      },

      RegisterRequest: {
        type: "object",
        properties: {
          username: { type: "string", example: "sir" },
          email: { type: "string", example: "sir@test.com" },
          password: { type: "string", example: "123456" },
        },
        required: ["username", "email", "password"],
      },

      LoginRequest: {
        type: "object",
        properties: {
          email: { type: "string", example: "sir@test.com" },
          password: { type: "string", example: "123456" },
        },
        required: ["email", "password"],
      },

      // --- Posts ---
      Ingredient: {
        type: "object",
        properties: {
          name: { type: "string", example: "Egg" },
          amount: { type: "string", example: "2" },
          unit: { type: "string", example: "pcs" },
        },
        required: ["name"],
      },

      Step: {
        type: "object",
        properties: {
          order: { type: "integer", example: 1, minimum: 1 },
          text: { type: "string", example: "Mix everything well" },
        },
        required: ["order", "text"],
      },

      Post: {
        type: "object",
        properties: {
          _id: { type: "string", example: "65f1c9e7c7b7b5b2e9d2a999" },
          author: {
            oneOf: [
              { type: "string", example: "65f1c9e7c7b7b5b2e9d2a111" },
              { $ref: "#/components/schemas/UserPublic" },
            ],
            description: "Either ObjectId string or populated user object",
          },
          title: { type: "string", example: "Protein Pancakes" },
          description: { type: "string", example: "Quick and tasty pancakes" },
          ingredients: {
            type: "array",
            items: { $ref: "#/components/schemas/Ingredient" },
          },
          steps: {
            type: "array",
            items: { $ref: "#/components/schemas/Step" },
          },
          imageUrl: { type: "string", example: "/uploads/abc.jpg" },
          isPublic: { type: "boolean", example: true },
          tags: { type: "array", items: { type: "string" }, example: ["easy", "quick"] },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
        required: ["_id", "author", "title", "ingredients", "steps", "imageUrl", "isPublic", "tags", "createdAt", "updatedAt"],
      },

      CreatePostJson: {
        type: "object",
        properties: {
          title: { type: "string", example: "Protein Pancakes" },
          description: { type: "string", example: "Quick and tasty pancakes" },
          isPublic: { type: "boolean", example: true },
          tags: { type: "array", items: { type: "string" }, example: ["easy", "quick"] },
          ingredients: {
            type: "array",
            items: { $ref: "#/components/schemas/Ingredient" },
            example: [{ name: "Egg", amount: "2", unit: "pcs" }],
          },
          steps: {
            type: "array",
            items: { $ref: "#/components/schemas/Step" },
            example: [{ order: 1, text: "Mix" }],
          },
        },
        required: ["title"],
      },

      UpdatePostJson: {
        type: "object",
        properties: {
          title: { type: "string", example: "Updated title" },
          description: { type: "string", example: "Updated description" },
          isPublic: { type: "boolean", example: false },
          tags: { type: "array", items: { type: "string" }, example: ["tag1"] },
          ingredients: {
            type: "array",
            items: { $ref: "#/components/schemas/Ingredient" },
            example: [{ name: "Salt" }],
          },
          steps: {
            type: "array",
            items: { $ref: "#/components/schemas/Step" },
            example: [{ order: 1, text: "Do X" }],
          },
        },
        additionalProperties: false,
      },

      // Multipart schemas: ingredients/steps/tags are JSON strings (FormData)
      CreatePostMultipart: {
        type: "object",
        properties: {
          title: { type: "string", example: "Protein Pancakes" },
          description: { type: "string", example: "Quick and tasty pancakes" },
          isPublic: { type: "string", example: "true", description: "Boolean as string in multipart" },
          tags: {
            type: "string",
            example: '["easy","quick"]',
            description: "JSON stringified array of strings",
          },
          ingredients: {
            type: "string",
            example: '[{"name":"Egg","amount":"2","unit":"pcs"},{"name":"Oats","amount":"50","unit":"g"}]',
            description: "JSON stringified array of Ingredient objects OR array of strings",
          },
          steps: {
            type: "string",
            example: '[{"order":1,"text":"Mix"},{"order":2,"text":"Cook"}]',
            description: "JSON stringified array of Step objects OR array of strings",
          },
          image: {
            type: "string",
            format: "binary",
            description: "Optional image file",
          },
        },
        required: ["title"],
      },

      FeedResponse: {
        type: "object",
        properties: {
          posts: { type: "array", items: { $ref: "#/components/schemas/Post" } },
          nextCursor: { type: ["string", "null"], example: "65f1c9e7c7b7b5b2e9d2a999" },
        },
        required: ["posts", "nextCursor"],
      },

      SinglePostResponse: {
        type: "object",
        properties: {
          post: { $ref: "#/components/schemas/Post" },
        },
        required: ["post"],
      },

      DeleteOkResponse: {
        type: "object",
        properties: { ok: { type: "boolean", example: true } },
        required: ["ok"],
      },
    },
  },

  paths: {
    /**
     * AUTH
     */
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register new user",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/RegisterRequest" } },
          },
        },
        responses: {
          "201": {
            description: "Created",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } },
            },
          },
          "400": {
            description: "Bad request",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
        },
      },
    },

    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/LoginRequest" } },
          },
        },
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } },
            },
          },
          "400": {
            description: "Bad request",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
          "401": {
            description: "Unauthorized",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
        },
      },
    },

    /**
     * POSTS
     */
    "/posts": {
      post: {
        tags: ["Posts"],
        summary: "Create a post (supports multipart for image)",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: { $ref: "#/components/schemas/CreatePostMultipart" },
            },
            "application/json": {
              schema: { $ref: "#/components/schemas/CreatePostJson" },
            },
          },
        },
        responses: {
          "201": {
            description: "Created",
            content: { "application/json": { schema: { $ref: "#/components/schemas/SinglePostResponse" } } },
          },
          "400": {
            description: "Bad request",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
          "401": {
            description: "Unauthorized",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
        },
      },
    },

    "/posts/feed": {
      get: {
        tags: ["Posts"],
        summary: "Public feed (cursor pagination)",
        parameters: [
          {
            name: "limit",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 1, maximum: 50, default: 20 },
          },
          {
            name: "cursor",
            in: "query",
            required: false,
            schema: { type: "string" },
          },
          {
            name: "q",
            in: "query",
            required: false,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "OK",
            content: { "application/json": { schema: { $ref: "#/components/schemas/FeedResponse" } } },
          },
        },
      },
    },

    "/posts/mine": {
      get: {
        tags: ["Posts"],
        summary: "Get my posts (public + private)",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "limit",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 1, maximum: 50, default: 20 },
          },
          {
            name: "cursor",
            in: "query",
            required: false,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "OK",
            content: { "application/json": { schema: { $ref: "#/components/schemas/FeedResponse" } } },
          },
          "401": {
            description: "Unauthorized",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
        },
      },
    },

    "/posts/{id}": {
      get: {
        tags: ["Posts"],
        summary: "Get single post (public only)",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "OK",
            content: { "application/json": { schema: { $ref: "#/components/schemas/SinglePostResponse" } } },
          },
          "400": {
            description: "Invalid id",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
          "403": {
            description: "Forbidden (private post)",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
          "404": {
            description: "Not found",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
        },
      },

      patch: {
        tags: ["Posts"],
        summary: "Update post (owner only). Supports multipart or json",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                // same as create but everything optional
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  isPublic: { type: "string", description: "Boolean as string in multipart" },
                  tags: { type: "string", description: 'JSON stringified array, e.g. ["t1"]' },
                  ingredients: { type: "string", description: "JSON stringified array (objects or strings)" },
                  steps: { type: "string", description: "JSON stringified array (objects or strings)" },
                  image: { type: "string", format: "binary" },
                },
              },
            },
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdatePostJson" },
            },
          },
        },
        responses: {
          "200": {
            description: "OK",
            content: { "application/json": { schema: { $ref: "#/components/schemas/SinglePostResponse" } } },
          },
          "400": {
            description: "Invalid request/id",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
          "401": {
            description: "Unauthorized",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
          "403": {
            description: "Forbidden (not owner)",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
          "404": {
            description: "Not found",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
        },
      },

      delete: {
        tags: ["Posts"],
        summary: "Delete post (owner only)",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "OK",
            content: { "application/json": { schema: { $ref: "#/components/schemas/DeleteOkResponse" } } },
          },
          "400": {
            description: "Invalid id",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
          "401": {
            description: "Unauthorized",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
          "403": {
            description: "Forbidden (not owner)",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
          "404": {
            description: "Not found",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
        },
      },
    },
  },
} as const;
