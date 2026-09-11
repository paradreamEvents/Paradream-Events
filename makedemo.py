import re
css = open('styles.css', encoding='utf-8').read()
js  = open('main.js', encoding='utf-8').read()

pages = [('home','index.html','Home'),('why','why-paradream.html','Why Paradream?'),
         ('occasions','occasions.html','Occasions'),('services','our-services.html','Our Services'),
         ('gallery','gallery.html','Gallery'),('contact','contact-us.html','Contact Us'),
         ('join','join-us.html','Join Our Team'),
         ('terms','terms.html','Terms'),('privacy','privacy.html','Privacy')]

def grab(fn, pat):
    s = open(fn, encoding='utf-8').read()
    return re.search(pat, s, re.S).group(1)

idx = open('index.html', encoding='utf-8').read()
footer = re.search(r'(<footer class="site-footer">.*?</footer>)', idx, re.S).group(1)
cookie = re.search(r'(<div class="cookie".*?</div>)\s*\n\s*<div class="fabs">', idx, re.S).group(1)
fabs   = re.search(r'(<div class="fabs">.*?</div>)\s*\n\s*<div class="assistant"', idx, re.S).group(1)
asst   = re.search(r'(<div class="assistant".*?</div>)\s*\n\s*<script', idx, re.S).group(1)
LOGO = re.search(r'<img src="(https://custom-images[^"]+35175_467463[^"]*)"', idx).group(1)

linkmap = {fn: k for k, fn, _ in pages}
import base64, os

def embed(path, max_w=1920, q=88):
    """Inline a local image as a data URI so the single-file demo can show it."""
    from PIL import Image
    import io
    im = Image.open(path).convert("RGB")
    im.thumbnail((max_w, max_w), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=q, optimize=True)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()

def placeholder():
    """A single neutral tile so the demo shows layout, not broken images."""
    from PIL import Image, ImageDraw
    import io, base64
    im = Image.new("RGB", (600, 600), "#ECEFF2")
    dr = ImageDraw.Draw(im)
    dr.rectangle([0, 0, 599, 599], outline="#DCE1E6", width=2)
    # simple camera glyph, centred
    dr.rounded_rectangle([210, 250, 390, 375], radius=14, outline="#C2CAD2", width=6)
    dr.rectangle([255, 232, 315, 252], fill="#C2CAD2")
    dr.ellipse([268, 275, 332, 339], outline="#C2CAD2", width=6)
    buf = io.BytesIO()
    im.save(buf, "PNG", optimize=True)
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()

PLACEHOLDER = placeholder()

HERO_EMBEDS = {
    "images/hero-zaffah.jpg": embed("images/hero-zaffah.jpg"),
    "images/hero-christmas.jpg": embed("images/hero-christmas.jpg"),
}

def local_imgs(html):
    for p, uri in HERO_EMBEDS.items():
        html = re.sub(r'/\.netlify/images\?url=/' + re.escape(p) + r'[^\'\")\s]*', uri, html)
    # the Netlify Image CDN only exists on Netlify; point the demo at the raw files
    html = re.sub(r'/\.netlify/images\?url=/images/[^&"\s]+[^"\s]*', PLACEHOLDER, html)
    html = re.sub(r'src="images/[^"]*"', 'src="' + PLACEHOLDER + '"', html)
    html = re.sub(r'\s*srcset="[^"]*"', '', html)
    html = re.sub(r'\s*sizes="[^"]*"', '', html)
    return html

def fix(html):
    def repl(m):
        href = m.group(1); base = href.split('#')[0].split('?')[0]
        frag = '|' + href.split('#')[1] if '#' in href else ''
        if base in linkmap: return 'href="#%s" data-go="%s%s"' % (linkmap[base], linkmap[base], frag)
        return m.group(0)
    return re.sub(r'href="([^"]+)"', repl, html)

sections = []
for k, fn, _ in pages:
    body = local_imgs(grab(fn, r'<main id="main">(.*?)</main>'))
    sections.append('<section class="pg" id="pg-%s"%s>\n%s\n</section>' % (k, '' if k=='home' else ' hidden', fix(body)))

nav = '\n'.join('      <a href="#%s" data-go="%s">%s</a>' % (k,k,t) for k,_,t in pages if k not in ('occasions','join','terms','privacy'))

demo = """<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Paradream Events — demo</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&display=swap" rel="stylesheet">
<style>
%s
.pg[hidden]{display:none}
.demo-note{background:#000;color:#fff;font-size:.8rem;text-align:center;padding:.5rem 1rem}
.demo-note b{color:#FFC9C5}
</style></head>
<body>
<p class="demo-note">Demo preview — all pages in one file. Grey squares are placeholder photos.
The assistant uses its <b>offline answers</b> here; on Netlify it calls Claude.</p>

<header class="site-header"><div class="header-inner">
  <a class="brand" href="#home" data-go="home"><img src="%s" alt="Paradream Events">
  <span class="brand-tag">You dream, we achieve</span></a>
  <button class="nav-toggle" aria-expanded="false" aria-controls="site-nav" aria-label="Menu">&#9776;</button>
  <nav class="site-nav" id="site-nav" aria-label="Main">
%s
  </nav>
</div></header>

<main id="main">
%s
</main>

%s
%s
%s
%s

<script>
document.addEventListener('click', function (e) {
  var a = e.target.closest('[data-go]'); if (!a) return;
  e.preventDefault();
  var p = a.dataset.go.split('|');
  document.querySelectorAll('.pg').forEach(function (s) { s.hidden = (s.id !== 'pg-' + p[0]); });
  document.querySelectorAll('.site-nav a').forEach(function (n) {
    if (n.dataset.go === p[0]) n.setAttribute('aria-current','page'); else n.removeAttribute('aria-current');
  });
  document.getElementById('site-nav').classList.remove('open');
  if (p[1]) { var t = document.getElementById(p[1]); if (t) { t.scrollIntoView(); return; } }
  window.scrollTo(0,0);
});
document.querySelectorAll('form:not(.as-form)').forEach(function (f) {
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    var b = f.querySelector('button[type=submit], button:not([type])');
    if (b) { b.textContent = 'Sent (demo only)'; b.disabled = true; }
  });
});
</script>
<script>
%s
</script>
</body></html>
""" % (css, LOGO, nav, '\n'.join(sections), fix(footer), cookie, fabs, asst, js)

open('/mnt/user-data/outputs/paradream-demo.html','w',encoding='utf-8').write(demo)
print('demo built:', len(demo), 'chars')
