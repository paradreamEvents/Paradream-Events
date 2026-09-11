#!/usr/bin/env python3
"""Builds the Paradream static site. Run: python3 build.py"""
import os, html

OUT = os.path.dirname(os.path.abspath(__file__))

CDN = "https://custom-images.strikinglycdn.com/res/hrscywv4p/image/upload"
LOGO = f"{CDN}/c_limit,h_600,w_600,f_auto,q_auto:best/17545664/35175_467463.jpg"
FOOTER_LOGO = f"{CDN}/c_limit,h_600,w_600,f_auto,q_auto:best/17545664/43580_800970.jpg"
OG = f"{CDN}/c_limit,fl_lossy,h_630,w_1200,f_auto,q_auto/17545664/376585_257154.jpeg"

# ─────────────────────────────────────────────────────────────────────
# SOCIAL LINKS — paste the real profile URL between the quotes.
# An icon with an empty URL is simply not shown, so nothing on the site
# ever links to a page that doesn't exist.
# ─────────────────────────────────────────────────────────────────────
SOCIALS = {
    "instagram": "https://www.instagram.com/paradream.lb/",
    "tiktok":    "https://www.tiktok.com/@paradream.lb",
    "facebook":  "https://www.facebook.com/share/1CtjhSYU7K/",
    "linkedin":  "",
}

# The gallery finds its own photos: drop images/gallery-1.jpg, gallery-2.jpg ...
# into the images folder and they appear. No code change needed.
# This is only how many show before the "Show more" button.
GALLERY_VISIBLE = 12

PHONE_DISPLAY = "81406046"
PHONE_TEL     = "+96181406046"
EMAIL         = "paradedream@gmail.com"

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

def cdn(path, w, extra="&amp;fit=cover&amp;q=86"):
    return f"/.netlify/images?url=/{path}&amp;w={w}{extra}"

def responsive(path, alt, sizes, widths, ratio_w, ratio_h, cls=""):
    srcset = ",\n              ".join(f"{cdn(path, w)} {w}w" for w in widths)
    c = f' class="{cls}"' if cls else ""
    return (f'      <img{c} src="{cdn(path, widths[len(widths)//2])}"\n'
            f'           data-full="{cdn(path, 1600, "&amp;q=85")}"\n'
            f'           srcset="{srcset}"\n'
            f'           sizes="{sizes}"\n'
            f'           width="{ratio_w}" height="{ratio_h}"\n'
            f'           alt="{alt}" loading="lazy" decoding="async">')

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
    <a href="mailto:paradedream@gmail.com">Contact</a>
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

<script src="main.js"></script>"""


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
<link rel="icon" href="{LOGO}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="styles.css">
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


# ── Home ────────────────────────────────────────────────────
home = f"""
<section class="hero-slider">
  <div class="slide active" style="background-image:url('{cdn("images/hero-zaffah.jpg", 1920, "&amp;q=92")}');background-position:center 38%">
    <div class="slide-inner">
      <h1>Book Your Dream Event Now!</h1>
      <p>Your Dream Event Is One Click Away!</p>
      <a class="btn btn-solid" href="contact-us.html">Book Now!</a>
    </div>
  </div>
  <div class="slide" style="background-image:url('{hero_img("345364_832215")}')">
    <div class="slide-inner">
      <h1>Weddings, done your way</h1>
      <p>Zaffah, parade and production, timed to the second.</p>
      <a class="btn btn-solid" href="occasions.html#wedding">See weddings</a>
    </div>
  </div>
  <div class="slide" style="background-image:url('{cdn("images/hero-christmas.jpg", 2200, "&amp;q=88")}');background-position:center 42%">
    <div class="slide-inner">
      <h1>Christmas is better together</h1>
      <p>Mascots, music and mornings your family will keep talking about.</p>
      <a class="btn btn-solid" href="occasions.html#christmas">See Christmas</a>
    </div>
  </div>
  <div class="slider-dots" role="tablist" aria-label="Slides">
    <button role="tab" aria-selected="true" aria-label="Slide 1"></button>
    <button role="tab" aria-selected="false" aria-label="Slide 2"></button>
    <button role="tab" aria-selected="false" aria-label="Slide 3"></button>
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
</div>

