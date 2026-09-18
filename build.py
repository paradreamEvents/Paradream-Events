#!/usr/bin/env python3
"""Builds the Paradream static site. Run: python3 build.py"""
import os, html, json
from urllib.parse import quote

# Everything editable lives in content.json — the admin panel writes to it.
CONTENT = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                      "content.json"), encoding="utf-8"))
SITE = CONTENT["site"]

OUT = os.path.dirname(os.path.abspath(__file__))

CDN = "https://custom-images.strikinglycdn.com/res/hrscywv4p/image/upload"
LOGO = "images/logo-mark.png"
FOOTER_LOGO = "images/logo-footer.png"
OG = "https://paradreamlb.com/images/og-image.jpg"

# ─────────────────────────────────────────────────────────────────────
# SOCIAL LINKS — paste the real profile URL between the quotes.
# An icon with an empty URL is simply not shown, so nothing on the site
# ever links to a page that doesn't exist.
# ─────────────────────────────────────────────────────────────────────
SOCIALS = CONTENT["socials"]

# The gallery finds its own photos: drop images/gallery-1.jpg, gallery-2.jpg ...
# into the images folder and they appear. No code change needed.
# This is only how many show before the "Show more" button.
GALLERY_VISIBLE = 12

PHONE_DISPLAY = SITE["phone_display"]
PHONE_TEL     = SITE["phone_tel"]
EMAIL         = SITE["email"]

# The quote calculator (main.js) reads its numbers from window.PRICING, built
# here from content.json so the admin panel can edit prices like everything else.
def _pricing_js():
    p = CONTENT["pricing"]
    services = {}
    for s in p["services"]:
        entry = {"label": s["label"], "type": s["type"],
                  "price": [s["price_low"], s["price_high"]]}
        if s.get("unit"):
            entry["unit"] = s["unit"]
        if s["type"] == "unit":
            entry["def"] = s["default"]
            entry["max"] = s["max"]
        services[s["key"]] = entry
    return json.dumps({
        "currency": p["currency"],
        "staff": {"ratePerPerson": [p["staff_rate_low"], p["staff_rate_high"]],
                  "guestsPerStaff": p["guests_per_staff"]},
        "coordination": [p["coordination_low"], p["coordination_high"]],
        "outsideBeirut": [p["outside_beirut_low"], p["outside_beirut_high"]],
        "services": services
    })

PRICING_TAG = f'<script>var PRICING = {_pricing_js()};</script>'

ICONS = {
 "instagram": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5.2"/><circle cx="12" cy="12" r="4.1"/><circle cx="17.3" cy="6.7" r="1.15" fill="currentColor" stroke="none"/></svg>',
 "tiktok":    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.1 2h-3.2v13.3a2.45 2.45 0 1 1-2.1-2.42v-3.2a5.6 5.6 0 1 0 5.3 5.59V9.2a7.5 7.5 0 0 0 4.1 1.22V7.2a4.35 4.35 0 0 1-4.1-4.3V2Z"/></svg>',
 "facebook":  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.6 21.5v-8.6h2.9l.44-3.36h-3.34V7.4c0-.97.27-1.63 1.66-1.63h1.78V2.76a23.6 23.6 0 0 0-2.6-.13c-2.56 0-4.32 1.57-4.32 4.44v2.47H7.2v3.36h2.92v8.6h3.48Z"/></svg>',
 "linkedin":  '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="2.9" y="8.6" width="3.8" height="11.9" rx=".3"/><circle cx="4.8" cy="4.8" r="2.2"/><path d="M10 8.6h3.6v1.63a4 4 0 0 1 3.55-1.87c2.56 0 4.45 1.72 4.45 5.28v6.86h-3.85v-5.5c0-1.42-.53-2.34-1.75-2.34-.94 0-1.5.63-1.75 1.25-.09.22-.11.53-.11.84v5.75H10V8.6Z"/></svg>',
}

NAMES = {"instagram": "Instagram", "tiktok": "TikTok",
         "facebook": "Facebook", "linkedin": "LinkedIn"}

def social_links():
    out = []
    for key, url in SOCIALS.items():
        if not url.strip():
            continue
        out.append(
            f'        <a href="{url}" target="_blank" rel="noopener" '
            f'aria-label="Paradream on {NAMES[key]}">\n'
            f'          {ICONS[key]}\n        </a>')
    missing = [NAMES[k] for k, v in SOCIALS.items() if not v.strip()]
    if missing:
        print("  ! no URL yet for:", ", ".join(missing), "- icon hidden")
    return "\n".join(out)


def img(slug, ext="png", w=1800, q="auto:best"):
    # fl_lossy removed and quality raised: this asks Strikingly's CDN for the
    # least-compressed version it still holds. c_limit means it never upscales,
    # so if the stored original is smaller, that is genuinely all there is.
    return f"{CDN}/c_limit,h_9000,w_{w},f_auto,q_{q}/17545664/{slug}.{ext}"

def hero_img(slug, ext="png"):
    return img(slug, ext, w=2600, q="auto:best")

import hashlib

_stamps = {}
def stamp(path):
    """Short hash of the file, so the URL changes only when the photo does.
    Without this, Netlify's image cache can keep serving an old version."""
    if path not in _stamps:
        full = os.path.join(os.path.dirname(os.path.abspath(__file__)), path)
        try:
            with open(full, "rb") as fh:
                _stamps[path] = hashlib.md5(fh.read()).hexdigest()[:8]
        except OSError:
            _stamps[path] = "0"
    return _stamps[path]

def media(src, w):
    """Local file -> Netlify Image CDN. Anything else -> used as-is."""
    if not src:
        return ""
    return cdn(src, w) if src.startswith("images/") else src

def cdn(path, w, extra="&amp;fit=cover&amp;q=90"):
    return f"/.netlify/images?url=/{path}&amp;w={w}{extra}&amp;v={stamp(path)}"

