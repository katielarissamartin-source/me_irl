const enc = new TextEncoder();
const COOKIE = "kt_session";
const MAX_AGE = 60 * 60 * 24 * 90;

async function key() {
  return crypto.subtle.importKey("raw", enc.encode(process.env.SESSION_SECRET || "dev"), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export async function makeToken() {
  const exp = String(Date.now() + MAX_AGE * 1000);
  const sig = b64(await crypto.subtle.sign("HMAC", await key(), enc.encode(exp)));
  return `${exp}.${sig}`;
}

export async function validToken(tok) {
  if (!tok) return false;
  const [exp, sig] = tok.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const expect = b64(await crypto.subtle.sign("HMAC", await key(), enc.encode(exp)));
  return expect === sig;
}

export const cookieName = COOKIE;
export const cookieOpts = { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: MAX_AGE };