<section class="band">
  <div class="band-inner reveal">
    <h2>Discover Our Services</h2>
    <p class="lede">Dive Into Paradream's Portfolio To Know What Your Event Will Look Like</p>
    <a class="btn btn-outline" href="our-services.html">Our Services</a>
  </div>
</section>

<section class="band about">
  <div class="band-inner reveal">
    <h2>About Us</h2>
    <p>At Paradream Events, we're passionate about turning your most precious moments into
    unforgettable memories. Based in Beirut, Lebanon, with over 12 years of experience in events,
    hospitality, and F&amp;B services, our team of dedicated planners handles every detail — from the
    first consultation to the final applause. Whether it's an intimate baptism or a grand wedding
    celebration, we bring creativity, professionalism, and heart to every event.
    You dream it. We achieve it.</p>
  </div>
</section>

<section class="band">
  <div class="band-inner reveal">
    <div class="counters">
      <div class="counter"><b data-count="150" data-suffix="+">0</b><span>celebrations brought to life</span></div>
      <div class="counter"><b data-count="12" data-suffix="+">0</b><span>years in events and hospitality</span></div>
      <div class="counter"><b data-count="20" data-suffix="+">0</b><span>kinds of occasion covered</span></div>
      <div class="counter"><b data-count="100" data-suffix="%">0</b><span>of it handled by one team</span></div>
    </div>
  </div>
</section>

<section class="band band-cream">
  <div class="band-inner reveal">
    <h2>How It Works</h2>
    <div class="steps">
      <div class="step reveal">
        <p class="step-num">1</p>
        <h3>Go to Why Paradream?</h3>
        <p>Choose the <a href="contact-us.html">Contact Us</a> section to fill in your information.</p>
      </div>
      <div class="step reveal reveal-d1">
        <p class="step-num">2</p>
        <h3>Fill in the form</h3>
        <p>Complete the form with all the required information. This will facilitate our ability to
        process your request effectively and get back to you asap!</p>
      </div>
      <div class="step reveal reveal-d2">
        <p class="step-num">3</p>
        <h3>Trust the process</h3>
        <p>Trust the process and the planner's workflow to ensure that all aspects of the event are
        managed efficiently and effectively.</p>
      </div>
    </div>
  </div>
</section>

<section class="band band-cream">
  <div class="band-inner reveal">
    <h2>What will it cost?</h2>
    <p class="lede">Pick what you're planning and get a rough range straight away.
    It's an estimate, not a quote — but it's a real starting point.</p>

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
          <label class="opt" style="max-width:320px">
            <input type="checkbox" id="calc-travel">
            <span>Event is outside Beirut<small>Travel supplement</small></span>
          </label>
        </div>
      </div>

      <aside class="calc-out">
        <h3>Your estimate</h3>
        <p class="calc-total" id="calc-total"></p>
        <ul class="calc-lines" id="calc-lines"></ul>
        <a class="btn btn-solid" id="calc-send" href="#main">Send this to Paradream</a>
        <p class="calc-note">Indicative only. Final pricing depends on venue, date,
        timing and exactly what you want. We'll confirm on a call.</p>
      </aside>
    </div>
  </div>
</section>

<section class="band">
  <div class="band-inner reveal">
    <h2>Frequently Asked Questions</h2>
    <div class="faq">
      <details>
        <summary>What is the overall cost of organizing the event, and what factors influence the final price?</summary>
        <p>The overall cost of organizing an event depends on various factors, including the venue, catering, entertainment, staffing, and any additional services or equipment required. The final price is influenced by the size and scope of the event, the complexity of logistics, and the level of customization desired. We provide a detailed estimate based on your specific requirements to ensure transparency and help you manage your budget effectively.</p>
      </details>
      <details>
        <summary>How far in advance should I start planning my event?</summary>
        <p>It is recommended to start planning your event at least 6 to 12 months in advance. This allows enough time for securing venues, arranging vendors, and addressing any logistical details, ensuring a well-organized and successful event.<br>For larger or more complex events, additional planning time may be necessary.</p>
      </details>
      <details>
        <summary>What factors should I consider when setting the event budget?</summary>
        <p>When setting the event budget, the factors to consider will vary based on the type and scale of the event.<br>But the main factors can be (the venue cost, catering and beverages, entertainment and live shows, theme, table decoration, chocolate, staffing&hellip;etc)</p>
      </details>
      <details>
        <summary>Why should I consider hiring an event planner for my upcoming event?</summary>
        <p>At the end, engaging a professional event organizer during this period is essential, as their expertise ensures meticulous planning, effective problem-solving, Strategic Planning, Budget Management, Attention to Detail, Access to Resources, Stress Reduction and creative solutions.</p>
      </details>
    </div>
  </div>
