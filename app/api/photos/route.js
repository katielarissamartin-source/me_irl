import { NextResponse } from "next/server";
import { sql, ensure } from "../../../lib/db";

export async function GET(req) {
  await ensure();
  const id = new URL(req.url).searchParams.get("id");
  if (id) {
    const [p] = await sql`select data from photos where id = ${id}`;
    if (!p) return new Response("Not found", { status: 404 });
    const b = Buffer.from(p.data.split(",")[1], "base64");
    return new Response(b, { headers: { "content-type": "image/jpeg", "cache-control": "private, max-age=31536000, immutable" } });
  }
  const rows = await sql`select id, to_char(taken_on,'YYYY-MM-DD') d from photos order by taken_on, created_at`;
  return NextResponse.json(rows);
}

export async function POST(req) {
  await ensure();
  const { id, d, src } = await req.json();
  if (!/^[\w-]{6,80}$/.test(id) || !/^\d{4}-\d{2}-\d{2}$/.test(d) || !/^data:image\/jpeg;base64,/.test(src) || src.length > 3_000_000) return NextResponse.json({ error: "bad_photo" }, { status: 400 });
  await sql`insert into photos (id, taken_on, data) values (${id}, ${d}, ${src}) on conflict (id) do nothing`;
  return NextResponse.json({ ok: true });
}

export async function DELETE(req) {
  await ensure();
  const id = new URL(req.url).searchParams.get("id");
  await sql`delete from photos where id = ${id}`;
  return NextResponse.json({ ok: true });
}
