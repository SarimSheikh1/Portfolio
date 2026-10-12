import "dotenv/config";
import { z } from "zod";
const schema = z.object({
  DATABASE_URL: z.string().url().optional(),
  SESSION_SECRET: z.string().min(48).optional(),
  PORT: z.coerce.number().default(3001),
  PUBLIC_ORIGIN: z.string().url().default("http://127.0.0.1:8787"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});
export const config = schema.parse(process.env);
if (config.SESSION_SECRET?.startsWith("replace-with-"))
  throw new Error(
    "Replace the session secret placeholder with a real random secret",
  );
if (
  config.NODE_ENV === "production" &&
  (!config.DATABASE_URL || !config.SESSION_SECRET)
)
  throw new Error("Production requires DATABASE_URL and SESSION_SECRET");