def responsive(path, alt, sizes, widths, ratio_w, ratio_h, cls=""):
    srcset = ",\n              ".join(f"{cdn(path, w)} {w}w" for w in widths)
    c = f' class="{cls}"' if cls else ""
    return (f'      <img{c} src="{cdn(path, widths[len(widths)//2])}"\n'
            f'           data-full="{cdn(path, 1600, "&amp;q=85")}"\n'
            f'           srcset="{srcset}"\n'
            f'           sizes="{sizes}"\n'
            + (f'           width="{ratio_w}" height="{ratio_h}"\n' if ratio_w else "")
            + f'           alt="{alt}" loading="lazy" decoding="async">')

NAV = [
    ("index.html", "Home"),
    ("why-paradream.html", "Why Paradream?"),
    ("our-services.html", "Our Services"),
    ("gallery.html", "Gallery"),
    ("contact-us.html", "Contact Us"),
]

def header(current):
    links = "\n".join(
        f'      <a href="{h}"{" aria-current=\"page\"" if h == current else ""}>{t}</a>'
        for h, t in NAV
    )
    return f"""<header class="site-header">
  <div class="header-inner">
    <a class="brand" href="index.html">
      <img src="{LOGO}" alt="Paradream Events">
      <span class="brand-tag">You dream, we achieve</span>
    </a>
    <button class="nav-toggle" aria-expanded="false" aria-controls="site-nav" aria-label="Menu">&#9776;</button>
    <nav class="site-nav" id="site-nav" aria-label="Main">
{links}
    </nav>
  </div>
</header>"""

FOOTER = f"""<footer class="site-footer">
  <div class="footer-inner">
    <div>
      <img class="footer-logo" src="{FOOTER_LOGO}" alt="">
      <h4>Paradream Events</h4>
      <p>Furn El Chebbak<br>Beirut, Lebanon.<br>+12 years experience in events, hospitality, and f&amp;b services!</p>
    </div>
    <div>
      <h4>Events</h4>
      <ul>
        <li><a href="occasions.html#engagement">Engagement</a></li>
        <li><a href="occasions.html#bachelor">Bachelor</a></li>
        <li><a href="occasions.html#wedding">Wedding</a></li>
        <li><a href="occasions.html#communion">Holy First Communion</a></li>
        <li><a href="occasions.html#baptism">Baptism</a></li>
        <li><a href="occasions.html#birthday">Birthday</a></li>
        <li><a href="occasions.html#christmas">Christmas</a></li>
      </ul>
    </div>
    <div>
      <h4>Quick Links</h4>
      <ul>
        <li><a href="index.html">Home</a></li>
        <li><a href="why-paradream.html">Why Paradream?</a></li>
        <li><a href="our-services.html">Our Services</a></li>
        <li><a href="gallery.html">Gallery</a></li>
        <li><a href="contact-us.html">Contact Us</a></li>
        <li><a href="join-us.html">Join Our Team</a></li>
      </ul>
    </div>
    <div>
      <h4>Get in touch</h4>
      <div class="socials">
{social_links()}
      </div>

      <p class="contact-line">
        <span class="ci" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.2.4 2.4.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .7-.2 1l-2.3 2.2Z"/></svg>
        </span>
        <a href="tel:+96181406046">81406046</a>
      </p>
      <p class="contact-line">
        <span class="ci" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 4.2-8 5-8-5V6l8 5 8-5v2.2Z"/></svg>
        </span>
        <a href="mailto:paradedream@gmail.com">paradedream@gmail.com</a>
      </p>
    </div>
  </div>
  <div class="footer-bottom">
    <span>&copy; <span id="year">2026</span> Paradream Events</span>
    <a href="terms.html">Terms &amp; Conditions</a>
    <a href="privacy.html">Privacy Policy</a>
    <span class="spacer"></span>
    <a href="tel:+96181406046">Call Us</a>
  </div>
</footer>

<div class="cookie" id="cookie-bar" hidden>
  <p><strong>Cookie Use.</strong> We use cookies to ensure a smooth browsing experience. By continuing we assume you accept the use of cookies.</p>
  <button class="btn btn-light" id="cookie-accept" type="button">Accept</button>
</div>

<div class="fabs">
  <a class="fab fab-wa" href="https://wa.me/96181406046" target="_blank" rel="noopener" aria-label="WhatsApp">
    <svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.4-.7-1.7-.8s-.4-.1-.5.1-.6.8-.8 1-.3.2-.5 0a6.7 6.7 0 0 1-2-1.2 7.4 7.4 0 0 1-1.4-1.7c-.1-.3 0-.4.1-.5l.4-.5.2-.4v-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4 8.6 8.6 0 0 0 1.5.5 3.6 3.6 0 0 0 1.7.1 2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3Z"/></svg>
  </a>
  <button class="fab fab-ai" id="fab-ai" aria-label="Ask Paradream">
    <svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 0 0-9 9 8.8 8.8 0 0 0 1.3 4.6L3 21l4.6-1.2A9 9 0 1 0 12 3Zm-3.5 8.2a1.3 1.3 0 1 1 1.3-1.3 1.3 1.3 0 0 1-1.3 1.3Zm3.5 0a1.3 1.3 0 1 1 1.3-1.3 1.3 1.3 0 0 1-1.3 1.3Zm3.5 0a1.3 1.3 0 1 1 1.3-1.3 1.3 1.3 0 0 1-1.3 1.3Z"/></svg>
  </button>
</div>

<div class="assistant" id="assistant" hidden role="dialog" aria-label="Paradream assistant">
  <div class="as-head">
    <div>
      <strong>Ask Paradream</strong>
      <small>Services, pricing, dates</small>
    </div>
    <button type="button" aria-label="Close">&times;</button>
  </div>
  <div class="as-log"></div>
  <div class="as-chips">
    <button type="button">How much does a wedding cost?</button>
    <button type="button">How far in advance should I book?</button>
    <button type="button">What is an oriental zaffah?</button>
  </div>
  <form class="as-form">
    <input type="text" placeholder="Type your question..." aria-label="Your question" autocomplete="off">
    <button type="submit" aria-label="Send">
      <svg viewBox="0 0 24 24"><path d="M2 21 23 12 2 3v7l15 2-15 2Z"/></svg>
    </button>
  </form>
</div>

{PRICING_TAG}
<script src="main.js"></script>"""