</section>
"""
page("index.html", "Paradream Events",
     "Paradream Events — Lebanon's trusted event planning company with 12+ years of experience. We plan weddings, engagements, birthdays, baptisms, Christmas events, and more. Based in Beirut. Contact us today!",
     home)


# ── Why Paradream ───────────────────────────────────────────
TESTIMONIALS = [
    (img("327623_961035", "jpg"), "Mitri &amp; Sethrida's Wedding",
     "From our proposal to our wedding, Paradream exceeded every expectation. We had a clear vision, and they brought it to life flawlessly—the mood board was executed exactly as we imagined. The atmosphere was electric, everyone was dancing and celebrating with joy. It truly felt like a dream. I confidently recommend Paradream to anyone planning a special event; they made our moments unforgettable."),
    (img("220930_341269"), "Jean-Marie &amp; Lili's Engagement",
     "I still get chills thinking about our engagement night—Paradream turned it into absolute MAGIC! From the moment we stepped in, it felt like we were living inside a fairytale. The setup was breathtaking, the entertainment was next-level, and the vibe? Unmatched. Every guest was blown away, and we were speechless. If you're planning an engagement, don't even think twice. Book Paradream now—they don't just plan events, they create unforgettable moments you'll cherish forever!"),
    (img("285581_545397"), "Bruna's Birthday",
     "I honestly couldn't believe it—they actually made it happen! My birthday felt like a dream come true. Even though I was far away, Paradream showed up to celebrate with me, and turned a regular day into something unforgettable. It started as a surprise, but since then, they've become a part of every celebration in my life. Their energy, their team, their beautiful spirit—Paradream doesn't just show up, they light up the entire occasion. I wouldn't celebrate without them!"),
    (img("225122_87972", "jpg"), "Exquitech Christmas Gathering",
     "Paradream transformed our vision into a truly unforgettable experience. From the first idea to the final execution, their team showed exceptional creativity, professionalism, and attention to detail. We want to express our sincere gratitude to Paradream for their dedication and for making our event so meaningful and seamless. Choosing them was the best decision we could have made, and their commitment to excellence truly sets them apart. It's clear why Paradream is recognized as one of Lebanon's leading event planning and entertainment agencies—they deliver innovation, quality, and moments that stay with you forever."),
    (img("588520_558441", "jpg"), "SOS End Of Project",
     "This Christmas, we had the honor of turning a meaningful dream into reality by supporting an organization as inspiring as SOS Children's Village. We are deeply grateful for the opportunity to collaborate with such a remarkable children's center and contribute to its heartfelt mission. Being part of an initiative that brings care, joy, and hope to young lives made this experience truly impactful and memorable. Moments like these reinforce why Paradream proudly stands as one of the leading event planning and entertainment agencies in Lebanon—dedicated to creating experiences that inspire, connect, and truly make a difference."),
]

quotes = "\n".join(f"""      <figure class="quote reveal">
        <img src="{src}" alt="" loading="lazy">
        <div>
          <blockquote>{text}</blockquote>
          <cite>{name}</cite>
        </div>
      </figure>""" for src, name, text in TESTIMONIALS)

why = f"""
<section class="page-head">
  <h1>Our Success Story</h1>
  <p>How It Started</p>
</section>

<section class="band">
  <div class="band-inner">
    <img src="{img("159401_417278")}" alt="Paradream team at work" style="border-radius:3px;margin:0 auto 2.2rem">
    <p class="lede">Paradream was established in 2019, with a strong background in hospitality management
    and event planning. We have a fervent passion for turning dreams into reality. Driven by our love for
    music and hospitality, and commitment to excellence, we founded PARADREAM with a clear vision: to make
    your dreams come true. Our guiding principle, 'YOUR DAY, OUR WAY!', reflects our commitment to bringing
    your visions to life.</p>
  </div>
</section>

