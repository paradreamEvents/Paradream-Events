/* Every enquiry form on the site posts here (Cloudflare Pages Function: POST /api/form).
 *
 *  1. The submission is saved in the D1 database (table submissions) - so a lead is never lost.
 *  2. The team is emailed (through Resend, see cf-lib/mail.js), with the visitor's email as
 *     Reply-To, and the join-us CV attached.
 *  3. The visitor is sent to the thank-you page.
 *
 * Forms are recognised by their hidden "form-name" field. A filled "website" field is a bot.
 */
import { sendMail, toBase64 } from "../../cf-lib/mail.js";

const MAX_REQUEST = 9 * 1024 * 1024;      // whole submission
const MAX_FILE = 7 * 1024 * 1024;         // one attached file
const MAX_FIELDS = 80;
const MAX_VALUE = 4000;

const page = (status, title, message) =>
  new Response(
    `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">` +
    `<title>${title}</title><meta name="robots" content="noindex"></head>` +
    `<body style="font-family:system-ui,sans-serif;max-width:34rem;margin:15vh auto;padding:0 1.2rem;line-height:1.6">` +
    `<h1 style="font-size:1.5rem">${title}</h1><p>${message}</p><p><a href="javascript:history.back()">Go back</a> &middot; <a href="/">Home</a></p></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });

const thanks = () => new Response(null, { status: 303, headers: { "Location": "/thanks", "cache-control": "no-store" } });

const pretty = (key) => key.replace(/[_-]+/g, " ").replace(/^./, (c) => c.toUpperCase());

export async function onRequestPost({ request, env, waitUntil }) {
  if (Number(request.headers.get("content-length") || 0) > MAX_REQUEST) {
    return page(413, "That is too large", "Your message and attachment together are over 9 MB. Please attach a smaller file, or send a link to it instead.");
  }

  let fd;
  try {
    fd = await request.formData();
  } catch (e) {
    return page(400, "We could not read that form", "Please go back and try again.");
  }

  if (String(fd.get("website") || "").trim()) return thanks();           // honeypot: pretend it worked

  const form = String(fd.get("form-name") || "").toLowerCase();
  if (!/^[a-z0-9-]{2,60}$/.test(form)) return page(400, "We could not read that form", "Please go back and try again.");

  // gather the fields (several values for one name = a group of ticked boxes)
  const fields = new Map();
  const files = [];
  for (const [key, value] of fd.entries()) {
    if (key === "form-name" || key === "website") continue;
    if (typeof value === "string") {
      if (!value.trim()) continue;
      if (!fields.has(key) && fields.size >= MAX_FIELDS) continue;
      const list = fields.get(key) || [];
      list.push(value.trim().slice(0, MAX_VALUE));
      fields.set(key, list);
    } else if (value && value.size > 0) {
      files.push({ key, file: value });
    }
  }
  if (files.some((f) => f.file.size > MAX_FILE)) {
    return page(413, "That file is too large", "Attachments can be up to 7 MB. Please attach a smaller file, or send a link to it instead.");
  }

  const first = (k) => (fields.get(k) || [""])[0];
  const name = first("name") || [first("first_name"), first("last_name")].filter(Boolean).join(" ");
  const email = first("email");
  const phone = [first("phone_code"), first("phone")].filter(Boolean).join(" ");
  const at = new Date().toISOString();

  const data = {};
  for (const [k, v] of fields) data[k] = v.length === 1 ? v[0] : v;
  for (const f of files) data[f.key] = `(attached file: ${f.file.name}, ${Math.round(f.file.size / 1024)} KB)`;

  // 1. save
  let rowId = null;
  try {
    const res = await env.DB
      .prepare("INSERT INTO submissions (form, name, email, phone, data, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)")
      .bind(form, name || null, email || null, phone || null, JSON.stringify(data), at)
      .run();
    rowId = res.meta && res.meta.last_row_id;
  } catch (e) {
    console.error("form: database failed:", e && e.message);
  }

  // 2. email the team (after the visitor has been answered)
  const lines = [];
  for (const [k, v] of fields) lines.push(`${pretty(k)}: ${v.join(", ")}`);
  for (const f of files) lines.push(`${pretty(f.key)}: ${f.file.name} (attached)`);
  const text = lines.join("\n") + `\n\n--\nSent from the ${form} form on paradreamlb.com at ${at}.`;

  const send = (async () => {
    const attachments = [];
    for (const f of files) attachments.push({ filename: f.file.name, content: toBase64(await f.file.arrayBuffer()) });
    const result = await sendMail(env, {
      subject: `New ${pretty(form).toLowerCase()}${name ? ": " + name : ""}`,
      text,
      replyTo: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : undefined,
      attachments
    });
    if (result.ok && rowId != null) {
      try { await env.DB.prepare("UPDATE submissions SET emailed = 1 WHERE id = ?1").bind(rowId).run(); } catch (e) { /* ignore */ }
    }
  })();
  if (waitUntil) waitUntil(send); else await send;

  // 3. thank-you page
  return thanks();
}

export async function onRequest() {
  return new Response("This address only accepts form submissions.", { status: 405, headers: { "Allow": "POST" } });
}