def analytics_tag():
    a = CONTENT.get("analytics", {})
    p = a.get("provider", "")
    if p == "cloudflare" and a.get("cloudflare_token"):
        return ('<script defer src="https://static.cloudflareinsights.com/beacon.min.js" '
                'data-cf-beacon=\'{"token": "%s"}\'></script>' % a["cloudflare_token"])
    if p == "ga4" and a.get("ga4_id"):
        gid = a["ga4_id"]
        return (f'<script async src="https://www.googletagmanager.com/gtag/js?id={gid}"></script>'
                f'<script>window.dataLayer=window.dataLayer||[];'
                f'function gtag(){{dataLayer.push(arguments);}}'
                f'gtag("js",new Date());gtag("config","{gid}");</script>')
    return ""

def page(filename, title, description, body, current=None):
    doc = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{description}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{description}">
<meta property="og:image" content="{OG}">
<meta property="og:type" content="website">
<meta name="theme-color" content="#ffffff">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="styles.css">
{analytics_tag()}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
{header(current or filename)}
<main id="main">
{body}
</main>
{FOOTER}
</body>
</html>
"""
    with open(os.path.join(OUT, filename), "w", encoding="utf-8") as f:
        f.write(doc)
    print("wrote", filename)


faq_html = "\n".join(
    f"""      <details>
        <summary>{f["q"]}</summary>
        <p>{f["a"]}</p>
      </details>""" for f in CONTENT["faqs"])

counters_html = "\n".join(
    f'      <div class="counter"><b data-count="{c["number"]}" '
    f'data-suffix="{c.get("suffix","")}">0</b><span>{c["label"]}</span></div>'
    for c in CONTENT["counters"])

# The definitive list of gallery photos, straight from the images folder.
# main.js used to guess this by probing sequential numbers (gallery-1.jpg,
# gallery-2.jpg, ...) and stopping at the first miss — which silently emptied
# the whole gallery the moment a low number was deleted but a higher one
# survived. Handing over the real list removes that whole failure mode.
import glob as _glob
_img_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "images")
_gallery_ids = sorted(
    os.path.basename(p).replace("gallery-", "").replace(".jpg", "")
    for p in _glob.glob(os.path.join(_img_dir, "gallery-*.jpg"))
)
gallery_stamps = json.dumps({
    gid: stamp("images/gallery-" + gid + ".jpg") for gid in _gallery_ids
})
gallery_ids_json = json.dumps(_gallery_ids)

GALLERY_ALBUMS = CONTENT.get("gallery_albums", [])
GALLERY_PHOTO_ALBUMS = CONTENT.get("gallery_photo_albums", {})
gallery_photo_albums_json = json.dumps(GALLERY_PHOTO_ALBUMS)
gallery_tabs_html = "\n".join(
    f'      <button type="button" class="gallery-tab{" active" if i == 0 else ""}" data-album="{"" if a == "All" else a}">{a}</button>'
    for i, a in enumerate(["All"] + GALLERY_ALBUMS)
)

def hero_bg(slide):
    src = slide.get("image") or ""
    if src.startswith("images/"):
        return cdn(src, 2200, "&amp;q=90")
    if slide.get("strikingly"):
        return hero_img(slide["strikingly"])
    return src

def hero_slide_html(i, sl):
    active = " active" if i == 0 else ""
    bg = hero_bg(sl)
    pos = sl.get("position", "center")
    return (
        '  <div class="slide' + active + '" style="background-image:url(&#39;' + bg + '&#39;);'
        'background-position:' + pos + '">\n'
        '    <div class="slide-inner">\n'
        '      <h1>' + sl.get("title", "") + '</h1>\n'
        '      <p>' + sl.get("text", "") + '</p>\n'
        '      <a class="btn btn-solid" href="' + sl.get("link", "contact-us.html") + '">'
        + sl.get("cta", "Book Now!") + '</a>\n'
        '    </div>\n'
        '  </div>'
    )

PAGES = CONTENT["pages"]

hero_slides = "\n".join(hero_slide_html(i, sl) for i, sl in enumerate(CONTENT["hero"]))

hero_dots = "\n".join(
    '    <button role="tab" aria-selected="' + ("true" if i == 0 else "false") +
    '" aria-label="Slide ' + str(i + 1) + '"></button>'
    for i in range(len(CONTENT["hero"]))
)

how_steps_html = "\n".join(
    f"""      <div class="step reveal{' reveal-d' + str(i) if i else ''}">
        <p class="step-num">{i + 1}</p>
        <h3>{s["h"]}</h3>
        <p>{s["p"]}</p>
      </div>""" for i, s in enumerate(PAGES["home"]["how_steps"]))

# ── Home ────────────────────────────────────────────────────
HOME_BLOCKS = {
"hero": f"""<section class="hero-slider">
{hero_slides}
  <div class="slider-dots" role="tablist" aria-label="Slides">
{hero_dots}
  </div>
  <p class="scroll-cue">Scroll</p>
</section>

<div class="ticker" aria-hidden="true">
  <div class="ticker-track">
    <span>Proposal</span><span>Engagement</span><span>Bachelor</span><span>Wedding</span>
    <span>Baptism</span><span>First Communion</span><span>Gender Reveal</span>
    <span>Birthday</span><span>Christmas</span>
    <span>Proposal</span><span>Engagement</span><span>Bachelor</span><span>Wedding</span>
    <span>Baptism</span><span>First Communion</span><span>Gender Reveal</span>
    <span>Birthday</span><span>Christmas</span>
  </div>
