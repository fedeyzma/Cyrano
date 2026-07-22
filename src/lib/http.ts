import { gzipSync } from "node:zlib";
import { NextResponse } from "next/server";

const GZIP_MIN_BYTES = 1024;

export function json(data: unknown, status = 200, req?: Request): Response {
  const text = JSON.stringify(data) ?? "null";
  const accepts = req?.headers.get("accept-encoding") ?? "";
  if (!accepts.includes("gzip")) {
    return NextResponse.json(data, { status });
  }
  const body = Buffer.from(text, "utf8");
  if (body.byteLength < GZIP_MIN_BYTES) {
    return NextResponse.json(data, { status });
  }
  const gz = gzipSync(body, { level: 6 });
  return new Response(gz, {
    status,
    headers: {
      "Content-Type": "application/json",
      "Content-Encoding": "gzip",
      "Content-Length": String(gz.byteLength),
      Vary: "Accept-Encoding",
    },
  });
}

export function parseId(value: string | undefined): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function readJson<T = Record<string, unknown>>(
  req: Request,
): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}
