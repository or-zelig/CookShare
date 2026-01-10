import dotenv from "dotenv";

dotenv.config();

function must(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export const ENV = {
  PORT: Number(process.env.PORT || 4000),
  MONGO_URI: must("MONGO_URI"),
  CLIENT_ORIGIN: must("CLIENT_ORIGIN"),
};