</div>""",

"services_teaser": f"""<section class="band">
  <div class="band-inner reveal">
    <h2>{PAGES["home"]["services_teaser_h"]}</h2>
    <p class="lede">{PAGES["home"]["services_teaser_p"]}</p>
    <a class="btn btn-outline" href="our-services.html">Our Services</a>
  </div>
</section>""",

"about": f"""<section class="band about">
  <div class="band-inner reveal">
    <h2>About Us</h2>
    <p>{CONTENT["about"]}</p>
  </div>
</section>

<section class="band">
  <div class="band-inner reveal">
    <div class="counters">
{counters_html}
    </div>
    </div>
  </div>
</section>""",

"how": f"""<section class="band band-cream">
  <div class="band-inner reveal">
    <h2>{PAGES["home"]["how_h"]}</h2>
    <div class="steps">
{how_steps_html}
    </div>
  </div>
</section>""",

"calculator": f"""<section class="band band-cream">
  <div class="band-inner reveal">
    <h2>{PAGES["home"]["calc_h"]}</h2>
    <p class="lede">{PAGES["home"]["calc_p"]}</p>

    <div class="calc" id="calc">
      <div class="calc-panel">
        <div class="calc-group">
          <label for="calc-occasion">Occasion</label>
          <select id="calc-occasion">
            <option>Wedding</option>
            <option>Engagement</option>
            <option>Proposal</option>
            <option>Bachelor</option>
            <option>Holy First Communion</option>
            <option>Baptism</option>
            <option>Gender Reveal</option>
            <option>Birthday</option>
            <option>Christmas</option>
            <option>Other</option>
          </select>
        </div>

        <div class="calc-group">
          <label for="calc-guests">Guests — <span class="guest-readout" id="calc-guest-out">120</span></label>
          <input type="range" id="calc-guests" min="10" max="600" step="10" value="120">
        </div>

        <div class="calc-group">
          <p class="calc-legend">What do you want included?</p>
          <div class="opts" id="calc-options"></div>
        </div>

        <div class="calc-group">
          <label class="opt opt-travel">
            <input type="checkbox" id="calc-travel">
            <span>Event is outside Beirut<small>Travel supplement</small></span>
          </label>
        </div>
      </div>

      <aside class="calc-out">
        <h3>Your estimate</h3>
        <p class="calc-total" id="calc-total"></p>
        <ul class="calc-lines" id="calc-lines"></ul>
        <a class="btn btn-solid" id="calc-send" href="contact-us.html">Send this to Paradream</a>
        <p class="calc-note">Indicative only. Final pricing depends on venue, date,
        timing and exactly what you want. We'll confirm on a call.</p>
      </aside>
    </div>
  </div>
</section>""",

"faq": f"""<section class="band">
  <div class="band-inner reveal">
    <h2>Frequently Asked Questions</h2>
    <div class="faq">
{faq_html}
    </div>
  </div>
</section>"""
}

home = "\n\n".join(HOME_BLOCKS[k] for k in PAGES["home"]["sections"] if k in HOME_BLOCKS)
page("index.html", "Paradream Events",
     "Paradream Events — Lebanon's trusted event planning company with 12+ years of experience. We plan weddings, engagements, birthdays, baptisms, Christmas events, and more. Based in Beirut. Contact us today!",
     home)


# ── Why Paradream ───────────────────────────────────────────
TESTIMONIALS = [(x["image"], x["name"], x["text"]) for x in CONTENT["testimonials"]]

quotes = "\n".join(f"""      <figure class="quote reveal">
        <img src="{media(src, 900)}" alt="" loading="lazy">
        <div>
          <blockquote>{text}</blockquote>
          <cite>{name}</cite>
        </div>
      </figure>""" for src, name, text in TESTIMONIALS)

WHY = PAGES["why-paradream"]
WHY_BLOCKS = {
"intro": f"""<section class="band">
  <div class="band-inner">
    <img src="{media("images/why-team.png", 900)}" alt="Paradream team at work" style="border-radius:3px;margin:0 auto 2.2rem">
    <p class="lede">{WHY["story"]}</p>
  </div>
</section>""",

"testimonials": f"""<section class="band band-cream">
  <div class="band-inner">
    <p class="stat">{WHY["stat"]}</p>
    <h2>{WHY["clients_h"]}</h2>
    <div class="quotes">
{quotes}
    </div>
  </div>
</section>""",

"what": f"""<section class="band">
  <div class="band-inner">
    <h2>{WHY["what_h"]}</h2>
    <p class="lede">{WHY["what_p"]}</p>
    <a class="btn btn-outline" href="occasions.html">See all occasions</a>
  </div>
</section>"""
}

why = f"""
<section class="page-head">
  <h1>{WHY["h1"]}</h1>
  <p>{WHY["sub"]}</p>
</section>

""" + "\n\n".join(WHY_BLOCKS[k] for k in WHY["sections"] if k in WHY_BLOCKS)
page("why-paradream.html", "Why Paradream? | Top Event Planner &amp; Parade Experts in Lebanon",
     "Discover why Paradream is Lebanon's top event planner. Unique parades, dazzling shows, and unforgettable zaffahs for every special occasion.",
     why)


# ── Occasions ───────────────────────────────────────────────
OCCASIONS = [(x["slug"], x["title"], x["image"], x["text"]) for x in CONTENT["occasions"]]

# Occasions with their own dedicated booking form; everyone else still
# lands on the generic contact form until theirs is built.
DEDICATED_FORMS = {"proposal": "proposal.html", "engagement": "engagement.html",
                    "bachelor": "bachelor.html", "wedding": "wedding.html"}

occ_html = "\n".join(f"""      <article class="occasion reveal" id="{slug}">
        <img class="occasion-img" src="{media(src, 1200)}" alt="{name}" loading="lazy">
        <div>
          <h3>{name}</h3>
          <p>{text}</p>
          <a class="btn btn-outline" href="{DEDICATED_FORMS.get(slug, 'contact-us.html?occasion=' + quote(name))}">Book Now</a>
        </div>
      </article>""" for slug, name, src, text in OCCASIONS)

page("occasions.html", "Occasions We Cover - Paradream Events",
     "Proposal, engagement, bachelor, wedding, baptism, first communion, gender reveal, birthday and Christmas celebrations across Lebanon.",
     f"""
