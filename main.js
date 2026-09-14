/* =========================================================
   Paradream Events — site behaviour
   ========================================================= */

/* ---------------------------------------------------------
   1. PRICES — edit these. Everything in the calculator
   reads from here. Figures are USD and are starting points,
   not final quotes.
   --------------------------------------------------------- */
/* ------------------------------------------------------------------
   PARADREAM PRICING — real figures, USD.
   [low, high] on everything; a single number means a fixed price.
   Edit here and the calculator follows.
------------------------------------------------------------------- */
var PRICING = {
  currency: "$",

  // Staffing: roughly one crew member per 10 guests, at this rate each
  staff: { ratePerPerson: [65, 65], guestsPerStaff: 10 },

  // Planning & coordination, charged as a % of everything above it
  coordination: [0.30, 0.40],

  outsideBeirut: [100, 300],

  /* unit  — priced per item, with a quantity picker
     flat  — one price for the whole event
     guest — multiplied by the guest count                            */
  services: {
    zaffah:   { label: "Oriental Zaffah",      type: "unit",  unit: "musicians", price: [65, 65],    def: 6,  max: 20 },
    parade:   { label: "Live Show Parade",     type: "unit",  unit: "performers", price: [65, 65],   def: 8,  max: 25 },
    catering: { label: "Catering",             type: "guest", price: [65, 90] },
    booth:    { label: "Photo Booth",          type: "flat",  price: [500, 500] },
    mascots:  { label: "Characters & Mascots", type: "unit",  unit: "mascots",   price: [120, 200],  def: 2,  max: 8 },
    circus:   { label: "Circus Show",          type: "unit",  unit: "performers", price: [250, 250], def: 2,  max: 8 },
    inflate:  { label: "Inflatable Games",     type: "unit",  unit: "games",     price: [200, 250],  def: 2,  max: 8 },
    tables:   { label: "Table Decoration",     type: "flat",  price: [500, 2000] },
    santa:    { label: "Christmas Mascots",    type: "unit",  unit: "characters", price: [300, 400], def: 1, max: 5 }
  },

  DRAFT: false
};

