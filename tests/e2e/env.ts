import fs from "node:fs";
import path from "node:path";

/** Reads .env.local and .env.test.local (Playwright doesn't load them itself). */
export function loadEnv(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const file of [".env.local", ".env.test.local"]) {
    const full = path.join(process.cwd(), file);
    if (!fs.existsSync(full)) continue;
    for (const line of fs.readFileSync(full, "utf8").split("\n")) {
      if (!line.includes("=") || line.trimStart().startsWith("#")) continue;
      out[line.slice(0, line.indexOf("=")).trim()] = line.slice(line.indexOf("=") + 1).trim();
    }
  }
  return out;
}