<section class="page-head">
  <h1>{PAGES["occasions"]["h1"]}</h1>
  <p>{PAGES["occasions"]["sub"]}</p>
</section>

<section class="band">
  <div class="band-inner">
    <div class="occasions">
{occ_html}
    </div>
  </div>
</section>
""", current="why-paradream.html")


# ── Our Services ────────────────────────────────────────────
SERVICES = [(x["title"], x["text"], x.get("image", "")) for x in CONTENT["services"]]
tiles = "\n".join(f"""      <a class="tile reveal" href="contact-us.html">
{responsive(image, name, "(max-width:700px) 92vw, (max-width:1100px) 45vw, 360px", [400, 760, 1100], 0, 0) if image.startswith("images/") else f'      <img src="{image}" alt="{name}" loading="lazy">'}
        <div class="tile-body">
          <h3>{name}</h3>
          <p>{desc}</p>
        </div>
      </a>""" for i, (name, desc, image) in enumerate(SERVICES))

page("our-services.html", "Our Services - Paradream Events",
     "Live show parades, oriental zaffah, photo booths, mascots, circus shows, inflatable games, table decoration, catering and Christmas mascots.",
     f"""
<section class="page-head">
  <h1>{PAGES["our-services"]["h1"]}</h1>
  <p>{PAGES["our-services"]["sub"]}</p>
</section>

<section class="band band-services">
  <div class="band-inner">
    <div class="tiles">
{tiles}
    </div>
  </div>
</section>
""")


# ── Gallery ─────────────────────────────────────────────────
page("gallery.html", "Gallery - Paradream Events",
     "Photos from weddings, engagements, baptisms, birthdays and Christmas events by Paradream in Lebanon.",
     f"""
<section class="page-head">
  <h1>{PAGES["gallery"]["h1"]}</h1>
  <p>{PAGES["gallery"]["sub"]}</p>
</section>

<section class="band">
  <div class="band-inner">
    <div class="gallery-tabs" id="gallery-tabs">
{gallery_tabs_html}
    </div>
    <div class="gallery-grid" id="gallery-grid" data-visible="{GALLERY_VISIBLE}"
         data-files='{gallery_ids_json}' data-stamps='{gallery_stamps}' data-albums='{gallery_photo_albums_json}'></div>
    <p class="gallery-empty" id="gallery-empty">Loading photos&hellip;</p>
    <p class="gallery-more" hidden><button class="btn btn-outline" id="gallery-more" type="button">Show more photos</button></p>
  </div>
</section>
""")


occasion_options = "\n".join(
    f'          <option>{o["title"]}</option>' for o in CONTENT["occasions"]
) + "\n          <option>Other</option>"

# ── Shared building blocks for the occasion-specific booking forms ──
def name_fields():
    return """    <div class="field">
      <label>Name <span class="field-required">*</span></label>
      <div class="field-row">
        <input name="first_name" type="text" placeholder="First Name" required autocomplete="given-name">
        <input name="last_name" type="text" placeholder="Last Name" required autocomplete="family-name">
      </div>
    </div>"""

def select_field(label, name, options, required=False, field_id=None, placeholder="Select an option"):
    fid = field_id or name
    req_attr = " required" if required else ""
    star = ' <span class="field-required">*</span>' if required else ""
    opts_html = "\n".join(f"        <option>{o}</option>" for o in options)
    return f"""    <div class="field">
      <label for="{fid}">{label}{star}</label>
      <select id="{fid}" name="{name}"{req_attr}>
        <option value="" selected disabled>{placeholder}</option>
{opts_html}
      </select>
    </div>"""

def field_group(label, options, name, kind="checkbox", hint="Feel free to choose all options that apply.", required=False):
    star = ' <span class="field-required">*</span>' if required else ""
    hint_html = f'\n    <p class="fg-hint">{hint}</p>' if hint else ""
    # Native "required" on a radio group genuinely enforces one selection.
    # Checkboxes have no such group-level equivalent in plain HTML, so a
    # required checkbox group is marked visually only.
    req_attr = " required" if (required and kind == "radio") else ""
    items = "\n".join(f'      <label><input type="{kind}" name="{name}" value="{opt}"{req_attr}>{opt}</label>' for opt in options)
    return f"""  <div class="field-group">
    <p class="fg-label">{label}{star}</p>{hint_html}
    <div class="field-checks">
{items}
    </div>
  </div>"""

def phone_field(name="phone", label="Phone", required=True, field_id=None):
    fid = field_id or name
    req_attr = " required" if required else ""
    star = ' <span class="field-required">*</span>' if required else ""
    return f"""    <div class="field">
      <label for="{fid}">{label}{star}</label>
      <div class="phone-field">
        <select name="{name}_code" aria-label="Country code">
          <option value="+961" selected>LB +961</option>
          <option value="+971">AE +971</option>
          <option value="+966">SA +966</option>
          <option value="+33">FR +33</option>
          <option value="+1">US/CA +1</option>
          <option value="+44">UK +44</option>
        </select>
        <input id="{fid}" name="{name}" type="tel"{req_attr} autocomplete="tel">
      </div>
    </div>"""

def venue_address_block():
    return """  <div class="field-group">
    <p class="fg-label">Venue Address</p>
    <div class="field">
      <label for="venue_street">Street Address</label>
      <input id="venue_street" name="venue_street" type="text">
    </div>
    <div class="field-row">
      <div class="field">
        <label for="venue_city">City</label>
        <input id="venue_city" name="venue_city" type="text">
      </div>
      <div class="field">
        <label for="venue_state">State/Province</label>
        <input id="venue_state" name="venue_state" type="text">
      </div>
    </div>
    <div class="field-row">
      <div class="field">
        <label for="venue_zip">ZIP/Postal</label>
        <input id="venue_zip" name="venue_zip" type="text">
      </div>
      <div class="field">
        <label for="venue_country">Country/Region</label>
        <select id="venue_country" name="venue_country">
          <option value="" selected>Select country/region</option>
          <option>Lebanon</option>
          <option>United Arab Emirates</option>
          <option>Saudi Arabia</option>
          <option>Other</option>
        </select>
      </div>
    </div>
  </div>"""

RESPONSE_NOTE = ('We will receive your form submission shortly, and our team will carefully review the details. '
                  'You can expect a response from us within <strong>24 to 48 hours</strong>.<br>'
                  'If your request is urgent, feel free to contact us directly via phone or email.')

GUESTS_OPTIONS = ["Under 20", "20-50", "50-100", "100-200", "200-300", "300+"]
BUDGET_OPTIONS = ["Under $500", "$500-$1,000", "$1,000-$2,500", "$2,500-$5,000", "$5,000+", "Not sure yet"]
CATERING_OPTIONS = ["Not needed", "Light snacks", "Full meal", "Buffet", "Other"]
ENTERTAINMENT_OPTIONS = ["Live Show Parade", "Live Show Zaffah", "Customized Music Show", "Glitter Show",
    "Glow In the Dark", "Bar Show", "Dj Show", "Firework", "Phone Recorder", "360° Photo Booth",
    "Mirror Photo Booth", "Sign In Board", "Slipper Stand", "Fans", "Sparks", "Coffee Station", "Ring The Bell", "Other"]

def occasion_form(slug, title, chocolate_options, extra_top=""):
    return f"""
