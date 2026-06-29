import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

let cache: { mtime: number; content: string } | null = null;

/**
 * Read the user's personal-context file (markdown). Cached by mtime so edits
 * take effect on the next generation without a restart. Returns "" if missing.
 */
export function getUserContext(): string {
  const path = resolve(process.env.USER_CONTEXT_PATH ?? "./fred_context.md");
  try {
    const mtime = statSync(path).mtimeMs;
    if (cache && cache.mtime === mtime) return cache.content;
    const content = readFileSync(path, "utf8").trim();
    cache = { mtime, content };
    return content;
  } catch {
    return "";
  }
}
