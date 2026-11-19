import { z } from "zod";

// Public (browser-safe) environment variables, validated once at startup.
// NEXT_PUBLIC_* values are inlined into the browser bundle at build time, so
// they must be referenced literally (process.env.NEXT_PUBLIC_X), not dynamically.
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url({ message: "NEXT_PUBLIC_SUPABASE_URL must be a valid URL" }),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .min(20, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing or too short"),
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
});

const parsed = publicEnvSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
});

if (!parsed.success) {
  throw new Error(
    "Invalid environment variables. Copy .env.example to .env.local and fill in your Supabase keys.\n" +
      parsed.error.issues.map((i) => `  - ${i.message}`).join("\n"),
  );
}

export const env = parsed.data;
