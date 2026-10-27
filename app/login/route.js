export function GET(req) {
  const e = new URL(req.url).searchParams.get("e");
  const msg = e === "slow" ? "Too many tries. Wait 15 minutes." : e ? "That password didn't match." : "";
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>KT Lock-In</title><link rel="manifest" href="/manifest.webmanifest"><meta name="theme-color" content="#0d0f12"><link rel="icon" href="/icon.svg">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@900&family=IBM+Plex+Sans:wght@400;600&display=swap">
<style>:root{color-scheme:dark}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0d0f12;color:#f2efe8;font:16px/1.5 "IBM Plex Sans",system-ui,sans-serif;padding:16px}
form{width:100%;max-width:340px;display:grid;gap:14px}h1{font:900 54px/.9 "Big Shoulders Display",Impact,sans-serif;text-transform:uppercase;margin:0}h1 span{color:#f2b33d}
input{font:inherit;padding:13px 14px;border-radius:10px;border:1px solid #2c333c;background:#161a1f;color:inherit}button{font:600 16px inherit;padding:13px;border-radius:10px;border:0;background:#f2b33d;color:#1a1204;cursor:pointer}
p{margin:0;color:#ff7b6b;min-height:1.5em}input:focus-visible,button:focus-visible{outline:2px solid #f2b33d;outline-offset:2px}</style></head>
<body><form method="post" action="/api/login"><h1>KT<br><span>Lock-In</span></h1><label for="pw">Password</label><input id="pw" name="password" type="password" autocomplete="current-password" required autofocus><button type="submit">Open</button><p>${msg}</p></form></body></html>`, { headers: { "content-type": "text/html; charset=utf-8" } });
}