<section class="page-head">
  <h1>{title}</h1>
</section>

<section class="form-wrap" style="grid-template-columns:1fr;max-width:760px">
  <div>
    <p class="form-note">{RESPONSE_NOTE}</p>
    <form class="form" name="{slug}-enquiry" method="POST" action="/thanks.html" data-netlify="true" netlify-honeypot="website">
      <input type="hidden" name="form-name" value="{slug}-enquiry">
      <p class="hp"><label>Leave empty <input name="website"></label></p>

{name_fields()}
      <div class="field">
        <label for="{slug}-date">Date <span class="field-required">*</span></label>
        <input id="{slug}-date" name="date" type="date" required>
      </div>
{venue_address_block()}
{select_field("Estimated Guests", "guests", GUESTS_OPTIONS, required=True, field_id=slug + "-guests")}
{extra_top}
{field_group("Chocolate and Decoration", chocolate_options, "chocolate_decoration")}
{field_group("Entertainment", ENTERTAINMENT_OPTIONS, "entertainment")}
{select_field("Catering Selection", "catering", CATERING_OPTIONS, field_id=slug + "-catering")}
{select_field("Budget Range", "budget", BUDGET_OPTIONS, required=True, field_id=slug + "-budget")}
      <div class="field">
        <label for="{slug}-email">Email</label>
        <input id="{slug}-email" name="email" type="email" autocomplete="email">
      </div>
{phone_field(field_id=slug + "-phone")}
      <div class="field">
        <label for="{slug}-notes">Special Instructions</label>
        <textarea id="{slug}-notes" name="notes" rows="4"></textarea>
      </div>
      <button class="btn btn-solid" type="submit">Send</button>
    </form>
  </div>
</section>
"""

# ── Contact ─────────────────────────────────────────────────
page("contact-us.html", "Contact Paradream | Book the Best Event Entertainment in Lebanon",
     "Ready to plan your dream event? Contact Paradream for the best parades, zaffah, and entertainment services in Lebanon.",
     f"""
<section class="page-head">
  <h1>{PAGES["contact-us"]["h1"]}</h1>
  <p>{PAGES["contact-us"]["sub"]}</p>
</section>


<section class="form-wrap">
  <div>
    <h2>Paradream Events</h2>
    <dl class="contact-details">
      <dt>Address</dt>
      <dd>{SITE["address_lines"][0]}, {SITE["address_lines"][1]}</dd>
      <dt>Phone</dt>
      <dd><a href="tel:{PHONE_TEL}">+961 {PHONE_DISPLAY}</a></dd>
      <dt>Email</dt>
      <dd><a href="mailto:{EMAIL}">{EMAIL}</a></dd>
    </dl>
  </div>

  <form class="form" name="event-enquiry" method="POST" action="/thanks.html" data-netlify="true" netlify-honeypot="website">
    <input type="hidden" name="form-name" value="event-enquiry">
    <p class="hp"><label>Leave empty <input name="website"></label></p>

    <div class="field">
      <label for="name">Full name</label>
      <input id="name" name="name" type="text" required autocomplete="name">
    </div>
    <div class="field-row">
      <div class="field">
        <label for="email">Email</label>
        <input id="email" name="email" type="email" autocomplete="email">
      </div>
      <div class="field">
        <label for="phone">Phone / WhatsApp</label>
        <input id="phone" name="phone" type="tel" required autocomplete="tel">
      </div>
    </div>
    <div class="field-row">
      <div class="field">
        <label for="occasion">Occasion</label>
        <select id="occasion" name="occasion">
{occasion_options}
        </select>
      </div>
      <div class="field">
        <label for="date">Event date</label>
        <input id="date" name="date" type="date">
      </div>
    </div>
    <div class="field-row">
      <div class="field">
        <label for="guests">Number of guests</label>
        <input id="guests" name="guests" type="number" min="1">
      </div>
      <div class="field">
        <label for="location">Event location</label>
        <input id="location" name="location" type="text"
               placeholder="Venue, town or area" autocomplete="off">
      </div>
    </div>
    <div class="field">
      <label for="message">Tell us about your event</label>
      <textarea id="message" name="message" rows="5"></textarea>
    </div>
    <button class="btn btn-solid" type="submit">Send</button>
  </form>
