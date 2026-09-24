/* =========================================================
   Paradream Events — site behaviour
   ========================================================= */

/* ---------------------------------------------------------
   1. PRICES — sourced from content.json (edit via admin.html,
   section "Pricing"). build.py injects `var PRICING = {...}`
   right before this file loads on every page.
   --------------------------------------------------------- */

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
      var max = document.documentElement.scrollHeight - window.innerHeight;
      header.style.setProperty("--sp", max > 0 ? Math.min(1, window.scrollY / max).toFixed(4) : 0);
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
    var prevBtn = $(".hero-arrow.prev", slider), nextBtn = $(".hero-arrow.next", slider);
    if (prevBtn) prevBtn.addEventListener("click", function () { go(i - 1); play(); });
    if (nextBtn) nextBtn.addEventListener("click", function () { go(i + 1); play(); });
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

  /* Gallery: build.py hands over the real list of photos in images/ —
     no more guessing by probing sequential numbers and stopping at the
     first gap, which used to empty the whole gallery the moment a low
     number was deleted but a higher one survived. */
  var grid = $("#gallery-grid");
  if (grid) {
    var VISIBLE = parseInt(grid.dataset.visible, 10) || 12;

    var FILES = [];
    try { FILES = JSON.parse(grid.dataset.files || "[]"); } catch (e) {}
    var STAMPS = {};
    try { STAMPS = JSON.parse(grid.dataset.stamps || "{}"); } catch (e) {}
    var ALBUMS = {};
    try { ALBUMS = JSON.parse(grid.dataset.albums || "{}"); } catch (e) {}

    var gsrc = function (id, w, q) {
      var v = STAMPS[id] ? "&v=" + STAMPS[id] : "";
      return "/.netlify/images?url=/images/gallery-" + id + ".jpg&w=" + w +
             "&fit=cover&q=" + (q || 90) + v;
    };

    var tile = function (id, hidden) {
      var fig = document.createElement("figure");
      fig.className = "shot" + (hidden ? " extra" : "");
      fig.dataset.album = ALBUMS[id] || "";
      if (hidden) fig.hidden = true;
      var im = document.createElement("img");
      im.src = gsrc(id, 800);
      im.srcset = gsrc(id, 500) + " 500w, " + gsrc(id, 800) + " 800w, " + gsrc(id, 1200) + " 1200w";
      im.sizes = "(max-width:640px) 46vw, (max-width:1100px) 31vw, 360px";
      im.width = 800;
      im.height = 800;
      im.loading = "lazy";
      im.decoding = "async";
      im.alt = "Paradream event photo " + id;
      im.dataset.full = gsrc(id, 1600, 88);
      fig.appendChild(im);
      if (ALBUMS[id]) {
        var tag = document.createElement("span");
        tag.className = "shot-tag";
        tag.textContent = ALBUMS[id];
        fig.appendChild(tag);
      }
      return fig;
    };

    // One big feature tile every 7 photos (only when enough are showing)
    var layoutFeatured = function () {
      var vis = $$(".shot", grid).filter(function (f) {
        return !f.classList.contains("filtered-out") && !f.hidden;
      });
      vis.forEach(function (f, k) { f.classList.toggle("feat", vis.length >= 6 && k % 7 === 0); });
    };

    var empty = $("#gallery-empty");
    if (!FILES.length) {
      if (empty) empty.textContent = "Photos coming soon.";
    } else {
      if (empty) empty.remove();

      FILES.forEach(function (id, i) { grid.appendChild(tile(id, i >= VISIBLE)); });

      var moreWrap = $(".gallery-more"), moreBtn = $("#gallery-more");
      var extras = $$(".shot.extra", grid);
      if (extras.length && moreWrap && moreBtn) {
        moreWrap.hidden = false;
        moreBtn.addEventListener("click", function () {
          extras.forEach(function (f) { f.hidden = false; });
          moreWrap.hidden = true;
          layoutFeatured();
        });
      }
      setupLightbox($$("img", grid));
      layoutFeatured();

      var tabs = $$(".gallery-tab", $("#gallery-tabs"));
      var shots = $$(".shot", grid);
      tabs.forEach(function (tab) {
        tab.addEventListener("click", function () {
          tabs.forEach(function (t) { t.classList.remove("active"); });
          tab.classList.add("active");
          var album = tab.dataset.album || "";
          if (!album) {
            shots.forEach(function (f) { f.classList.remove("filtered-out"); });
            if (moreWrap) moreWrap.hidden = !extras.length;
          } else {
            shots.forEach(function (f) {
              var match = f.dataset.album === album;
              f.classList.toggle("filtered-out", !match);
              if (match) f.hidden = false;
            });
            if (moreWrap) moreWrap.hidden = true;
          }
          layoutFeatured();
        });
      });
    }
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

    // Build the service options from PRICING so the two never drift apart.
    // The quantity stepper sits outside the <label> so tapping - or + never
    // toggles the checkbox by accident.
    optWrap.innerHTML = Object.keys(PRICING.services).map(function (key) {
      var s = PRICING.services[key];
      var stepper = s.type === "unit"
        ? '<div class="stepper" hidden>' +
            '<button type="button" data-step="-1" aria-label="Fewer ' + s.unit + '">&minus;</button>' +
            '<span class="stepper-val"><b data-qty="' + key + '">' + s.def + '</b> ' + s.unit + '</span>' +
            '<button type="button" data-step="1" aria-label="More ' + s.unit + '">+</button>' +
          '</div>'
        : "";
      return '<div class="opt" data-key="' + key + '">' +
               '<label><input type="checkbox" value="' + key + '"><span>' + s.label + '</span></label>' +
               stepper +
             '</div>';
    }).join("");

    var opts = $$('input[type=checkbox]', optWrap);
    var qtyOf = function (key) {
      var s = PRICING.services[key];
      var el = optWrap.querySelector('[data-qty="' + key + '"]');
      var n = parseInt(el ? el.textContent : s.def, 10) || s.def;
      return Math.min(s.max, Math.max(1, n));
    };

    // Mobile: a slim bar pinned to the bottom with the running total,
    // shown only while the options are on screen and the full estimate isn't.
    var out = $(".calc-out", calc);
    var bar = document.createElement("button");
    bar.type = "button";
    bar.className = "est-bar";
    bar.hidden = true;
    bar.innerHTML = '<span class="est-bar-label">Your estimate</span>' +
                    '<span class="est-bar-total"></span>' +
                    '<span class="est-bar-go">See breakdown</span>';
    document.body.appendChild(bar);
    bar.addEventListener("click", function () {
      out.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    });

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
        var tile = o.closest(".opt");
        var step = $(".stepper", tile);
        tile.classList.toggle("on", o.checked);
        if (step) step.hidden = !o.checked;
        if (!o.checked) return;

        if (s.type === "unit") {
          var n = qtyOf(o.value);
          add(s.label + " × " + n + " " + s.unit, [s.price[0] * n, s.price[1] * n]);
        } else if (s.type === "guest") {
          add(s.label + " × " + g + " guests", [s.price[0] * g, s.price[1] * g]);
        } else {
          add(s.label, s.price);
        }
      });

      if (travel.checked) add("Outside Beirut", PRICING.outsideBeirut);
      travel.closest(".opt").classList.toggle("on", travel.checked);

      // Coordination sits on top of everything above
      var c = PRICING.coordination;
      var coordLo = lo * c[0], coordHi = hi * c[1];
      lines.push(["Planning & coordination", [coordLo, coordHi]]);
      lo += coordLo; hi += coordHi;

      totalEl.innerHTML = show([lo, hi]) +
        "<small>What events like this usually come to. Yours is quoted individually.</small>";
      $(".est-bar-total", bar).textContent = show([lo, hi]);

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
    optWrap.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-step]");
      if (!btn) return;
      var key = btn.closest(".opt").dataset.key;
      var s = PRICING.services[key];
      var n = Math.min(s.max, Math.max(1, qtyOf(key) + parseInt(btn.dataset.step, 10)));
      optWrap.querySelector('[data-qty="' + key + '"]').textContent = n;
      update();
    });
    update();

    if ("IntersectionObserver" in window) {
      var panelIn = false, outIn = false;
      var sync = function () {
        var want = panelIn && !outIn && window.matchMedia("(max-width:860px)").matches;
        if (bar.hidden === !want) return;
        bar.hidden = !want;
        document.dispatchEvent(new Event("pd:dock"));
      };
      new IntersectionObserver(function (en) {
        panelIn = en[0].isIntersecting; sync();
      }).observe($(".calc-panel", calc));
      new IntersectionObserver(function (en) {
        outIn = en[0].isIntersecting; sync();
      }, { threshold: 0.25 }).observe(out);
      window.addEventListener("resize", sync);
    }

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

  /* ── Preselect the occasion from the link ────── */
  var occParam = new URLSearchParams(location.search).get("occasion");
  if (occParam) {
    var sel = $("#occasion");
    if (sel) {
      var norm = function (v) { return String(v).toLowerCase().replace(/[^a-z]/g, ""); };
      var want = norm(occParam);
      var hit = null;

      // exact first
      Array.prototype.forEach.call(sel.options, function (o) {
        if (!hit && norm(o.text) === want) hit = o;
      });
      // then either containing the other — catches "Your Big Day" -> "Wedding" style pairs
      if (!hit) {
        Array.prototype.forEach.call(sel.options, function (o) {
          var a = norm(o.text);
          if (!hit && (a.indexOf(want) !== -1 || want.indexOf(a) !== -1)) hit = o;
        });
      }

      if (hit) {
        sel.value = hit.value || hit.text;
      } else {
        // not in the list: add it so the enquiry still says what they wanted
        var extra = document.createElement("option");
        extra.textContent = occParam;
        sel.appendChild(extra);
        sel.value = occParam;
      }

      // make it obvious the choice carried across
      sel.classList.add("preset");
      var note = document.createElement("small");
      note.className = "field-note";
      note.textContent = "Chosen from the page you came from — change it if you like.";
      sel.parentNode.appendChild(note);
    }
  }

  /* ── Bottom dock: cookie bar, estimate bar, floating buttons ── */
  // Anything pinned to the bottom pushes the WhatsApp / chat buttons up,
  // so nothing ever sits on top of the Accept button or the estimate.
  var dock = function () {
    var used = 0;
    var cookie = $("#cookie-bar");
    if (cookie && !cookie.hidden) used += cookie.offsetHeight + 16;
    var est = $(".est-bar");
    if (est) {
      est.style.bottom = used + "px";
      if (!est.hidden) used += est.offsetHeight;
      document.documentElement.classList.toggle("calc-active", !est.hidden);
    }
    document.documentElement.style.setProperty("--dock", used + "px");
  };
  document.addEventListener("pd:dock", dock);
  window.addEventListener("resize", dock);

  /* ── Cookie notice ───────────────────────────── */
  try {
    var cbar = $("#cookie-bar");
    if (cbar && !localStorage.getItem("pd-cookies")) {
      cbar.hidden = false;
      $("#cookie-accept").addEventListener("click", function () {
        try { localStorage.setItem("pd-cookies", "1"); } catch (err) { /* ignore */ }
        cbar.hidden = true;
        dock();
      });
    }
  } catch (e) { /* storage blocked */ }
  dock();

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

