/* Paradream - Christmas spin wheel, server side.
 *
 * What it does
 *   - Takes an email address, and gives that address ONE spin, ever.
 *   - Picks the prize here on the server (so the odds cannot be changed from
 *     the browser) and makes the claim code.
 *   - Remembers every email in Netlify Blobs (store: "spin-entries").
 *   - Sends each new entry to the Netlify form "spin-entry" so it shows up
 *     under Forms (and can email you) like the other forms on the site.
 *
 * Setup: none. Netlify Blobs works on a deployed site without any keys.
 * Locally, run  node dev-server.mjs  (see README).
 *
 * To change the odds, edit PRIZES below. The ids must match the wheel in
 * spin.js. The wheel's order and the prize wording live in spin.js.
 */

import { createHash, randomInt } from "node:crypto";

/* ── Odds ───────────────────────────────────────────────────── */
// Whole numbers; they do not have to add up to 100 (these do).
// noPrize: true = the wheel lands there but the visitor wins nothing.
export const PRIZES = [
  { id: "again-a", weight: 30, noPrize: true },   // Try Again
  { id: "consult", weight: 10 },                  // Free consultation
  { id: "off10",   weight: 10 },                  // 10% off
  { id: "off20",   weight: 5 },                   // 20% off
  { id: "again-b", weight: 30, noPrize: true },   // Try Again
  { id: "candy",   weight: 10 },                  // Free candy
  { id: "santa",   weight: 5 }                    // Free Santa character
];

// Spins are refused outside these dates. Keep in step with spin.js.
export const SEASON = { start: "2026-10-01", end: "2026-12-26" };

const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";   // no 0/O/1/I/L lookalikes
const STORE_NAME = "spin-entries";

/* ── Pure helpers (tested directly) ─────────────────────────── */
export function weightedPick(prizes, randInt) {
  let total = 0;
  for (const p of prizes) total += p.weight;
  let r = randInt(total);                    // 0 .. total-1
  for (const p of prizes) {
    if (r < p.weight) return p;
    r -= p.weight;
  }
  return prizes[prizes.length - 1];
}

export function makeCode(randInt) {
  let out = "";
  for (let i = 0; i < 5; i++) out += CODE_CHARS.charAt(randInt(CODE_CHARS.length));
  return "PD-" + out;
}

const EMAIL_RE = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

// Returns { shown, canonical } or null when it is not a usable address.
// `canonical` is what "the same person" means: case, +tags and (for Gmail)
// dots are ignored, so jo.e+1@gmail.com and joe@googlemail.com are one entry.
export function normalizeEmail(raw) {
  if (typeof raw !== "string") return null;
  const shown = raw.trim().toLowerCase();
  if (shown.length < 6 || shown.length > 254 || !EMAIL_RE.test(shown)) return null;
  const at = shown.lastIndexOf("@");
  let local = shown.slice(0, at);
  let domain = shown.slice(at + 1);
  if (local.length > 64 || domain.split(".").pop().length < 2) return null;
  const plus = local.indexOf("+");
  if (plus > 0) local = local.slice(0, plus);
  if (domain === "googlemail.com") domain = "gmail.com";
  if (domain === "gmail.com") local = local.replace(/\./g, "");
  if (!local) return null;
  return { shown, canonical: local + "@" + domain };
}

// Padded by a day on each side: a visitor's clock (which decides when the
// wheel appears) and this server's clock (UTC) disagree about midnight.
const PAD_MS = 864e5;
export function inSeason(nowMs, season = SEASON) {
  const from = new Date(season.start + "T00:00:00").getTime();
  const to = new Date(season.end + "T00:00:00");
  to.setDate(to.getDate() + 1);              // `end` is inclusive
  return nowMs >= from - PAD_MS && nowMs < to.getTime() + PAD_MS;
}

/* ── The handler ────────────────────────────────────────────── */
const JSON_HEADERS = { "content-type": "application/json", "cache-control": "no-store" };
const reply = (status, body) => new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });

export function createHandler({
  getStore,
  submitLead = async () => {},
  now = () => Date.now(),
  randInt = randomInt,
  prizes = PRIZES,
  season = SEASON
}) {
  return async function handler(request) {
    if (request.method !== "POST") return reply(405, { error: "method" });
    if (!inSeason(now(), season)) return reply(403, { error: "closed" });

    let body;
    try {
      const text = await request.text();
      if (text.length > 2000) return reply(400, { error: "email" });
      body = JSON.parse(text);
    } catch (e) {
      return reply(400, { error: "email" });
    }
    if (!body || typeof body !== "object") return reply(400, { error: "email" });
    if (body.website) return reply(400, { error: "email" });          // honeypot

    const who = normalizeEmail(body.email);
    if (!who) return reply(400, { error: "email" });

    const prize = weightedPick(prizes, randInt);
    const code = prize.noPrize ? null : makeCode(randInt);
    const key = createHash("sha256").update(who.canonical).digest("hex");
    const entry = { email: who.shown, id: prize.id, code, at: new Date(now()).toISOString() };

    try {
      const store = getStore(STORE_NAME);
      // Atomic "create only if this email is new" - the one-spin-per-email rule.
      const result = await store.setJSON(key, entry, { onlyIfNew: true });
      if (result && result.modified === false) return reply(409, { error: "used" });
    } catch (e) {
      console.error("spin: store failed:", e && e.message);
      return reply(500, { error: "server" });
    }

    // Tell the owner. Never allowed to hold up or break the visitor's spin.
    try {
      await submitLead(entry, new URL(request.url));
    } catch (e) {
      console.error("spin: lead not sent:", e && e.message);
    }
    return reply(200, { id: prize.id, code });
  };
}

/* ── Production wiring ──────────────────────────────────────── */
// Posts the entry to the static form "spin-entry" (declared in the page
// footer by build.py) so Netlify Forms records it and sends notifications.
async function submitToNetlifyForm(entry, url) {
  if (!/^https:$/.test(url.protocol) || /^(localhost|127\.)/.test(url.hostname)) return;
  const body = new URLSearchParams({
    "form-name": "spin-entry",
    email: entry.email,
    prize: entry.id,
    code: entry.code || "(no prize)"
  });
  await fetch(url.origin + "/", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(2500)
  });
}

export default async (request) => {
  const { getStore } = await import("@netlify/blobs");
  return createHandler({ getStore, submitLead: submitToNetlifyForm })(request);
};