</section>
""")


# ── Occasion-specific booking forms ──────────────────────────
PROPOSAL_CHOCOLATE = ["Will You Marry me signs", "Stands", "Balloons", "Flowers", "Customized set-Up",
    "Milk chocolate", "Dark Chocolate", "White Chocolate", "Dubai Chocolate", "Customized Chocolate", "Other"]
ENGAGEMENT_CHOCOLATE = ["Signs & Stands", "Balloons", "Flowers", "Customized Set-Up", "Milk Chocolate",
    "Dark Chocolate", "White Chocolate", "Dubai Chocolate", "Customized Chocolate", "Other"]

page("proposal.html", "Plan Your Proposal - Paradream Events",
     "Tell us about the proposal you're planning and Paradream will help bring it to life.",
     occasion_form("proposal", "Proposal", PROPOSAL_CHOCOLATE,
         extra_top=field_group("Surprise or Planned", ["Surprise", "Planned"], "surprise_or_planned", hint="")),
     current="occasions.html")

page("engagement.html", "Plan Your Engagement - Paradream Events",
     "Tell us about the engagement celebration you're planning and Paradream will help bring it to life.",
     occasion_form("engagement", "Engagement", ENGAGEMENT_CHOCOLATE),
     current="occasions.html")

page("bachelor.html", "Plan Your Bachelor Party - Paradream Events",
     "Tell us about the bachelor party you're planning and Paradream will help bring it to life.",
     occasion_form("bachelor", "Bachelor", ENGAGEMENT_CHOCOLATE),
     current="occasions.html")


# ── Wedding booking form ──────────────────────────────────────
WEDDING_ENTERTAINMENT = ["Live Show Parade", "Live Show Zaffah", "Playback Show", "Tabl Show", "Darbuka Show",
    "Violin Show", "Wind Instrument Show (Trumpet, Saxophone, Trombone)", "Piano Show", "Glitter Show", "Dj Show",
    "Bar Show", "Customized Dancers Show", "Glow In The Dark", "Firework", "Phone Recorder", "360° Photo Booth",
    "Mirror Photo Booth", "Sign In Board", "Slipper Stand", "Fans", "Sparks", "Coffee Station", "Ring The Bell", "Other"]
WEDDING_CHOCOLATE = ["Silver Package (50-100 pers)", "Bronze Package (100-200 pers)", "Gold Package (200-300 pers)",
    "Platinum Package (300+)", "Fake Cake", "Milk Chocolate", "Dark Chocolate", "White Chocolate", "Dubai Chocolate",
    "Customized Chocolate", "Other"]
WEDDING_CARDS = ["Electronic Card", "Plexi Card", "Board Card", "Thank You Card", "Customized Card",
    "Cadeaux De Retour", "Other"]

wedding_body = f"""
<section class="page-head">
  <h1>Your Big Day</h1>
</section>

<section class="form-wrap" style="grid-template-columns:1fr;max-width:760px">
  <div>
    <p class="form-note">{RESPONSE_NOTE}</p>
    <form class="form" name="wedding-enquiry" method="POST" action="/thanks.html" data-netlify="true" netlify-honeypot="website">
      <input type="hidden" name="form-name" value="wedding-enquiry">
      <p class="hp"><label>Leave empty <input name="website"></label></p>

{name_fields()}
      <div class="field">
        <label for="wedding-date">Date <span class="field-required">*</span></label>
        <input id="wedding-date" name="date" type="date" required>
      </div>
{venue_address_block()}
{select_field("Estimated Guests", "guests", GUESTS_OPTIONS, required=True, field_id="wedding-guests")}
      <div class="field-row">
        <div class="field">
          <label for="groom-name">Groom Name</label>
          <input id="groom-name" name="groom_name" type="text">
        </div>
        <div class="field">
          <label for="bride-name">Bride Name</label>
          <input id="bride-name" name="bride_name" type="text">
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label for="groom-age">Groom Age</label>
          <input id="groom-age" name="groom_age" type="number" min="1">
        </div>
        <div class="field">
          <label for="bride-age">Bride Age</label>
          <input id="bride-age" name="bride_age" type="number" min="1">
        </div>
      </div>
{field_group("Booked A Venue?", ["Yes", "Still Looking", "We Need Help"], "booked_venue", hint="")}
{field_group("Venue Preferences", ["Indoor", "Outdoor", "Panoramic Mountain View", "Beach Sunset", "Private Venue", "Other"], "venue_preferences")}
{field_group("Entertainment", WEDDING_ENTERTAINMENT, "entertainment")}
{field_group("Chocolate And Decoration", WEDDING_CHOCOLATE, "chocolate_decoration")}
{select_field("Catering Selection", "catering", CATERING_OPTIONS, field_id="wedding-catering")}
{field_group("Cards", WEDDING_CARDS, "cards")}
      <div class="field">
        <label for="wedding-email">Email <span class="field-required">*</span></label>
        <input id="wedding-email" name="email" type="email" required autocomplete="email">
      </div>
{phone_field(field_id="wedding-phone")}
      <div class="field">
        <label for="wedding-notes">Special Instructions</label>
        <textarea id="wedding-notes" name="notes" rows="4"></textarea>
      </div>
      <button class="btn btn-solid" type="submit">Send</button>
    </form>
  </div>
