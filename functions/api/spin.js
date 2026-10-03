/* Christmas spin wheel, server side (Cloudflare Pages Function: POST /api/spin).
 *
 *  - Takes an email address and gives that address ONE spin, ever.
 *  - Picks the prize here (so the odds cannot be changed from the browser) and makes the claim code.
 *  - Remembers every email in the D1 database (table spin_entries). The one-spin rule is a
 *    database PRIMARY KEY, so two requests for the same email can never both succeed.
 *  - Emails the team about winners (SPIN_NOTIFY = "winners", the default), about every spin
 *    ("all"), or never ("off").
 *
 * Odds and dates: cf-lib/spin-core.js. The wheel's look and wording: /spin.js.
 */
import { PRIZES, SEASON, weightedPick, makeCode, normalizeEmail, inSeason, sha256Hex } from "../../cf-lib/spin-core.js";
import { sendMail } from "../../cf-lib/mail.js";

const HEADERS = { "content-type": "application/json", "cache-control": "no-store" };
const reply = (status, body) => new Response(JSON.stringify(body), { status, headers: HEADERS });

export async function onRequestPost({ request, env, waitUntil }) {
  if (!inSeason(Date.now(), SEASON)) return reply(403, { error: "closed" });

  let body;
  try {
    const text = await request.text();
    if (text.length > 2000) return reply(400, { error: "email" });
    body = JSON.parse(text);
  } catch (e) {
    return reply(400, { error: "email" });
  }
  if (!body || typeof body !== "object") return reply(400, { error: "email" });
  if (body.website) return reply(400, { error: "email" });            // honeypot

  const who = normalizeEmail(body.email);
  if (!who) return reply(400, { error: "email" });

  const prize = weightedPick(PRIZES);
  const code = prize.noPrize ? null : makeCode();
  const key = await sha256Hex(who.canonical);
  const at = new Date().toISOString();

  try {
    // Atomic "create only if this email is new": the one-spin-per-email rule.
    const res = await env.DB
      .prepare("INSERT INTO spin_entries (key, email, prize_id, code, created_at) VALUES (?1, ?2, ?3, ?4, ?5) ON CONFLICT(key) DO NOTHING")
      .bind(key, who.shown, prize.id, code, at)
      .run();
    if (!res.meta || res.meta.changes === 0) return reply(409, { error: "used" });
  } catch (e) {
    console.error("spin: database failed:", e && e.message);
    return reply(500, { error: "server" });
  }

  // Tell the team. Never allowed to hold up or break the visitor's spin.
  const mode = String(env.SPIN_NOTIFY || "winners").toLowerCase();
  if (mode === "all" || (mode === "winners" && code)) {
    const note = sendMail(env, {
      subject: code ? `Spin wheel winner: ${prize.id} (${code})` : "Spin wheel entry (no prize)",
      text: [`Email: ${who.shown}`, `Result: ${prize.id}`, `Code: ${code || "(no prize)"}`, `Time: ${at}`].join("\n"),
      replyTo: who.shown
    });
    if (waitUntil) waitUntil(note);
  }

  return reply(200, { id: prize.id, code });
}

export async function onRequest() {
  return reply(405, { error: "method" });
}
