import { sql } from "../../../lib/db";
import { loadShare } from "../../../lib/share";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const u = new URL(req.url);
  const ok = await loadShare(u.searchParams.get("k")).catch(() => null);
  if (!ok || !ok.share.photos) return new Response("Not found", { status: 404 });
  const [p] = await sql`select data from photos where id = ${u.searchParams.get("id")}`;
  if (!p) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(p.data.split(",")[1], "base64"), { headers: { "content-type": "image/jpeg", "cache-control": "private, no-store" } });
}
