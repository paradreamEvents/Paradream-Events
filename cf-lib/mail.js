/* Sends the team an email through Resend (https://resend.com) - used by the forms and the spin wheel.
 *
 * Settings (Cloudflare -> the project -> Settings -> Variables and Secrets):
 *   RESEND_API_KEY   secret. Without it nothing is emailed (submissions are still saved).
 *   NOTIFY_TO        who receives the emails, comma-separated      (set in wrangler.toml)
 *   MAIL_FROM        the From line                                  (set in wrangler.toml)
 *   RESEND_API_URL   only for testing; leave unset in production.
 */

export async function sendMail(env, { subject, text, replyTo, attachments }) {
  if (!env.RESEND_API_KEY) return { ok: false, skipped: true };
  const to = String(env.NOTIFY_TO || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!to.length) return { ok: false, skipped: true };

  const body = {
    from: env.MAIL_FROM || "Paradream Website <onboarding@resend.dev>",
    to,
    subject,
    text
  };
  if (replyTo) body.reply_to = replyTo;
  if (attachments && attachments.length) body.attachments = attachments;

  try {
    const r = await fetch(env.RESEND_API_URL || "https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": "Bearer " + env.RESEND_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000)
    });
    if (!r.ok) {
      console.error("mail: Resend refused the message:", r.status, (await r.text()).slice(0, 300));
      return { ok: false };
    }
    return { ok: true };
  } catch (e) {
    console.error("mail: could not reach Resend:", e && e.message);
    return { ok: false };
  }
}

// ArrayBuffer -> base64 without blowing the call stack on large files.
export function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}