/* Invitation studio: pick a format and style, type your details, watch the card update live */
(function () {
  var studio = document.querySelector("[data-invite]");
  if (!studio) return;
  var stage = studio.querySelector(".ivs-stage");
  var frame = studio.querySelector(".ivs-frame");
  var occ = {};
  try { occ = JSON.parse(studio.getAttribute("data-occasions") || "{}"); } catch (e) {}
  var q = function (s) { return studio.querySelector(s); };
  var inp = { occ: q("#ivs-occ"), names: q("#ivs-names"), date: q("#ivs-date"), venue: q("#ivs-venue") };
  var out = { mono: q('[data-out="mono"]'), kicker: q('[data-out="kicker"]'), names: q('[data-out="names"]'),
    line: q('[data-out="line"]'), date: q('[data-out="date"]'), venue: q('[data-out="venue"]') };
  var cta = document.querySelector("[data-invite-cta]");
  var fmtNames = { digital: "Digital invitation", printed: "Printed card", plexi: "Plexi / board card" };
  var themeNames = { ivory: "Ivory & Gold", blush: "Blush Rose", midnight: "Midnight Gold", sage: "Sage Garden" };
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var openBtn = q(".ivs-openbtn"), replay = q(".ivs-replay"), timer = null;

  function setState(s) {
    stage.classList.remove("is-closed", "is-opening");
    if (s) stage.classList.add(s);
    openBtn.hidden = s !== "is-closed";
    replay.hidden = s === "is-closed" || s === "is-opening";
  }
  function openEnv() {
    if (!stage.classList.contains("is-closed")) return;
    clearTimeout(timer);
    var rr = openBtn.getBoundingClientRect();
    if (window.pdConfetti) window.pdConfetti(rr.left + rr.width / 2, rr.top + rr.height / 2, 46);
    setState("is-opening");
    timer = setTimeout(function () { setState(""); }, 950);
  }
  function closeEnv() {
    clearTimeout(timer);
    setState("is-opening");
    timer = setTimeout(function () { setState("is-closed"); }, 850);
  }
  openBtn.addEventListener("click", openEnv);
  replay.addEventListener("click", closeEnv);
  stage.addEventListener("click", function (e) { if (e.target === stage) openEnv(); });
  ["pointerdown", "click", "focusin"].forEach(function (ev) {
    [q(".ivs-bar"), q(".ivs-fields")].forEach(function (el) { el.addEventListener(ev, openEnv); });
  });
  setState("is-closed");

  function monogram(s) {
    var parts = s.split(/\s*(?:&|\+|,|\band\b)\s*/i).filter(function (p) { return p.trim(); });
    var l = parts.slice(0, 2).map(function (p) { return p.trim().charAt(0).toUpperCase(); });
    return l.length ? l.join("&") : "P";
  }
  function update() {
    var o = occ[inp.occ.value] || {};
    var names = inp.names.value.trim();
    out.kicker.textContent = o.kicker || "";
    out.line.textContent = o.line || "";
    out.names.textContent = names || "Your names";
    out.mono.textContent = monogram(names);
    out.date.textContent = inp.date.value.trim() || "Date and time";
    out.venue.textContent = inp.venue.value.trim() || "Venue";
    if (cta) {
      var msg = "Invitation request - " + inp.occ.value + "\nFormat: " + fmtNames[stage.getAttribute("data-format")] +
        "\nStyle: " + themeNames[stage.getAttribute("data-theme")] + "\nNames: " + names +
        "\nDate: " + inp.date.value.trim() + "\nVenue: " + inp.venue.value.trim();
      cta.href = "contact-us.html?invite=" + encodeURIComponent(msg);
    }
  }

  var tabs = studio.querySelectorAll(".ivs-tabs button");
  tabs.forEach(function (b) {
    b.addEventListener("click", function () {
      tabs.forEach(function (x) { x.setAttribute("aria-selected", x === b ? "true" : "false"); });
      stage.setAttribute("data-format", b.getAttribute("data-f"));
      update();
    });
  });
  var swatches = studio.querySelectorAll(".ivs-themes button");
  swatches.forEach(function (b) {
    b.addEventListener("click", function () {
      swatches.forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      stage.setAttribute("data-theme", b.getAttribute("data-t"));
      update();
    });
  });
  ["input", "change"].forEach(function (ev) {
    Object.keys(inp).forEach(function (k) { inp[k].addEventListener(ev, update); });
  });

  if (!reduced && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    stage.addEventListener("pointermove", function (e) {
      if (stage.classList.contains("is-closed") || stage.classList.contains("is-opening")) return;
      var r = stage.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      frame.classList.add("is-live");
      frame.style.setProperty("--ry", ((px - 0.5) * 16).toFixed(2) + "deg");
      frame.style.setProperty("--rx", ((0.5 - py) * 12).toFixed(2) + "deg");
      frame.style.setProperty("--mx", (px * 100).toFixed(1) + "%");
      frame.style.setProperty("--my", (py * 100).toFixed(1) + "%");
    });
    stage.addEventListener("pointerleave", function () {
      frame.classList.remove("is-live");
      frame.style.setProperty("--ry", "0deg");
      frame.style.setProperty("--rx", "0deg");
      frame.style.setProperty("--mx", "50%");
      frame.style.setProperty("--my", "30%");
    });
  }
  update();
})();

