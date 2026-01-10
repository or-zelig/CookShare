export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "CookShare API",
    version: "1.0.0",
    description: "Recipe social app backend (Auth + Posts later).",
  },
  servers: [{ url: "http://localhost:4000" }],
  tags: [{ name: "Health" }, { name: "Auth" }],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      security: [],
    },
    schemas: {
      Error: {
        type: "object",
        properties: { message: { type: "string" } },
        required: ["message"],
      },
      User: {
        type: "object",
        properties: {
          id: { type: "string" },
          username: { type: "string" },
          email: { type: "string" },
          avatarUrl: { type: "string" },
        },
        required: ["id", "username", "email", "avatarUrl"],
      },
      RegisterRequest: {
        type: "object",
        properties: {
          username: { type: "string", example: "u1" },
          email: { type: "string", example: "u1@test.com" },
          password: { type: "string", example: "123456" },
        },
        required: ["username", "email", "password"],
      },
      LoginRequest: {
        type: "object",
        properties: {
          username: { type: "string", example: "u1" },
          password: { type: "string", example: "123456" },
        },
        required: ["username", "password"],
      },
      AuthResponse: {
        type: "object",
        properties: {
          user: { $ref: "#/components/schemas/User" },
          accessToken: { type: "string" },
        },
        required: ["user", "accessToken"],
      },
      MeResponse: {
        type: "object",
        properties: { user: { $ref: "#/components/schemas/User" } },
        required: ["user"],
      },
      LogoutResponse: {
        type: "object",
        properties: { ok: { type: "boolean", example: true } },
        required: ["ok"],
      },
    },
  },
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        responses: {
          "200": {
            description: "OK",
            content: { "application/json": { schema: { type: "object" } } },
          },
        },
      },
    },

    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/RegisterRequest" } },
          },
        },
        responses: {
          "201": {
            description: "Created (sets httpOnly refresh cookie: rt)",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } },
            },
          },
          "400": { description: "Bad request", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "409": { description: "User exists", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
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
            description: "OK (sets httpOnly refresh cookie: rt)",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } },
            },
          },
          "400": { description: "Bad request", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "401": { description: "Invalid credentials", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },

    "/auth/refresh": {
      post: {
        tags: ["Auth"],
        summary: "Refresh access token (uses refresh cookie rt)",
        description: "Requires httpOnly cookie 'rt'. Rotates refresh token and returns new accessToken.",
        responses: {
          "200": {
            description: "OK (rotates cookie rt)",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } },
            },
          },
          "401": { description: "Missing/invalid refresh", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "403": { description: "Reuse detected", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },

    "/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Logout (clears refresh cookie rt)",
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/LogoutResponse" } },
            },
          },
        },
      },
    },

    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Get current user",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/MeResponse" } },
            },
          },
          "401": { description: "Unauthorized", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          "404": { description: "User not found", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
  },
} as const;