<section class="band band-cream">
  <div class="band-inner">
    <p class="stat">200+ celebrations brought to life with unforgettable moments across Lebanon.</p>
    <h2>Here's What Our Clients Say About Paradream</h2>
    <div class="quotes">
{quotes}
    </div>
  </div>
</section>

<section class="band">
  <div class="band-inner">
    <h2>What We Do</h2>
    <p class="lede">Occasions we cover — proposal, engagement, bachelor, pre-wedding, wedding, baptism,
    first communion, gender reveal, birthdays and more.</p>
    <a class="btn btn-outline" href="occasions.html">See all occasions</a>
  </div>
</section>
"""
page("why-paradream.html", "Why Paradream? | Top Event Planner &amp; Parade Experts in Lebanon",
     "Discover why Paradream is Lebanon's top event planner. Unique parades, dazzling shows, and unforgettable zaffahs for every special occasion.",
     why)


# ── Occasions ───────────────────────────────────────────────
OCCASIONS = [
    ("proposal", "Proposal", img("314845_494302"),
     "The proposal is a once-in-a-lifetime, and we specialize in crafting unforgettable experiences that ensure a perfect and memorable \"yes\" moment."),
    ("engagement", "Engagement", img("878787_304110"),
     "Celebrate your love story with our bespoke engagement event services. We are dedicated to crafting an unforgettable experience. Our team of experienced planners will work closely with you to bring your dream to life, ensuring every element of the celebration is designed and flawlessly executed. From intimate moments to grand gestures."),
    ("bachelor", "Bachelor", img("961079_835977"),
     "Experience an exceptional bachelor party with our elite planning services. We create sophisticated, tailored celebrations, handling every detail from curated activities to premium entertainment. Trust us to turn your dream into an unforgettable event that leaves a lasting impression."),
    ("wedding", "Your Big Day", img("345364_832215"),
     "Make your dream wedding come true with Paradream. Our expert planning transforms your vision into a flawlessly executed celebration that you'll treasure forever."),
    ("communion", "Holy First Communion", img("680926_291951"),
     "Your child's First Communion deserves to be a truly exceptional and memorable event. Our expertise in detailed planning, combined with a touch of spiritual sophistication, ensures a distinguished and meaningful celebration."),
    ("baptism", "Baptism", "https://user-images.strikinglycdn.com/res/hrscywv4p/image/upload/f_auto,q_1,w_4096/unsplashcom/photo-1566516171511-1c411a59c8ba?h=9000&amp;w=1200&amp;fit=clip&amp;fm=jpg",
     "Your child's Baptism is a sacred milestone that calls for a warm, heartfelt celebration. With our thoughtful planning and eye for detail, we create a serene and joyful atmosphere that honors the spiritual significance of this blessed day."),
    ("gender-reveal", "Gender Reveal", "https://user-images.strikinglycdn.com/res/hrscywv4p/image/upload/f_auto,q_1,w_4096/unsplashcom/photo-1668473586781-b6cfff4d70c9?h=9000&amp;w=1200&amp;fit=clip&amp;fm=jpg",
     "The sweetest suspense of all — boy or girl, we celebrate with sparkle and surprise! Every gender reveal is a magical moment, filled with joy, love, and a burst of color!"),
    ("birthday", "Birthday", img("454022_381372"),
     "Choose Paradream to make your birthday truly unforgettable, ensuring a seamless and exceptional experience that will leave a lasting impression on you and your guests."),
    ("christmas", "Christmas", img("443863_125203", "jpg"),
     "Christmas is the dreaming season, and Christmas is better together! Music at Christmas time is like no other, enchanting hearts and weaving joy into the air. P.S: Ask Santa Claus for Paradream!"),
]

occ_html = "\n".join(f"""      <article class="occasion reveal" id="{slug}">
        <img class="occasion-img" src="{src}" alt="{name}" loading="lazy">
        <div>
          <h3>{name}</h3>
          <p>{text}</p>
          <a class="btn btn-outline" href="contact-us.html?occasion={slug}">Book Now</a>
        </div>
      </article>""" for slug, name, src, text in OCCASIONS)

page("occasions.html", "Occasions We Cover - Paradream Events",
     "Proposal, engagement, bachelor, wedding, baptism, first communion, gender reveal, birthday and Christmas celebrations across Lebanon.",
     f"""
