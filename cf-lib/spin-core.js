/* Spin wheel rules shared by functions/api/spin.js and the tests.
 * Plain JavaScript with no Node-only imports, so it runs on Cloudflare Workers.
 *
 * To change the odds, edit PRIZES below. The ids must match the wheel in /spin.js
 * (its order and wording live there). Weights are whole numbers; they need not add up to 100. */

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

// Unbiased random whole number 0..n-1 from the platform's secure generator.
export function randInt(n) {
  const a = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / n) * n;
  do { crypto.getRandomValues(a); } while (a[0] >= limit);
  return a[0] % n;
}

export function weightedPick(prizes, rand = randInt) {
  let total = 0;
  for (const p of prizes) total += p.weight;
  let r = rand(total);                       // 0 .. total-1
  for (const p of prizes) {
    if (r < p.weight) return p;
    r -= p.weight;
  }
  return prizes[prizes.length - 1];
}

export function makeCode(rand = randInt) {
  let out = "";
  for (let i = 0; i < 5; i++) out += CODE_CHARS.charAt(rand(CODE_CHARS.length));
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

// Padded by a day on each side: a visitor's clock (which decides when the wheel
// appears) and this server's clock (UTC) disagree about midnight.
const PAD_MS = 864e5;
export function inSeason(nowMs, season = SEASON) {
  const from = new Date(season.start + "T00:00:00").getTime();
  const to = new Date(season.end + "T00:00:00");
  to.setDate(to.getDate() + 1);              // `end` is inclusive
  return nowMs >= from - PAD_MS && nowMs < to.getTime() + PAD_MS;
}

export async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