(function () {
  "use strict";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ── Footer year ─────────────────────────────── */
  var yr = $("#year");
  if (yr) yr.textContent = new Date().getFullYear();

  /* ── Mobile nav ──────────────────────────────── */
  var toggle = $(".nav-toggle"), nav = $("#site-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  /* ── Header shadow on scroll ─────────────────── */
  var header = $(".site-header");
  if (header) {
    var onScroll = function () {
      header.classList.toggle("scrolled", window.scrollY > 20);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ── Reveal on scroll ────────────────────────── */
  var targets = $$(".reveal");
  if (targets.length && !reduced && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.08 });
    targets.forEach(function (t) { io.observe(t); });
  } else {
    targets.forEach(function (t) { t.classList.add("in"); });
  }

  /* ── Hero slider ─────────────────────────────── */
  var slider = $(".hero-slider");
  if (slider) {
    var slides = $$(".slide", slider),
        dots   = $$(".slider-dots button", slider),
        i = 0, timer;

    var go = function (n) {
      i = (n + slides.length) % slides.length;
      slides.forEach(function (s, k) { s.classList.toggle("active", k === i); });
      dots.forEach(function (d, k) { d.setAttribute("aria-selected", k === i ? "true" : "false"); });
    };
    var play = function () {
      if (reduced || slides.length < 2) return;
      clearInterval(timer);
      timer = setInterval(function () { go(i + 1); }, 4200);
    };

    dots.forEach(function (d, k) {
      d.addEventListener("click", function () { go(k); play(); });
    });
    slider.addEventListener("mouseenter", function () { clearInterval(timer); });
    slider.addEventListener("mouseleave", play);
    go(0); play();
  }

  /* ── Counters ────────────────────────────────── */
  var counters = $$("[data-count]");
  if (counters.length) {
    var run = function (el) {
      var end = parseFloat(el.dataset.count), t0 = null, dur = 1400;
      if (reduced) { el.textContent = end + (el.dataset.suffix || ""); return; }
      var step = function (t) {
        if (!t0) t0 = t;
        var p = Math.min((t - t0) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(end * eased) + (el.dataset.suffix || "");
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    if ("IntersectionObserver" in window) {
      var co = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting) { run(e.target); co.unobserve(e.target); }
        });
      }, { threshold: 0.4 });
      counters.forEach(function (c) { co.observe(c); });
    } else counters.forEach(run);
  }

  /* Gallery lightbox, wired up once tiles exist */
  function setupLightbox(shots) {
    if (!shots.length) return;
    var box = document.createElement("div");
    box.className = "lightbox";
    box.hidden = true;
    box.innerHTML =
      '<button class="lb-close" aria-label="Close">&times;</button>' +
      '<button class="lb-prev" aria-label="Previous">&#8249;</button>' +
      '<img alt="">' +
      '<button class="lb-next" aria-label="Next">&#8250;</button>' +
      '<p class="lb-count"></p>';
    document.body.appendChild(box);

    var bi = 0, bimg = $("img", box), bcount = $(".lb-count", box);

    var openShot = function (n) {
      bi = (n + shots.length) % shots.length;
      bimg.src = shots[bi].dataset.full || shots[bi].currentSrc || shots[bi].src;
      bimg.alt = shots[bi].alt || "";
      bcount.textContent = (bi + 1) + " / " + shots.length;
      box.hidden = false;
      document.body.style.overflow = "hidden";
    };
    var closeShot = function () { box.hidden = true; document.body.style.overflow = ""; };

    shots.forEach(function (sh, k) { sh.addEventListener("click", function () { openShot(k); }); });
    $(".lb-close", box).addEventListener("click", closeShot);
    $(".lb-prev", box).addEventListener("click", function () { openShot(bi - 1); });
    $(".lb-next", box).addEventListener("click", function () { openShot(bi + 1); });
    box.addEventListener("click", function (e) { if (e.target === box) closeShot(); });
    document.addEventListener("keydown", function (e) {
      if (box.hidden) return;
      if (e.key === "Escape") closeShot();
      if (e.key === "ArrowRight") openShot(bi + 1);
      if (e.key === "ArrowLeft") openShot(bi - 1);
    });
  }

  /* Gallery: work out which photos actually exist in images/ */
  var grid = $("#gallery-grid");
  if (grid) {
    var VISIBLE = parseInt(grid.dataset.visible, 10) || 12;
    var BATCH = 6;
    var CAP = 200;

    var STAMPS = {};
    try { STAMPS = JSON.parse(grid.dataset.stamps || "{}"); } catch (e) {}

    var gsrc = function (n, w, q) {
      var v = STAMPS[n] ? "&v=" + STAMPS[n] : "";
      return "/.netlify/images?url=/images/gallery-" + n + ".jpg&w=" + w +
             "&fit=cover&q=" + (q || 90) + v;
    };

    var probe = function (n) {
      return new Promise(function (resolve) {
        var t = new Image();
        t.onload = function () { resolve(n); };
        t.onerror = function () { resolve(null); };
        t.src = gsrc(n, 80);
      });
    };

    var tile = function (n, hidden) {
      var fig = document.createElement("figure");
      fig.className = "shot" + (hidden ? " extra" : "");
      if (hidden) fig.hidden = true;
      var im = document.createElement("img");
      im.src = gsrc(n, 800);
      im.srcset = gsrc(n, 500) + " 500w, " + gsrc(n, 800) + " 800w, " + gsrc(n, 1200) + " 1200w";
      im.sizes = "(max-width:640px) 46vw, (max-width:1100px) 31vw, 360px";
      im.width = 800;
      im.height = 800;
      im.loading = "lazy";
      im.decoding = "async";
      im.alt = "Paradream event photo " + n;
      im.dataset.full = gsrc(n, 1600, 88);
      fig.appendChild(im);
      return fig;
    };

    var found = [], next = 1;

    var finish = function () {
      var empty = $("#gallery-empty");
      if (!found.length) {
        if (empty) empty.textContent = "Photos coming soon.";
        return;
      }
      if (empty) empty.remove();

      found.sort(function (a, b) { return a - b; });
      found.forEach(function (n, i) { grid.appendChild(tile(n, i >= VISIBLE)); });

      var moreWrap = $(".gallery-more"), moreBtn = $("#gallery-more");
      var extras = $$(".shot.extra", grid);
      if (extras.length && moreWrap && moreBtn) {
        moreWrap.hidden = false;
        moreBtn.addEventListener("click", function () {
          extras.forEach(function (f) { f.hidden = false; });
          moreWrap.hidden = true;
        });
      }
      setupLightbox($$("img", grid));
    };

    var round = function () {
      var jobs = [];
      for (var i = 0; i < BATCH && next + i <= CAP; i++) jobs.push(probe(next + i));
      next += BATCH;
      Promise.all(jobs).then(function (res) {
        var hits = res.filter(Boolean);
        found = found.concat(hits);
        if (hits.length === BATCH && next <= CAP) round();
        else finish();
      });
    };

    round();
  }

  /* ── Quote calculator ────────────────────────── */
  var calc = $("#calc");
  if (calc) {
    var occSel  = $("#calc-occasion", calc),
        guests  = $("#calc-guests", calc),
        readout = $("#calc-guest-out", calc),
        travel  = $("#calc-travel", calc),
        totalEl = $("#calc-total", calc),
        linesEl = $("#calc-lines", calc),
        optWrap = $("#calc-options", calc);

    var money = function (n) {
      return PRICING.currency + Math.round(n).toLocaleString("en-US");
    };
    var show = function (p) {
      return p[0] === p[1] ? money(p[0]) : money(p[0]) + "–" + money(p[1]);
    };

    // Build the service options from PRICING so the two never drift apart
    optWrap.innerHTML = Object.keys(PRICING.services).map(function (key) {
      var s = PRICING.services[key];
      // no prices on the tiles — only the quantity label where one applies
      var sub = s.type === "unit"
        ? '<small>' + s.unit.charAt(0).toUpperCase() + s.unit.slice(1) + '</small>'
        : "";
      var qty = s.type === "unit"
        ? '<input class="qty" type="number" min="1" max="' + s.max + '" value="' + s.def +
          '" data-qty="' + key + '" aria-label="Number of ' + s.unit + '" hidden>'
        : "";
      return '<label class="opt">' +
               '<input type="checkbox" value="' + key + '">' +
               '<span>' + s.label + sub + qty + '</span>' +
             '</label>';
    }).join("");

    var opts = $$('input[type=checkbox]', optWrap);
    var qtys = $$('.qty', optWrap);

    var update = function () {
      var g = parseInt(guests.value, 10) || 0,
          lines = [], lo = 0, hi = 0;

      var add = function (label, pair) {
        lines.push([label, pair]);
        lo += pair[0]; hi += pair[1];
      };

      // Staffing scales with the guest count
      var crew = Math.max(1, Math.ceil(g / PRICING.staff.guestsPerStaff));
      var r = PRICING.staff.ratePerPerson;
      add(crew + " crew for " + g + " guests", [crew * r[0], crew * r[1]]);

      opts.forEach(function (o) {
        var s = PRICING.services[o.value];
        var qtyField = optWrap.querySelector('[data-qty="' + o.value + '"]');
        o.parentNode.classList.toggle("on", o.checked);
        if (qtyField) qtyField.hidden = !o.checked;
        if (!o.checked) return;

        if (s.type === "unit") {
          var n = Math.max(1, parseInt(qtyField.value, 10) || s.def);
          add(s.label + " × " + n + " " + s.unit, [s.price[0] * n, s.price[1] * n]);
        } else if (s.type === "guest") {
          add(s.label + " × " + g + " guests", [s.price[0] * g, s.price[1] * g]);
        } else {
          add(s.label, s.price);
        }
      });

      if (travel.checked) add("Outside Beirut", PRICING.outsideBeirut);

      // Coordination sits on top of everything above
      var c = PRICING.coordination;
      var coordLo = lo * c[0], coordHi = hi * c[1];
      lines.push(["Planning & coordination", [coordLo, coordHi]]);
      lo += coordLo; hi += coordHi;

      totalEl.innerHTML = show([lo, hi]) +
        "<small>What events like this usually come to. Yours is quoted individually.</small>";

      linesEl.innerHTML = lines.map(function (l) {
        return "<li><span>" + l[0] + "</span><span>" + show(l[1]) + "</span></li>";
      }).join("");

      readout.textContent = g;

      calc.dataset.summary =
        occSel.value + " for " + g + " guests. " +
        lines.slice(1, -1).map(function (l) { return l[0]; }).join(", ") +
        ". Site estimate " + show([lo, hi]) + ".";
    };

    [occSel, guests, travel].forEach(function (el) {
      el.addEventListener("input", update);
      el.addEventListener("change", update);
    });
    optWrap.addEventListener("change", update);
    optWrap.addEventListener("input", update);
    optWrap.addEventListener("click", function (e) {
      if (e.target.classList.contains("qty")) e.preventDefault();
    });
    update();

    var send = $("#calc-send", calc);
    if (send) {
      send.addEventListener("click", function () {
        try { sessionStorage.setItem("pd-quote", calc.dataset.summary || ""); }
        catch (err) { /* private mode */ }
      });
    }
  }

  // Carry the calculator summary into the contact form
  var msgField = $("#message");
  if (msgField && !msgField.value) {
    try {
      var q = sessionStorage.getItem("pd-quote");
      if (q) { msgField.value = q; sessionStorage.removeItem("pd-quote"); }
    } catch (e) { /* ignore */ }
  }

  /* ── Preselect occasion from ?occasion= ──────── */
  var occParam = new URLSearchParams(location.search).get("occasion");
  if (occParam) {
    var sel = $("#occasion");
    if (sel) {
      Array.prototype.forEach.call(sel.options, function (o) {
        var a = o.text.toLowerCase().replace(/[^a-z]/g, "");
        var b = occParam.toLowerCase().replace(/[^a-z]/g, "");
        if (a.indexOf(b) === 0 || b.indexOf(a) === 0) sel.value = o.value || o.text;
      });
    }
  }

  /* ── Cookie notice ───────────────────────────── */
  try {
    var bar = $("#cookie-bar");
    if (bar && !localStorage.getItem("pd-cookies")) {
      bar.hidden = false;
      $("#cookie-accept").addEventListener("click", function () {
        localStorage.setItem("pd-cookies", "1");
        bar.hidden = true;
      });
    }
  } catch (e) { /* storage blocked */ }

  /* ── Assistant ───────────────────────────────── */
  var panel = $("#assistant");
  if (panel) {
    var log     = $(".as-log", panel),
        asForm  = $(".as-form", panel),
        asInput = $(".as-form input", panel),
        openBtn = $("#fab-ai"),
        history = [];

    var say = function (text, who) {
      var d = document.createElement("div");
      d.className = "msg msg-" + who;
      d.textContent = text;
      log.appendChild(d);
      log.scrollTop = log.scrollHeight;
      return d;
    };

    var typing = function () {
      var d = document.createElement("div");
      d.className = "msg msg-bot msg-typing";
      d.innerHTML = "<span></span><span></span><span></span>";
      log.appendChild(d);
      log.scrollTop = log.scrollHeight;
      return d;
    };

    // Offline answers — used until the Netlify function has an API key
    var FALLBACK = [
      [/plan|create|organi[sz]e|arrange|book|help me|want to|looking for|need a|i have a/i,
       "Happy to help. Tell me the occasion, roughly when, where, and how many guests — " +
       "or use the quote calculator on the home page for an instant range. " +
       "To get moving properly, WhatsApp us on +961 81 406 046."],
      [/price|cost|how much|budget|quote|rate|fee/i,
       "Cost depends on the occasion, guest count and which services you want. The quote " +
       "calculator on the home page gives you a range in a few clicks. For a firm figure, " +
       "call us on +961 81 406 046."],
      [/when|how far|advance|availab|date|free on|available/i,
       "We recommend booking 6 to 12 months ahead, especially for weddings. Send us your " +
       "date and we'll tell you straight away if it's free."],
      [/zaffah|parade|show|circus|entertain|mascot|inflat|photo ?booth|dj|music|drum/i,
       "We do live show parades, oriental zaffah, circus acts, photo booths, characters and " +
       "mascots, and inflatable games. Our Services has the full list with photos."],
      [/cater|food|menu|f&b|drink|bar|buffet/i,
       "Yes — catering and F&B are part of what we do, with menus, service staff and bar " +
       "built around your guest count."],
      [/where|location|address|office|outside|region|area|deliver/i,
       "We're in Furn El Chebbak, Beirut, and we work across Lebanon. Events outside Beirut " +
       "carry a small travel supplement."],
      [/contact|phone|call|whatsapp|email|reach|speak/i,
       "Call or WhatsApp +961 81 406 046, or email paradedream@gmail.com. There's a form on " +
       "the Contact page too."],
      [/join|hire|job|team|work with|audition|apply|cv/i,
       "We take on performers, dancers, drummers, mascot artists and service staff through " +
       "the year. The Join Our Team page has a form where you can attach your CV."],
      [/wedding|engagement|baptism|communion|birthday|christmas|proposal|bachelor|gender|corporate/i,
       "We cover that. The Occasions page has details and photos for each one, and you can " +
       "send an enquiry straight from there."],
      [/photo|picture|gallery|portfolio|see your work|example/i,
       "Have a look at the Gallery — it's full of real events we've run. There's more on " +
       "Instagram at @paradream.lb."],
      [/hello|hi|hey|good (morning|evening|afternoon)|salam|marhaba|bonjour/i,
       "Hello! What are you planning? Tell me the occasion and roughly when, and I'll point " +
       "you in the right direction."],
      [/thank|shukran|merci/i,
       "Any time. If you'd like to take it further, WhatsApp us on +961 81 406 046."]
    ];

    var offlineReply = function (q) {
      for (var k = 0; k < FALLBACK.length; k++) {
        if (FALLBACK[k][0].test(q)) return FALLBACK[k][1];
      }
      return "I can help with services, pricing, dates, locations and joining the team. " +
             "For anything else — or to start planning properly — WhatsApp us on " +
             "+961 81 406 046 and someone from the team will answer.";
    };

    var ask = function (text) {
      say(text, "me");
      history.push({ role: "user", content: text });
      var t = typing();

      fetch("/.netlify/functions/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history })
      })
        .then(function (r) {
          if (!r.ok) throw new Error("no function");
          return r.json();
        })
        .then(function (data) {
          t.remove();
          var reply = (data && data.reply) ? data.reply : offlineReply(text);
          say(reply, "bot");
          history.push({ role: "assistant", content: reply });
        })
        .catch(function () {
          setTimeout(function () {
            t.remove();
            var reply = offlineReply(text);
            say(reply, "bot");
            history.push({ role: "assistant", content: reply });
          }, 450);
        });
    };

    asForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var v = asInput.value.trim();
      if (!v) return;
      asInput.value = "";
      ask(v);
    });

    $$(".as-chips button", panel).forEach(function (b) {
      b.addEventListener("click", function () { ask(b.textContent); });
    });

    var openPanel = function () {
      panel.hidden = false;
      asInput.focus();
      if (!log.children.length) {
        say("Hi! I'm Paradream's assistant. Ask me about services, pricing or dates — or tell me what you're planning.", "bot");
      }
    };

    if (openBtn) openBtn.addEventListener("click", openPanel);
    $(".as-head button", panel).addEventListener("click", function () { panel.hidden = true; });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !panel.hidden) panel.hidden = true;
    });
  }
})();