<section class="page-head">
  <h1>Occasions We Cover</h1>
  <p>Proposal, engagement, bachelor, pre-wedding, wedding, baptism, first communion,
  gender reveal, birthdays and more.</p>
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
SERVICES = [
    ("Live Show Parade", "A full parade built around your entrance — performers, music and movement."),
    ("Oriental Zaffah", "The traditional zaffah, with drummers and dancers, timed to your moment."),
    ("Photo Booth &amp; Entertainment", "Props, prints and an attendant, so guests leave with something in hand."),
    ("Characters &amp; Mascots", "Costumed performers who keep children entertained throughout the event."),
    ("Circus Show", "Acrobats, fire and LED acts for the part of the night people remember."),
    ("Inflatable Games", "Slides, castles and obstacle courses, delivered, installed and supervised."),
    ("Table Decoration Set-Up", "Centerpieces, linens and styling arranged before your guests arrive."),
    ("Catering Services", "Menus, service staff and bar built around your guest count."),
    ("Christmas Mascots", "Santa and friends, for home visits, offices and Christmas gatherings."),
]
tiles = "\n".join(f"""      <a class="tile reveal" href="contact-us.html">
{responsive(f"images/service-{i+1}.jpg", name, "(max-width:700px) 92vw, (max-width:1100px) 45vw, 360px", [400, 760, 1100], 4, 3)}
        <div class="tile-body">
          <h3>{name}</h3>
          <p>{desc}</p>
        </div>
      </a>""" for i, (name, desc) in enumerate(SERVICES))

page("our-services.html", "Our Services - Paradream Events",
     "Live show parades, oriental zaffah, photo booths, mascots, circus shows, inflatable games, table decoration, catering and Christmas mascots.",
     f"""
<section class="page-head">
  <h1>Our Services</h1>
  <p>Dive into Paradream's portfolio to know what your event will look like.</p>
</section>

<section class="band">
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
  <h1>Gallery</h1>
  <p>Moments from events across Lebanon.</p>
</section>

<section class="band">
  <div class="band-inner">
    <div class="gallery-grid" id="gallery-grid" data-visible="{GALLERY_VISIBLE}"></div>
    <p class="gallery-empty" id="gallery-empty">Loading photos&hellip;</p>
    <p class="gallery-more" hidden><button class="btn btn-outline" id="gallery-more" type="button">Show more photos</button></p>
  </div>
</section>
""")


