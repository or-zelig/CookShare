process.env.NODE_ENV = "test";
process.env.PORT = "4000";
process.env.CLIENT_ORIGIN = "http://localhost:5173";

process.env.ACCESS_TOKEN_SECRET = "test_access_secret";
process.env.REFRESH_TOKEN_SECRET = "test_refresh_secret";
process.env.ACCESS_TOKEN_TTL = "15m";
process.env.REFRESH_TOKEN_TTL = "7d";
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "test-google-client-id";
process.env.AI_PROVIDER = process.env.AI_PROVIDER || "mock";
process.env.LLM_MOCK_MODE = process.env.LLM_MOCK_MODE || "always";
process.env.AI_MOCK_SCENARIO = process.env.AI_MOCK_SCENARIO || "success";

// default local mongo (can be overridden)
process.env.MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/cookshare_test";