</section>
"""
page("wedding.html", "Plan Your Wedding - Paradream Events",
     "Tell us about the wedding you're planning and Paradream will help bring it to life.",
     wedding_body, current="occasions.html")


# ── Join us ─────────────────────────────────────────────────
INSTRUMENT_OPTIONS = ["Trumpet", "Saxophone", "Trombone", "Tuba", "Clarinet", "Clairon", "Darbuka", "Tabl",
    "Bass Drum", "Snare Drum", "Mizmar", "Mejwiz", "Other"]
POSITION_OPTIONS = ["Performer / Dancer", "Drummer", "Mascot Artist", "Photo Booth Attendant", "Service Staff", "Other"]
EXPERIENCE_OPTIONS = ["Beginner", "1 - 3 Years", "3 - 5 Years", "5+ Years", "No experience, but passionate to learn"]
LOCATION_OPTIONS = ["Beirut", "Mount Lebanon", "North Lebanon", "South Lebanon", "Bekaa", "Other"]
AVAILABILITY_OPTIONS = ["Weekdays", "Weekends", "Both", "Specific dates only"]
HEARD_OPTIONS = ["Instagram", "Facebook", "TikTok", "A friend", "At an event", "Other"]

page("join-us.html", "Join Our Team - Paradream Events",
     "Be a part of the magic. Join the Paradream family and bring unforgettable moments to life.",
     f"""
<section class="page-head">
  <h1>{PAGES["join-us"]["h1"]}</h1>
  <p>{PAGES["join-us"]["sub"]}</p>
</section>

<section class="form-wrap" style="grid-template-columns:1fr;max-width:760px">
  <div>
    <h2>{PAGES["join-us"]["work_h"]}</h2>
    <p>{PAGES["join-us"]["work_p"]}</p>

    <form class="form" name="join-us" method="POST" action="/thanks.html" enctype="multipart/form-data" data-netlify="true" netlify-honeypot="website">
      <input type="hidden" name="form-name" value="join-us">
      <p class="hp"><label>Leave empty <input name="website"></label></p>

{name_fields()}
      <div class="field">
        <label for="jemail">Email <span class="field-required">*</span></label>
        <input id="jemail" name="email" type="email" required autocomplete="email">
      </div>
{phone_field(field_id="jphone")}
{select_field("Position you're applying for:", "position", POSITION_OPTIONS, required=True, field_id="jposition")}
{field_group("Instrument You Play", INSTRUMENT_OPTIONS, "instrument", required=True, hint="")}
{field_group("Years Of Experience", EXPERIENCE_OPTIONS, "experience", kind="radio", required=True, hint="")}
      <div class="field">
        <label for="why">Tell us about your experience <span class="field-required">*</span></label>
        <textarea id="why" name="experience_details" rows="4" required></textarea>
      </div>
{select_field("Preferred Location:", "preferred_location", LOCATION_OPTIONS, required=True, field_id="jlocation")}
{select_field("Availability:", "availability", AVAILABILITY_OPTIONS, required=True, field_id="javailability")}
      <div class="field">
        <label for="cv">Attach Your Portfolio / Resume <span class="field-required">*</span></label>
        <input id="cv" name="cv" type="file" required accept=".pdf,.doc,.docx,.jpg,.jpeg,.png">
        <small class="field-note">Link to your CV or social media profile &middot; up to 20 MB</small>
      </div>
      <div class="field">
        <label for="motivation">Why do you want to join Paradream?</label>
        <textarea id="motivation" name="motivation" rows="4"></textarea>
      </div>
{select_field("Where Did You Hear About Us", "heard", HEARD_OPTIONS, required=True, field_id="jheard")}
      <div class="field">
        <label for="extra">Anything else you'd like to add? <span class="field-required">*</span></label>
        <textarea id="extra" name="extra" rows="3" required></textarea>
      </div>
      <button class="btn btn-solid" type="submit">Apply Now</button>
    </form>
  </div>
</section>
""", current="index.html")


THANKS_BLOCKS = {
"hurry": f"""<section class="band">
  <div class="band-inner reveal">
    <h2>{PAGES["thanks"]["hurry_h"]}</h2>
    <p class="lede">{PAGES["thanks"]["hurry_p"]}</p>
    <p>
      <a class="btn btn-solid" href="https://wa.me/96181406046">WhatsApp us</a>
      <a class="btn btn-outline" href="tel:{PHONE_TEL}" style="margin-inline-start:.6rem">+961 {PHONE_DISPLAY}</a>
    </p>
  </div>
</section>""",

"wait": f"""<section class="band band-cream">
  <div class="band-inner reveal">
    <h2>{PAGES["thanks"]["wait_h"]}</h2>
    <p class="lede">{PAGES["thanks"]["wait_p"]}</p>
    <a class="btn btn-outline" href="gallery.html">See the gallery</a>
  </div>
</section>"""
}

page("thanks.html", "Thank you - Paradream Events",
     "Thanks for getting in touch with Paradream Events.",
     f"""
<section class="page-head">
  <h1>{PAGES["thanks"]["h1"]}</h1>
  <p>{PAGES["thanks"]["sub"]}</p>
</section>

""" + "\n\n".join(THANKS_BLOCKS[k] for k in PAGES["thanks"]["sections"] if k in THANKS_BLOCKS),
     current="index.html")


# ── Terms & Privacy ─────────────────────────────────────────
LEGAL_CONTACT = f"""
  <h2>Contact</h2>
  <p>For any questions regarding this page, please contact us:</p>
  <ul class="legal-contact">
    <li><a href="mailto:{EMAIL}">{EMAIL}</a></li>
    <li><a href="tel:{PHONE_TEL}">+961 {PHONE_DISPLAY}</a></li>
    <li>Lebanon</li>
  </ul>"""

TERMS = CONTENT["legal"]["terms_html"] + LEGAL_CONTACT

PRIVACY = CONTENT["legal"]["privacy_html"] + LEGAL_CONTACT

for fn, h1, body, desc in [
    ("terms.html", "Terms &amp; Conditions", TERMS,
     "Terms and Conditions for Paradream Events Lebanon — booking, payment, cancellation and liability."),
    ("privacy.html", "Privacy Policy", PRIVACY,
     "How Paradream Events Lebanon collects, uses and protects your personal information."),
]:
    page(fn, f"{h1} - Paradream Events", desc, f"""
<section class="page-head">
  <h1>{h1}</h1>
  <p>Effective date: 20 September 2019 &middot; Paradream Events Lebanon</p>
</section>

<section class="band">
  <div class="legal">
{body}
  </div>
</section>
""", current="index.html")


print("done")
