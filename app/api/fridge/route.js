import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(req) {
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const { image, keys } = await req.json();
  const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(image || "");
  if (!m || !keys) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: "claude-haiku-5-5",
      max_tokens: 300,
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: m[1], data: m[2] } },
        { type: "text", text: `This is a photo of someone's fridge, freezer or pantry. Which of these ingredients are visible?\n${keys}\nReply with only a JSON array of matching keys, e.g. ["tofu","rice"]. Only include items you can actually see.` }
      ] }]
    })
  });
  const j = await r.json();
  if (!r.ok) return NextResponse.json({ error: "scan_failed" }, { status: 502 });
  const text = (j.content || []).map(c => c.text || "").join("");
  const arr = text.slice(text.indexOf("["), text.lastIndexOf("]") + 1);
  try { return NextResponse.json({ keys: JSON.parse(arr) }); } catch { return NextResponse.json({ keys: [] }); }
}
