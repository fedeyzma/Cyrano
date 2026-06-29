import type { Role } from "./types";

export interface ParsedMessage {
  role: Role;
  content: string;
}

// "me:", "you:", "i:", "sent:" → my message
const ME_PREFIX = /^\s*(me|you|i|self|sent)\s*[:\-–—]\s+/i;
// "them:", "her:", "him:", "she:", "he:", "they:" → their message
const THEM_KEYWORD = /^\s*(them|they|her|him|she|he)\s*[:\-–—]\s+/i;
// A capitalised single name followed by a colon, e.g. "Sofia: hey" → their message
const NAME_PREFIX = /^\s*(\p{Lu}[\p{L}'’.-]{1,20})\s*[:\-–—]\s+/u;

/**
 * Best-effort parse of a pasted conversation into ordered messages.
 *
 * Detects "Me:/You:" and "Them:/<Name>:" prefixes; for unprefixed lines it
 * alternates speakers (starting with them). It only needs to be a good first
 * guess — the import UI lets the user correct every role before saving.
 */
export function parseThread(raw: string, theirName?: string): ParsedMessage[] {
  const theirLc = theirName?.trim().toLowerCase();
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const out: ParsedMessage[] = [];
  let lastRole: Role = "me"; // so the first unprefixed line flips to "them"

  for (const line of lines) {
    let role: Role | null = null;
    let content = line;

    let m = line.match(ME_PREFIX);
    if (m) {
      role = "me";
      content = line.slice(m[0].length);
    } else if ((m = line.match(THEM_KEYWORD))) {
      role = "them";
      content = line.slice(m[0].length);
    } else if ((m = line.match(NAME_PREFIX))) {
      // a "Word:" prefix — treat as the other person (matches their name or not)
      role = "them";
      content = line.slice(m[0].length);
      void theirLc; // name is informational; everything non-"me" is "them"
    }

    if (role === null) {
      role = lastRole === "them" ? "me" : "them";
    }

    content = content.trim();
    if (!content) continue;
    out.push({ role, content });
    lastRole = role;
  }

  return out;
}
