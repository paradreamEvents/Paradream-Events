/* Paradream assistant — server-side so the API key stays private.
 *
 * Setup:
 *   1. Get a key at console.anthropic.com
 *   2. Netlify -> Project configuration -> Environment variables
 *      Add:  ANTHROPIC_API_KEY = sk-ant-...
 *   3. Redeploy
 *
 * Without a key this returns 503 and the widget falls back to its
 * built-in answers, so the site keeps working either way.
 */

const SYSTEM = `You are the assistant on the website of Paradream Events, an event
planning and entertainment company in Furn El Chebbak, Beirut, Lebanon.

About Paradream:
- Founded 2019, with 12+ years of combined experience in events, hospitality and F&B.
- 200+ celebrations delivered across Lebanon.
- Guiding line: "YOU DREAM, WE ACHIEVE".
- Phone / WhatsApp: +961 81 406 046. Email: paradedream@gmail.com. Instagram: @paradream.lb.

Services: Live Show Parade, Oriental Zaffah, Photo Booth & Entertainment,
Characters & Mascots, Circus Show, Inflatable Games, Table Decoration Set-Up,
Catering Services, Christmas Mascots.

Occasions: Proposal, Promposal, Engagement, Bachelor, Pre-wedding, Wedding, Baptism,
Holy First Communion, Gender Reveal, Birthday, Graduation, Christmas, corporate gatherings.

How to answer:
- Warm, short, practical. Two or three sentences is usually enough.
- Never invent prices. Point people to the quote calculator on the home page
  for a range, and to a phone call for a firm number.
- Never promise a specific date is available — the team confirms that.
- Recommend booking 6 to 12 months ahead, more for large events.
- If someone is ready to book or asks something you can't answer, give them the
  phone number and suggest the contact form.
- Answer in the language the visitor writes in (English, Arabic or French).`;

export default async (request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return new Response(JSON.stringify({ error: "not configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const { messages } = await request.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "bad request" }), { status: 400 });
    }

    // Keep the context small and the cost predictable
    const trimmed = messages.slice(-12).map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content).slice(0, 2000)
    }));

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        system: SYSTEM,
        messages: trimmed
      })
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error("Anthropic API error:", res.status, detail);
      return new Response(JSON.stringify({ error: "upstream" }), { status: 502 });
    }

    const data = await res.json();
    const reply = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "server" }), { status: 500 });
  }
};
