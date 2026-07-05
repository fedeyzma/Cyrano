import { exportAll, importBackup } from "@/lib/db";
import { json, readJson } from "@/lib/http";
import { backupSchema } from "@/lib/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Export every conversation as a portable JSON backup. */
export function GET() {
  const backup = exportAll();
  return new Response(JSON.stringify(backup, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="cyrano-backup.json"`,
    },
  });
}

/** Import a backup (produced by GET) into this instance. Idempotent per-backup. */
export async function POST(req: Request) {
  const body = await readJson(req);
  const parsed = backupSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: "That doesn't look like a Cyrano backup file." }, 400);
  }
  const result = importBackup(parsed.data);
  return json(result);
}