# ── Contact ─────────────────────────────────────────────────
page("contact-us.html", "Contact Paradream | Book the Best Event Entertainment in Lebanon",
     "Ready to plan your dream event? Contact Paradream for the best parades, zaffah, and entertainment services in Lebanon.",
     """
<section class="page-head">
  <h1>Contact Us</h1>
  <p>Ready to plan your dream event? Tell us what you have in mind and we'll get back to you.</p>
</section>


<section class="form-wrap">
  <div>
    <h2>Paradream Events</h2>
    <dl class="contact-details">
      <dt>Address</dt>
      <dd>Furn El Chebbak, Beirut, Lebanon</dd>
      <dt>Phone</dt>
      <dd><a href="tel:+96181406046">+961 81 406 046</a></dd>
      <dt>Email</dt>
      <dd><a href="mailto:paradedream@gmail.com">paradedream@gmail.com</a></dd>
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
          <option>Proposal</option>
          <option>Engagement</option>
          <option>Bachelor</option>
          <option>Wedding</option>
          <option>Holy First Communion</option>
          <option>Baptism</option>
          <option>Gender Reveal</option>
          <option>Birthday</option>
          <option>Christmas</option>
          <option>Other</option>
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


# ── Join us ─────────────────────────────────────────────────
page("join-us.html", "Join Our Team - Paradream Events",
     "Be a part of the magic. Join the Paradream family and bring unforgettable moments to life.",
     """
<section class="page-head">
  <h1>Join the Paradream Family</h1>
  <p>Be a part of the magic. Join the Paradream family and bring unforgettable moments to life.</p>
</section>

<section class="form-wrap">
  <div>
    <h2>Work with us</h2>
    <p>We take on performers, dancers, drummers, mascot artists and service staff through the year.
    Tell us what you do and where you're based.</p>
  </div>

  <form class="form" name="join-us" method="POST" action="/thanks.html" data-netlify="true" netlify-honeypot="website">
    <input type="hidden" name="form-name" value="join-us">
    <p class="hp"><label>Leave empty <input name="website"></label></p>

    <div class="field">
      <label for="jname">Full name</label>
      <input id="jname" name="name" type="text" required autocomplete="name">
    </div>
    <div class="field-row">
      <div class="field">
        <label for="jemail">Email</label>
        <input id="jemail" name="email" type="email" autocomplete="email">
      </div>
      <div class="field">
        <label for="jphone">Phone / WhatsApp</label>
        <input id="jphone" name="phone" type="tel" required autocomplete="tel">
      </div>
    </div>
    <div class="field">
      <label for="role">What do you do?</label>
      <input id="role" name="role" type="text" placeholder="Dancer, drummer, mascot artist, service staff...">
    </div>
    <div class="field">
      <label for="why">Why do you want to join Paradream?</label>
      <textarea id="why" name="why" rows="4"></textarea>
    </div>
    <div class="field">
      <label for="heard">Where did you hear about us?</label>
      <select id="heard" name="heard">
        <option>Instagram</option>
        <option>Facebook</option>
        <option>A friend</option>
        <option>At an event</option>
        <option>Other</option>
      </select>
    </div>
    <div class="field">
      <label for="extra">Anything else you'd like to add?</label>
      <textarea id="extra" name="extra" rows="3"></textarea>
    </div>
    <button class="btn btn-solid" type="submit">Apply Now</button>
  </form>
</section>
""", current="index.html")


page("thanks.html", "Thank you - Paradream Events",
     "Thanks for getting in touch with Paradream Events.",
     """
<section class="page-head">
  <h1>Thank you!</h1>
  <p>We've got your message and someone from the team will come back to you shortly —
  usually within a day.</p>
</section>

<section class="band">
  <div class="band-inner reveal">
    <h2>In a hurry?</h2>
    <p class="lede">Call or WhatsApp us and we'll answer faster.</p>
    <p>
      <a class="btn btn-solid" href="https://wa.me/96181406046">WhatsApp us</a>
      <a class="btn btn-outline" href="tel:+96181406046" style="margin-inline-start:.6rem">+961 81 406 046</a>
    </p>
  </div>
</section>

<section class="band band-cream">
  <div class="band-inner reveal">
    <h2>While you wait</h2>
    <p class="lede">Have a look at what we've done for other people.</p>
    <a class="btn btn-outline" href="gallery.html">See the gallery</a>
  </div>
</section>
""", current="index.html")


# ── Terms & Privacy ─────────────────────────────────────────
LEGAL_CONTACT = f"""
  <h2>Contact</h2>
  <p>For any questions regarding this page, please contact us:</p>
  <ul class="legal-contact">
    <li><a href="mailto:{EMAIL}">{EMAIL}</a></li>
    <li><a href="tel:{PHONE_TEL}">+961 {PHONE_DISPLAY}</a></li>
    <li>Lebanon</li>
  </ul>"""

TERMS = """
  <h2>1. Acceptance of Terms</h2>
  <p>By accessing or using this website and our services, you agree to be bound by these
  Terms and Conditions, our <a href="privacy.html">Privacy Policy</a>, and any additional
  guidelines we provide. If you do not agree, please do not use our website or services.</p>

  <h2>2. Services Offered</h2>
  <p>Paradream provides entertainment and event planning services for occasions such as
  weddings, engagements, proposals, bridal showers, birthdays, baptisms, first communions,
  and holidays (e.g. Christmas).</p>
  <p>Each booking is tailored to the client's preferences based on the categories listed on
  our <a href="why-paradream.html">Why Paradream?</a> page.</p>

  <h2>3. Booking &amp; Payment Terms</h2>
  <ul>
    <li>Bookings must be made through our official forms or via direct contact.</li>
    <li>A deposit may be required to confirm your event, based on the selected package.</li>
    <li>Full payment must be completed before the event date unless otherwise agreed in writing.</li>
    <li>Prices may vary based on customization, location, timing, and specific requests.</li>
  </ul>

  <h2>4. Cancellation &amp; Refund Policy</h2>
  <ul>
    <li>Cancellations must be made at least 7 days before the scheduled event to be eligible
    for a partial refund (minus administrative and non-refundable costs).</li>
    <li>Events cancelled less than 7 days in advance may not be refunded unless due to force majeure.</li>
    <li>Postponements can be discussed based on availability.</li>
  </ul>

  <h2>5. Client Responsibilities</h2>
  <ul>
    <li>Clients must provide accurate information on forms (event type, location, number of guests, etc.).</li>
    <li>Any changes (venue, time, theme, etc.) must be communicated at least 72 hours in advance.</li>
    <li>Clients must ensure proper access to the venue for setup and performers.</li>
  </ul>

  <h2>6. Paradream Responsibilities</h2>
  <ul>
    <li>We commit to delivering high-quality, professional performances as agreed upon in your booking.</li>
    <li>In rare cases of force majeure (e.g. illness, accidents, weather conditions), Paradream will
    notify the client and attempt to provide a suitable replacement or reschedule.</li>
  </ul>

  <h2>7. Liability</h2>
  <ul>
    <li>Paradream is not liable for venue issues, third-party vendors, or accidents caused by
    conditions beyond our control.</li>
    <li>We are not responsible for delays or service disruptions due to circumstances such as
    electricity outages, severe weather, or traffic blockages.</li>
  </ul>

  <h2>8. Use of Website &amp; Content</h2>
  <ul>
    <li>All text, media, logos, and content on this website are the intellectual property of
    Paradream unless otherwise noted.</li>
    <li>You may not copy, use, or distribute our content without written permission.</li>
  </ul>

  <h2>9. Privacy</h2>
  <p>We collect basic user data (names, contact info, event details) strictly to provide our
  services. We do not sell or share your information with third parties unless required by law.
  See our full <a href="privacy.html">Privacy Policy</a>.</p>

  <h2>10. Amendments</h2>
  <p>Paradream reserves the right to update these Terms and Conditions at any time. Changes will
  be posted here and will take effect immediately upon posting.</p>
""" + LEGAL_CONTACT

PRIVACY = """
  <h2>1. Introduction</h2>
  <p>Paradream values your privacy and is committed to protecting your personal data. This
  Privacy Policy explains how we collect, use, and protect your information when you visit our
  website, submit a form, or contact us for services.</p>

  <h2>2. What Information We Collect</h2>
  <p>We collect the following information from you when you interact with our site or services:</p>
  <ul>
    <li>Full name (first and last)</li>
    <li>Email address</li>
    <li>Phone number</li>
    <li>Event details (type, date, location, preferences, number of guests, etc.)</li>
    <li>Messages or notes you submit in contact or booking forms</li>
  </ul>
  <p>We do not collect sensitive data (such as payment information) through our website.</p>

  <h2>3. How We Use Your Information</h2>
  <p>We use the information you provide to:</p>
  <ul>
    <li>Process your event inquiry or booking</li>
    <li>Contact you regarding your event</li>
    <li>Provide relevant service recommendations</li>
    <li>Customize your entertainment package</li>
    <li>Improve our services and customer experience</li>
    <li>Respond to your messages or feedback</li>
  </ul>

  <h2>4. How We Store &amp; Protect Your Information</h2>
  <p>Your information is securely stored and only accessible by authorized members of our team.
  We take appropriate security measures to protect against unauthorized access, alteration, or
  misuse of your personal information.</p>

  <h2>5. Sharing of Information</h2>
  <p>We do not sell, rent, or share your personal information with third parties for marketing
  purposes. We may share your information only:</p>
  <ul>
    <li>With trusted vendors or performers strictly for the purpose of fulfilling your event needs</li>
    <li>When required by Lebanese law or legal authorities</li>
  </ul>

  <h2>6. Cookies &amp; Tracking</h2>
  <p>Our website may use basic cookies to understand how visitors use our site (e.g. via Google
  Analytics), to improve user experience. You can choose to disable cookies through your browser
  settings.</p>

  <h2>7. Your Rights</h2>
  <p>You have the right to:</p>
  <ul>
    <li>Request a copy of your data</li>
    <li>Ask us to update your information</li>
  </ul>
  <p>To do so, contact us using the details below.</p>

  <h2>8. External Links</h2>
  <p>Our website may contain links to social media or external sites. We are not responsible for
  the privacy practices of these third-party websites.</p>

  <h2>9. Updates to This Policy</h2>
  <p>We may update this Privacy Policy from time to time. Any changes will be posted on this page
  with an updated effective date.</p>
""" + LEGAL_CONTACT

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
