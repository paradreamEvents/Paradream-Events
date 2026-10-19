/* The email a spin-wheel winner receives straight after winning (sent by functions/api/spin.js).
 *
 * The prize names and conditions are the same words the wheel shows on the website (/spin.js),
 * so the email never promises anything the site does not. To change the wording, edit PRIZE_COPY.
 */

export const PRIZE_COPY = {
  consult: { title: "A free planning consultation", note: "One-to-one with a Paradream planner." },
  off10:   { title: "10% off your event",           note: "Applied when you book your Christmas event." },
  off20:   { title: "20% off your event",           note: "Applied when you book your Christmas event." },
  candy:   { title: "Free candy",                   note: "Added to your Christmas event booking." },
  santa:   { title: "A free Santa character",       note: "Joins your Christmas event." }
};

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Returns { subject, text, html } or null when the prize is unknown (never send a wrong prize).
export function buildWinnerEmail(prizeId, code, whatsapp = "96181406046") {
  const p = PRIZE_COPY[prizeId];
  if (!p || !code) return null;
  const digits = String(whatsapp).replace(/[^0-9]/g, "");
  const msg = `Hi Paradream! I won "${p.title}" on your Christmas spin wheel. My code: ${code}`;
  const wa = `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
  const phone = digits.startsWith("961") ? "+961 " + digits.slice(3) : "+" + digits;

  const subject = `Your Paradream Christmas prize: ${p.title}`;
  const text = [
    "Congratulations!",
    "",
    `You spun the Christmas wheel on paradreamlb.com and won: ${p.title}.`,
    p.note,
    "",
    `Your prize code: ${code}`,
    "",
    "To claim your prize, message us on WhatsApp and mention your code:",
    wa,
    `(${phone})`,
    "",
    "Tell us the date and the kind of event you are planning, and we will take it from there.",
    "",
    "Merry Christmas,",
    "Paradream Events",
    "Furn El Chebbak, Beirut",
    "paradreamlb.com/christmas"
  ].join("\n");

  const font = "font-family:Arial,Helvetica,sans-serif;";
  const html =
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0d3b2a"><tr><td align="center" style="padding:22px 10px">` +
    `<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;background:#fff8ec;border-radius:12px;overflow:hidden">` +
    `<tr><td bgcolor="#9b1c22" style="padding:26px 28px;${font}color:#ffffff"><div style="font-size:13px;letter-spacing:2px;font-weight:bold;color:#f7dcde">PARADREAM CHRISTMAS 2026</div>` +
    `<div style="font-size:30px;font-weight:bold;padding-top:6px">Congratulations!</div></td></tr>` +
    `<tr><td style="padding:26px 28px 8px;${font}color:#222;font-size:16px;line-height:1.6">You spun the Christmas wheel on paradreamlb.com and won:` +
    `<div style="font-size:26px;font-weight:bold;color:#0d3b2a;padding:10px 0 4px">${esc(p.title)}</div>` +
    `<div style="color:#555;font-size:14px">${esc(p.note)}</div></td></tr>` +
    `<tr><td align="center" style="padding:14px 28px"><div style="${font}display:inline-block;background:#ffffff;border:2px dashed #9b1c22;border-radius:10px;padding:12px 26px">` +
    `<div style="font-size:12px;letter-spacing:2px;color:#777">YOUR PRIZE CODE</div><div style="font-size:28px;font-weight:bold;letter-spacing:3px;color:#9b1c22">${esc(code)}</div></div></td></tr>` +
    `<tr><td align="center" style="padding:6px 28px 8px;${font}color:#222;font-size:15px;line-height:1.6">To claim it, message us on WhatsApp and mention your code.</td></tr>` +
    `<tr><td align="center" style="padding:6px 28px 22px"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#9b1c22" style="border-radius:8px">` +
    `<a href="${wa}" style="display:inline-block;padding:15px 34px;${font}font-size:17px;font-weight:bold;color:#ffffff;text-decoration:none">Claim on WhatsApp</a></td></tr></table>` +
    `<div style="${font}font-size:13px;color:#777;padding-top:10px">${esc(phone)}</div></td></tr>` +
    `<tr><td style="padding:0 28px 22px;${font}color:#222;font-size:14px;line-height:1.6">Tell us the date and the kind of event you are planning, and we will take it from there.<br><br>Merry Christmas,<br><b>Paradream Events</b><br>Furn El Chebbak, Beirut</td></tr>` +
    `</table></td></tr></table>`;

  return { subject, text, html };
}
