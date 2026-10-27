import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.NEON_DATABASE_URL;
export const sql = url ? neon(url) : null;

let ready = null;
export function ensure() {
  if (!sql) throw new Error("no_database");
  ready ??= (async () => {
    await sql`create table if not exists kv (key text primary key, value jsonb not null, updated_at timestamptz default now())`;
    await sql`create table if not exists weigh_ins (day date primary key, weight real, bf real, ffm real, visceral real, source text default 'manual')`;
    await sql`create table if not exists daily (day date primary key, rhr real, hrv real, steps int, sleep_min int)`;
    await sql`create table if not exists photos (id text primary key, taken_on date not null, data text not null, created_at timestamptz default now())`;
    await sql`create table if not exists google (id int primary key default 1, refresh_token text, access_token text, expires_at bigint, last_sync timestamptz, last_error text)`;
  })().catch(e => { ready = null; throw e; });
  return ready;
}