/* Contact form: an invitation request from the studio arrives pre-filled */
(function () {
  var box = document.getElementById("message");
  if (!box) return;
  var msg = new URLSearchParams(location.search).get("invite");
  if (msg && !box.value) box.value = msg;
})();

/* Contact form: remember which service the visitor came from (?service=slug) */
(function () {
  var note = document.getElementById("service-note");
  var field = document.getElementById("service-field");
  if (!note || !field) return;
  var slug = new URLSearchParams(location.search).get("service");
  if (!slug) return;
  var names = {};
  try { names = JSON.parse(note.getAttribute("data-names") || "{}"); } catch (e) {}
  var title = names[slug];
  if (!title) return;
  field.value = title;
  note.textContent = "Booking enquiry: " + title;
  note.hidden = false;
})();


/* Delight: hover tilt, magnetic and rippling buttons, hero sparkles + parallax, confetti */
(function () {
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) return;
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var COLORS = ["#E4251B", "#FFD166", "#FFFFFF", "#FF8A7D", "#F2C14E"];

  window.pdConfetti = function (x, y, n) {
    n = n || 36;
    for (var i = 0; i < n; i++) {
      var p = document.createElement("i");
      p.className = "confetti";
      var ang = Math.random() * Math.PI * 2, force = 90 + Math.random() * 220;
      p.style.left = x + "px";
      p.style.top = y + "px";
      p.style.background = COLORS[i % COLORS.length];
      p.style.setProperty("--dx", Math.cos(ang) * force + "px");
      p.style.setProperty("--uy", -(60 + Math.random() * 140) + "px");
      p.style.setProperty("--dy", 120 + Math.random() * 260 + "px");
      p.style.setProperty("--r", (Math.random() * 720 - 360) + "deg");
      document.body.appendChild(p);
      (function (el) { setTimeout(function () { el.remove(); }, 1600); })(p);
    }
  };

  /* Ripple on every button */
  document.addEventListener("pointerdown", function (e) {
    var btn = e.target.closest && e.target.closest(".btn");
    if (!btn) return;
    var r = btn.getBoundingClientRect(), size = Math.max(r.width, r.height) * 2;
    var s = document.createElement("span");
    s.className = "ripple";
    s.style.width = s.style.height = size + "px";
    s.style.left = e.clientX - r.left - size / 2 + "px";
    s.style.top = e.clientY - r.top - size / 2 + "px";
    btn.appendChild(s);
    setTimeout(function () { s.remove(); }, 750);
  });

  /* Thank-you page celebrates */
  if (/thanks/.test(location.pathname)) {
    var w = window.innerWidth;
    setTimeout(function () { window.pdConfetti(w * 0.5, 160, 70); }, 500);
    setTimeout(function () { window.pdConfetti(w * 0.25, 220, 40); window.pdConfetti(w * 0.75, 220, 40); }, 900);
  }

  if (!fine) return;

  /* 3D tilt with a light glare on cards and photos */
  var tiltSel = ".svc-card, .occ-card, .svc-choice-card, .svc-photo, .mq-card";
  Array.prototype.forEach.call(document.querySelectorAll(tiltSel), function (el) {
    el.classList.add("tilt");
    var g = document.createElement("span");
    g.className = "glare";
    el.appendChild(g);
    var lift = el.classList.contains("mq-card") ? 0 : -6;
    el.addEventListener("pointermove", function (e) {
      var r = el.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      el.style.transition = "transform .1s ease-out, box-shadow .35s";
      el.style.transform = "perspective(900px) rotateX(" + ((0.5 - y) * 9).toFixed(2) + "deg) rotateY(" +
        ((x - 0.5) * 11).toFixed(2) + "deg) translateY(" + lift + "px)";
      el.style.setProperty("--mx", (x * 100).toFixed(1) + "%");
      el.style.setProperty("--my", (y * 100).toFixed(1) + "%");
    });
    el.addEventListener("pointerleave", function () {
      el.style.transition = "";
      el.style.transform = "";
    });
  });

  /* Magnetic buttons */
  Array.prototype.forEach.call(document.querySelectorAll(".btn"), function (b) {
    if (b.closest(".occ-body") || b.closest(".cookie")) return;
    b.addEventListener("pointermove", function (e) {
      var r = b.getBoundingClientRect();
      var x = (e.clientX - (r.left + r.width / 2)) / r.width, y = (e.clientY - (r.top + r.height / 2)) / r.height;
      b.style.transform = "translate(" + (x * 12).toFixed(1) + "px," + (y * 9).toFixed(1) + "px)";
    });
    b.addEventListener("pointerleave", function () { b.style.transform = ""; });
  });

  /* Hero: sparkles follow the cursor and the headline drifts with it */
  var hero = document.querySelector(".hero-slider");
  if (hero) {
    var last = 0;
    hero.addEventListener("pointermove", function (e) {
      var r = hero.getBoundingClientRect();
      hero.style.setProperty("--px", (((e.clientX - r.left) / r.width - 0.5) * -1).toFixed(3));
      hero.style.setProperty("--py", (((e.clientY - r.top) / r.height - 0.5) * -1).toFixed(3));
      var t = Date.now();
      if (t - last < 60) return;
      last = t;
      var s = document.createElement("i");
      s.className = "spark";
      s.style.left = e.clientX - r.left + "px";
      s.style.top = e.clientY - r.top + "px";
      s.style.setProperty("--c", COLORS[Math.floor(Math.random() * COLORS.length)]);
      hero.appendChild(s);
      setTimeout(function () { s.remove(); }, 900);
    });
    hero.addEventListener("pointerleave", function () {
      hero.style.setProperty("--px", 0);
      hero.style.setProperty("--py", 0);
    });
  }
})();
