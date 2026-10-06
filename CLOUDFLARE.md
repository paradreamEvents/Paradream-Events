# Hosting Paradream on Cloudflare Pages

The site can be hosted for free on Cloudflare Pages instead of Netlify. This file is the whole setup,
in order. Nothing here changes the live site until the last step.

## What changed
| | Before (Netlify) | Now (Cloudflare) |
|---|---|---|
| Pages | built by `build.py` into the project folder | `PD_TARGET=cloudflare python3 build.py` builds the same site into `dist/` |
| Photos | resized on demand by Netlify | resized once at build time into `dist/_img/` (static files) |
| Forms | Netlify Forms | `functions/api/form.js`: saved in the database **and** emailed to you (CV attached) |
| Spin wheel | `netlify/functions/spin.mjs` + Netlify Blobs | `functions/api/spin.js` + the D1 database (one spin per email is a database rule) |
| Chat bubble | `netlify/functions/assistant.mjs` | `functions/api/assistant.js` (same instructions, same key) |
| Editing in the admin panel | saves to GitHub, Netlify rebuilds | saves to GitHub, Cloudflare rebuilds (about a minute) |

Cloudflare never pauses the whole site for "usage". Pages and photos are unlimited. The only daily limit is on
the functions (spin, forms, chat): 100,000 calls a day. Past that, those three stop until the next day.

## One-time setup

### 1. The database
Cloudflare dashboard -> **Storage & databases** -> **D1 SQL database** -> **Create database**, name it `paradream`.
Open it, go to **Console**, and run the three statements in `migrations/0001_init.sql` one at a time.
Its id (the long code in the address bar after `/databases/`) goes in `wrangler.toml` as `database_id`.
(Command-line alternative: `npx wrangler login`, `npx wrangler d1 create paradream`, `npx wrangler d1 migrations apply paradream --remote`.)

### 2. The Pages project
Cloudflare dashboard -> **Workers & Pages** -> **Create** -> **Pages** -> **Connect to Git** -> pick
`paradreamEvents/Paradream-Events`, production branch `main`.

| Field | Value |
|---|---|
| Framework preset | None |
| Build command | `pip install -r requirements.txt && PD_TARGET=cloudflare python3 build.py` |
| Build output directory | `dist` |

Save and Deploy. The site appears at `https://<project-name>.pages.dev` (kept out of Google on purpose).

### 3. Secrets (project -> Settings -> Variables and Secrets)
- `RESEND_API_KEY` - for the form and winner emails (step 4).
- `ANTHROPIC_API_KEY` - the same key the chat bubble used on Netlify. Optional; without it the chat uses its built-in answers.

Add both as **Secret** type. Plain settings (who gets the emails, etc.) are in `wrangler.toml`.

### 4. Email (Resend)
Sign up at resend.com with the address that should receive the emails (`paradedream@gmail.com`),
create an API key, paste it as `RESEND_API_KEY`. The free plan allows
[3,000 emails a month, at most 100 a day](https://flexprice.io/blog/detailed-resend-pricing-guide).
If the daily cap is hit, nothing is lost: every enquiry is also saved in the database.

`MAIL_FROM` is `onboarding@resend.dev`, Resend's test sender. As far as I know it only delivers to the
address you signed up with - **test this**. If emails do not arrive, verify `paradreamlb.com` in Resend
(it gives you a few DNS records to add in Cloudflare; they do not touch your mailbox records) and set
`MAIL_FROM` in `wrangler.toml` to `Paradream Website <forms@paradreamlb.com>`.

### 5. Try it before switching
Open the `.pages.dev` address. Send a test enquiry, spin the wheel with a test email, open the chat bubble,
click through the pages. Check the email arrived. Nothing about `paradreamlb.com` has changed yet.

### 6. Connect the domain
`paradreamlb.com` was registered through Strikingly, and its DNS lived in Strikingly's dashboard. The domain is now added
to this Cloudflare account (nameservers `collins.ns.cloudflare.com` and `jason.ns.cloudflare.com`, status Active) and its
registration is being transferred to Cloudflare Registrar (started 2026-10-06; it expires 2026-11-08, the transfer adds a year).

Pages project -> **Custom domains** -> add `paradreamlb.com` and `www.paradreamlb.com`. Cloudflare creates the DNS records itself.
Keep the existing TXT records (Google verification, SPF). The old Netlify records (an A record and the `www` CNAME) are already deleted.
There is no working @paradreamlb.com mailbox (the MX target does not exist); email forwarding via Cloudflare Email Routing is an option.
To go back to Netlify, point those two records at Netlify again (its free plan may be paused).

## Day to day
- Edit in the admin panel as before, or push to `main`: Cloudflare rebuilds and publishes by itself.
- Where the enquiries are: your inbox, and the database (dashboard -> **Storage & databases** -> **D1** -> `paradream` ->
  Explore data -> tables `submissions` and `spin_entries`). `emailed = 0` on a row means the email did not go out.
- Spin odds: `cf-lib/spin-core.js`. Wheel look and wording: `spin.js`. Chat instructions: `cf-lib/assistant-system.js`.
- Winner emails: `SPIN_NOTIFY` in `wrangler.toml` - `winners`, `all`, or `off`.

## Trying it on your own computer
```
python build.py --cloudflare                      (builds dist/, about 30 seconds the first time)
npx wrangler d1 migrations apply DB --local       (once)
npx wrangler pages dev                            (http://127.0.0.1:8788)
```
Put test settings in a file called `.dev.vars` (it is never committed), e.g. `RESEND_API_KEY=test`.
Without a key, emails are skipped and everything else still works.

## Old Netlify files
`netlify.toml`, `netlify/functions/` and `dev-server.mjs` are the old setup. They are kept until the move is
finished and checked, then they can be deleted.
