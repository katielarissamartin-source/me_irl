import { NextResponse } from "next/server";
import { sql, ensure } from "../../../lib/db";

const save = v => sql`insert into kv (key, value, updated_at) values ('kt_share', ${JSON.stringify(v)}::jsonb, now()) on conflict (key) do update set value = excluded.value, updated_at = now()`;

export async function POST(req) {
  await ensure();
  const { action, weight, bodycomp, photos } = await req.json();
  const [row] = await sql`select value from kv where key = 'kt_share'`;
  let v = row?.value || { weight: false, bodycomp: false, photos: false };
  if (action === "revoke") v = { ...v, token: null };
  else if (action === "create" || !v.token) v = { ...v, token: [...crypto.getRandomValues(new Uint8Array(18))].map(b => b.toString(16).padStart(2, "0")).join("") };
  if (typeof weight === "boolean") v.weight = weight;
  if (typeof bodycomp === "boolean") v.bodycomp = bodycomp;
  if (typeof photos === "boolean") v.photos = photos;
  await save(v);
  return NextResponse.json(v);
}
