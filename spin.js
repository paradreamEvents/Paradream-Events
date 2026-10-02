/* ==========================================================
   Paradream - Christmas countdown bar + "Spin for a Christmas
   Surprise" popup.

   How it works: the visitor enters their email, the server
   (netlify/functions/spin.mjs) gives that email ONE spin, picks the
   prize and makes the claim code; this file just animates the wheel
   to whatever the server picked.

   Seasonal: it only shows between CONFIG.start and CONFIG.end.
   To retire it for good, delete the spin.css and spin.js lines
   in build.py and rebuild.

   Preview at any time (ignores dates, saved results and snooze):
       add  ?spin=1      to any page address
   Forget the result saved on your own device:
       add  ?spin=reset  to any page address
   (Your email stays used on the server; test with another address.)

   The ODDS are not here - they are in netlify/functions/spin.mjs.
   ========================================================== */
(function () {
  "use strict";

  /* ── What you can change ─────────────────────────────────── */
  var CONFIG = {
    start: "2026-10-01",            // first day it shows (visitor's local time)
    end: "2026-12-26",              // last day it shows (keep in step with spin.mjs)
    christmas: "2026-12-25T00:00:00",
    bookUrl: "christmas.html",      // where "Book Your Christmas Event" goes
    whatsapp: "96181406046",
    endpoint: "/.netlify/functions/spin",
    autoOpenAfterMs: 9000,          // the popup opens by itself after this long...
    snoozeDays: 3,                  // ...and stays quiet this many days once closed

    // The wheel, clockwise from the top: its look and the prize wording.
    // The ids must match PRIZES in netlify/functions/spin.mjs.
    // `none: true` = the wheel lands there but the visitor wins nothing.
    prizes: [
      { id: "again-a", lines: ["Try", "Again"],       icon: "🎉", none: true },
      { id: "consult", lines: ["Free", "Consult"],     icon: "💬",
        title: "A free planning consultation", note: "One-to-one with a Paradream planner." },
      { id: "off10",   lines: ["10%", "Off"],          icon: "🏷️",
        title: "10% off your event",           note: "Applied when you book your Christmas event." },
      { id: "off20",   lines: ["20%", "Off"],          icon: "💸",
        title: "20% off your event",           note: "Applied when you book your Christmas event." },
      { id: "again-b", lines: ["Try", "Again"],        icon: "🎉", none: true },
      { id: "candy",   lines: ["Free", "Candy"],       icon: "🍬",
        title: "Free candy",                   note: "Added to your Christmas event booking." },
      { id: "santa",   lines: ["Santa", "Character"],  icon: "🎅",
        title: "A free Santa character",       note: "Joins your Christmas event." }
    ]
  };

  var STORE = "pd-spin";            // result saved on this device
  var SNOOZE = "pd-spin-snooze";    // popup closed; keep quiet until this time
  var BAR_OFF = "pd-spin-bar";      // countdown bar dismissed this visit
  var SPIN_MS = 5400;

  /* ── Pure helpers (also used by the tests) ───────────────── */
  function rnd() {
    try {
      if (typeof crypto !== "undefined" && crypto.getRandomValues) {
        var a = new Uint32Array(1);
        crypto.getRandomValues(a);
        return a[0] / 4294967296;
      }
    } catch (e) { /* fall through */ }
    return Math.random();
  }

  // New absolute rotation (degrees, always increasing) that leaves segment
  // `index` under the pointer at the top. Segment k covers
  // [k*seg, (k+1)*seg) of the wheel at rest.
  function landingAngle(index, n, current, rand, turns) {
    var seg = 360 / n;
    var center = index * seg + seg / 2;
    var jitter = (rand() - 0.5) * seg * 0.5;       // stay well clear of the dividers
    var want = (((360 - center + jitter) % 360) + 360) % 360;
    var have = ((current % 360) + 360) % 360;
    var delta = (((want - have) % 360) + 360) % 360;
    return current + turns * 360 + delta;
  }

  // Which segment is under the pointer for a given wheel rotation.
  function segmentAt(rotation, n) {
    var seg = 360 / n;
    var phi = ((-rotation % 360) + 360) % 360;
    return Math.floor(phi / seg) % n;
  }

  function countdownParts(ms) {
    ms = Math.max(0, ms);
    return {
      d: Math.floor(ms / 864e5),
      h: Math.floor((ms % 864e5) / 36e5),
      m: Math.floor((ms % 36e5) / 6e4),
      s: Math.floor((ms % 6e4) / 1e3)
    };
  }

  function inSeason(now, cfg) {
    var from = new Date(cfg.start + "T00:00:00");
    var to = new Date(cfg.end + "T00:00:00");
    to.setDate(to.getDate() + 1);                  // `end` is inclusive
    return now >= from && now < to;
  }

  var api = {
    CONFIG: CONFIG, landingAngle: landingAngle, segmentAt: segmentAt,
    countdownParts: countdownParts, inSeason: inSeason
  };
  if (typeof module === "object" && module.exports) module.exports = api;
  if (typeof document === "undefined") return;     // tests stop here

  /* ── Everything below runs in the browser only ───────────── */
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var params = new URLSearchParams(location.search);
  var force = params.get("spin") === "1" || params.get("spin") === "reset";
  var path = location.pathname.toLowerCase();

  function read(store, key) {
    try { return store.getItem(key); } catch (e) { return null; }
  }
  function write(store, key, val) {
    try { store.setItem(key, val); } catch (e) { /* storage blocked */ }
  }
  function loadSaved() {
    try { return JSON.parse(read(localStorage, STORE) || "null"); } catch (e) { return null; }
  }
  function indexOfPrize(id) {
    for (var i = 0; i < CONFIG.prizes.length; i++) if (CONFIG.prizes[i].id === id) return i;
    return -1;
  }
  function savedPrize() {
    var s = loadSaved();
    var i = s ? indexOfPrize(s.id) : -1;
    return i < 0 ? null : { cfg: CONFIG.prizes[i], index: i, code: s.code || null };
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  if (params.get("spin") === "reset") {
    try { localStorage.removeItem(STORE); localStorage.removeItem(SNOOZE); sessionStorage.removeItem(BAR_OFF); } catch (e) { /* ignore */ }
  }

  var active = force || inSeason(new Date(), CONFIG);
  if (!active) return;
  if (path.indexOf("thanks") !== -1) return;       // never on the thank-you page

  var N = CONFIG.prizes.length;
  var SEG = 360 / N;

  /* ── Wheel artwork ───────────────────────────────────────── */
  function polar(cx, cy, r, deg) {
    var a = deg * Math.PI / 180;
    return [cx + r * Math.sin(a), cy - r * Math.cos(a)];
  }
  function wedge(c, r, a0, a1) {
    var p0 = polar(c, c, r, a0), p1 = polar(c, c, r, a1);
    return "M" + c + " " + c + " L" + p0[0].toFixed(2) + " " + p0[1].toFixed(2) +
           " A" + r + " " + r + " 0 " + (a1 - a0 > 180 ? 1 : 0) + " 1 " +
           p1[0].toFixed(2) + " " + p1[1].toFixed(2) + " Z";
  }

  // Red / white alternate; with an odd number of segments the last one is charcoal
  // so it never sits next to a segment of its own color (charcoal, like the footer).
  function segStyle(k) {
    if (N % 2 === 1 && k === N - 1) return { fill: "#1A1A1A", ink: "#fff" };
    return k % 2 === 0 ? { fill: "#E4251B", ink: "#fff" } : { fill: "#F5F7F9", ink: "#12263A" };
  }

  function discSvg() {
    var c = 196, parts = [];
    parts.push('<svg class="pdx-disc" viewBox="0 0 392 392" aria-hidden="true" focusable="false">');
    parts.push('<defs><radialGradient id="pdx-shade" cx="50%" cy="50%" r="50%">' +
               '<stop offset="62%" stop-color="#000" stop-opacity="0"/>' +
               '<stop offset="100%" stop-color="#000" stop-opacity=".22"/></radialGradient></defs>');
    CONFIG.prizes.forEach(function (p, k) {
      parts.push('<path d="' + wedge(c, c, k * SEG, (k + 1) * SEG) + '" fill="' + segStyle(k).fill +
                 '" stroke="#fff" stroke-width="2.5"/>');
    });
    CONFIG.prizes.forEach(function (p, k) {
      var ink = segStyle(k).ink;
      var two = p.lines.length > 1;
      var size = two ? 14 : 15.5;
      var g = '<g transform="rotate(' + (k * SEG + SEG / 2) + ' ' + c + ' ' + c + ')">';
      g += '<text x="' + c + '" y="' + (c - 150) + '" font-size="27" text-anchor="middle" dominant-baseline="central">' + p.icon + '</text>';
      p.lines.forEach(function (line, i) {
        var dx = two ? (i === 0 ? -8.5 : 8.5) : 0;
        g += '<text transform="translate(' + (c + dx) + ' ' + (c - 92) + ') rotate(-90)" text-anchor="middle" ' +
             'dominant-baseline="central" font-family="Lato,system-ui,sans-serif" font-weight="900" ' +
             'font-size="' + size + '" letter-spacing=".3" fill="' + ink + '">' + line + '</text>';
      });
      parts.push(g + '</g>');
    });
    parts.push('<circle cx="' + c + '" cy="' + c + '" r="' + c + '" fill="url(#pdx-shade)"/>');
    parts.push('</svg>');
    return parts.join("");
  }

  function rimSvg() {
    var c = 220, bulbs = "";
    for (var i = 0; i < 24; i++) {
      var p = polar(c, c, 208, i * 15);
      bulbs += '<circle class="pdx-bulb pdx-bulb-' + (i % 2 ? "b" : "a") + '" cx="' + p[0].toFixed(1) +
               '" cy="' + p[1].toFixed(1) + '" r="4.6"/>';
    }
    return '<svg class="pdx-rim" viewBox="0 0 440 440" aria-hidden="true" focusable="false">' +
      '<defs><linearGradient id="pdx-rimg" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#F0382E"/><stop offset="1" stop-color="#B91910"/></linearGradient></defs>' +
      '<circle cx="' + c + '" cy="' + c + '" r="218" fill="url(#pdx-rimg)"/>' +
      '<circle cx="' + c + '" cy="' + c + '" r="199" fill="none" stroke="#000" stroke-width="5"/>' +
      '<circle cx="' + c + '" cy="' + c + '" r="216" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="1.5"/>' +
      bulbs + '</svg>';
  }

  var POINTER = '<svg class="pdx-pointer" viewBox="0 0 60 72" aria-hidden="true" focusable="false">' +
    '<path d="M30 68 8 18Q5 7 15 6H45Q55 7 52 18Z" fill="#fff" stroke="#000" stroke-width="5" stroke-linejoin="round"/></svg>';

  var GIFT = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20 7h-2.3A3.2 3.2 0 0 0 12 5a3.2 3.2 0 0 0-5.7 2H4a1 1 0 0 0-1 1v3h8V8h2v3h8V8a1 1 0 0 0-1-1ZM9.5 7a1.2 1.2 0 1 1 1.2 1.2H9.5Zm4.8 1.2A1.2 1.2 0 1 1 15.5 7v1.2ZM4 13v6a1 1 0 0 0 1 1h6v-7Zm9 0v7h6a1 1 0 0 0 1-1v-6Z"/></svg>';

  /* ── Build the page furniture ────────────────────────────── */
  var body = document.body;
  var bar = null, timerEl = null, barTimer = null, launch = null, modal = null, card = null;
  var discEl, formEl, emailEl, spinBtn, errorEl, subEl, titleEl, resultEl, fineEl;
  var rotation = 0, busy = false, lastFocus = null;

  function buildBar() {
    if (read(sessionStorage, BAR_OFF) === "1" && !force) return;
    bar = el("div", "pdx-bar");
    bar.setAttribute("role", "region");
    bar.setAttribute("aria-label", "Christmas promotion");
    bar.appendChild(el("strong", "pdx-bar-lead", "Christmas is coming!"));
    timerEl = el("span", "pdx-bar-timer");
    timerEl.setAttribute("role", "timer");
    timerEl.setAttribute("aria-live", "off");
    bar.appendChild(timerEl);
    var cta = el("a", "pdx-bar-cta", "Book Your Christmas Event");
    cta.href = CONFIG.bookUrl;
    bar.appendChild(cta);
    var x = el("button", "pdx-bar-x");
    x.type = "button";
    x.setAttribute("aria-label", "Hide this message");
    x.innerHTML = "&times;";
    x.addEventListener("click", function () {
      write(sessionStorage, BAR_OFF, "1");
      clearInterval(barTimer);
      bar.remove();
    });
    bar.appendChild(x);
    var skip = document.querySelector(".skip");
    if (skip && skip.nextSibling) body.insertBefore(bar, skip.nextSibling);
    else body.insertBefore(bar, body.firstChild);
    tick();
    barTimer = setInterval(tick, 1000);
  }

  function tick() {
    if (!timerEl) return;
    var left = new Date(CONFIG.christmas) - new Date();
    if (left <= 0) {
      timerEl.textContent = "";
      var lead = bar.querySelector(".pdx-bar-lead");
      if (lead) lead.textContent = "Merry Christmas from all of us at Paradream!";
      var cta = bar.querySelector(".pdx-bar-cta");
      if (cta) cta.hidden = true;
      return;
    }
    var t = countdownParts(left);
    function two(n) { return n < 10 ? "0" + n : "" + n; }
    timerEl.innerHTML = "<b>" + t.d + "</b>d <b>" + two(t.h) + "</b>h <b>" + two(t.m) + "</b>m" +
      '<span class="pdx-sec"> <b>' + two(t.s) + "</b>s</span>";
  }

  function buildLauncher() {
    launch = el("button", "pdx-launch");
    launch.type = "button";
    launch.innerHTML = GIFT + '<span></span>';
    launch.addEventListener("click", function () { openModal(); });
    body.appendChild(launch);
    refreshLauncher();
  }

  // "Spin & win" until they have spun; "Your Christmas prize" if they won;
  // gone if they spun and did not win (nothing left to do).
  function refreshLauncher() {
    var s = savedPrize();
    launch.hidden = !!(s && s.cfg.none);
    launch.querySelector("span").textContent = s ? "Your Christmas prize" : "Spin & win";
    launch.setAttribute("aria-label", s ? "See your Christmas prize" : "Spin the Christmas wheel");
  }

  function buildModal() {
    modal = el("div", "pdx-modal");
    modal.hidden = true;
    modal.innerHTML =
      '<div class="pdx-backdrop" data-pdx-close></div>' +
      '<div class="pdx-card" role="dialog" aria-modal="true" aria-labelledby="pdx-title" tabindex="-1">' +
        '<button class="pdx-close" type="button" aria-label="Close" data-pdx-close>&times;</button>' +
        '<h2 id="pdx-title">Spin for a Christmas Surprise!</h2>' +
        '<p class="pdx-sub" id="pdx-sub">Enter your email for one free spin.</p>' +
        '<div class="pdx-wheel">' + rimSvg() + discSvg() + POINTER +
          '<div class="pdx-hub"><img src="images/logo-mark.png" alt=""></div></div>' +
        '<form class="pdx-form" id="pdx-form" novalidate>' +
          '<label class="pdx-hide" for="pdx-email">Your email address</label>' +
          '<input class="pdx-input" id="pdx-email" name="email" type="email" inputmode="email" ' +
            'autocomplete="email" placeholder="Your email address" maxlength="254" required>' +
          '<div class="pdx-hp" hidden><input name="website" tabindex="-1" autocomplete="off"></div>' +
          '<p class="pdx-error" id="pdx-error" role="alert" hidden></p>' +
          '<button type="submit" class="btn btn-solid pdx-spin" id="pdx-spin">Spin the Wheel</button>' +
          '<p class="pdx-consent">We use your email only for this offer and to reply about your event. ' +
            '<a href="privacy.html">Privacy Policy</a></p>' +
        '</form>' +
        '<div class="pdx-result" id="pdx-result" aria-live="polite" hidden></div>' +
        '<p class="pdx-fine" id="pdx-fine">One spin per email address. Prizes are confirmed by your Paradream planner.</p>' +
      '</div>';
    body.appendChild(modal);

    card = modal.querySelector(".pdx-card");
    discEl = modal.querySelector(".pdx-disc");
    formEl = modal.querySelector("#pdx-form");
    emailEl = modal.querySelector("#pdx-email");
    spinBtn = modal.querySelector("#pdx-spin");
    errorEl = modal.querySelector("#pdx-error");
    subEl = modal.querySelector("#pdx-sub");
    titleEl = modal.querySelector("#pdx-title");
    resultEl = modal.querySelector("#pdx-result");
    fineEl = modal.querySelector("#pdx-fine");

    modal.addEventListener("click", function (e) {
      if (e.target.hasAttribute && e.target.hasAttribute("data-pdx-close")) closeModal();
    });
    formEl.addEventListener("submit", onSubmit);
    emailEl.addEventListener("input", function () { setError(""); });
    document.addEventListener("keydown", function (e) {
      if (modal.hidden) return;
      if (e.key === "Escape") { closeModal(); return; }
      if (e.key === "Tab") trapTab(e);
    });
  }

  function trapTab(e) {
    var nodes = card.querySelectorAll('a[href], button:not([disabled]), input:not([disabled])');
    var list = [];
    for (var i = 0; i < nodes.length; i++) if (nodes[i].offsetParent !== null) list.push(nodes[i]);
    if (!list.length) { e.preventDefault(); card.focus(); return; }
    var first = list[0], last = list[list.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === card)) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  }

  /* ── Open / close ────────────────────────────────────────── */
  function openModal() {
    if (!modal.hidden) return;
    lastFocus = document.activeElement;
    var s = savedPrize();
    if (s) {
      // They already spun on this device: rest the wheel on their result.
      rotation = landingAngle(s.index, N, 0, function () { return 0.5; }, 0);
      discEl.style.transition = "none";
      discEl.style.transform = "rotate(" + rotation + "deg)";
      showResult(s.cfg, s.code, true);
    } else {
      showForm();
    }
    modal.hidden = false;
    document.documentElement.classList.add("pdx-lock");
    launch.classList.add("is-hidden");
    card.focus();
  }

  function closeModal() {
    if (modal.hidden) return;
    modal.hidden = true;
    document.documentElement.classList.remove("pdx-lock");
    launch.classList.remove("is-hidden");
    if (!loadSaved()) {
      write(localStorage, SNOOZE, String(Date.now() + CONFIG.snoozeDays * 864e5));
    }
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  /* ── States of the popup ─────────────────────────────────── */
  function setError(msg) {
    errorEl.textContent = msg;
    errorEl.hidden = !msg;
  }

  function setBusy(label) {
    busy = !!label;
    spinBtn.disabled = busy;
    emailEl.disabled = busy;
    spinBtn.textContent = label || "Spin the Wheel";
  }

  function showForm() {
    card.classList.remove("is-won");
    resultEl.hidden = true;
    resultEl.textContent = "";
    formEl.hidden = false;
    setError("");
    setBusy("");
    titleEl.textContent = "Spin for a Christmas Surprise!";
    subEl.textContent = "Enter your email for one free spin.";
    fineEl.textContent = "One spin per email address. Prizes are confirmed by your Paradream planner.";
    fineEl.hidden = false;
  }

  function showResult(prize, code, returning) {
    card.classList.add("is-won");
    formEl.hidden = true;
    var won = !prize.none;
    if (won) {
      titleEl.textContent = returning ? "Your Christmas Prize" : "Congratulations!";
      subEl.textContent = returning ? "You already spun — here is what you won." : "You won:";
    } else {
      titleEl.textContent = returning ? "Thanks for Spinning" : "So Close!";
      subEl.textContent = returning ? "Your spin has been used — no prize this time." : "No prize this time.";
    }
    resultEl.textContent = "";
    var row = el("div", "pdx-actions");

    if (won) {
      resultEl.appendChild(el("p", "pdx-prize", prize.title));
      resultEl.appendChild(el("p", "pdx-note", prize.note));

      var chip = el("button", "pdx-code");
      chip.type = "button";
      chip.setAttribute("aria-label", "Your code " + code + ". Press to copy.");
      chip.appendChild(el("small", null, "Your code"));
      chip.appendChild(el("b", null, code));
      var hint = el("em", null, "Tap to copy");
      chip.appendChild(hint);
      chip.addEventListener("click", function () {
        var done = function () { hint.textContent = "Copied"; };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(done, function () {});
        else done();
      });
      resultEl.appendChild(chip);

      var wa = el("a", "btn btn-solid", "Claim on WhatsApp");
      var msg = 'Hi Paradream! I won "' + prize.title + '" on your Christmas spin wheel. My code: ' + code;
      wa.href = "https://wa.me/" + CONFIG.whatsapp + "?text=" + encodeURIComponent(msg);
      wa.target = "_blank";
      wa.rel = "noopener";
      row.appendChild(wa);
      fineEl.textContent = "Mention your code when you book. Your Paradream planner will confirm the details.";
    } else {
      resultEl.appendChild(el("p", "pdx-prize", "Thanks for playing!"));
      resultEl.appendChild(el("p", "pdx-note", "Plan your Christmas event with Paradream and we will make it one to remember."));
      fineEl.textContent = "One spin per email address.";
    }

    var book = el("a", won ? "btn pdx-ghost" : "btn btn-solid", "Book Your Christmas Event");
    book.href = CONFIG.bookUrl;
    row.appendChild(book);
    resultEl.appendChild(row);

    resultEl.hidden = false;
    fineEl.hidden = false;
    refreshLauncher();
  }

  /* ── Submit: ask the server, then spin to its answer ─────── */
  function onSubmit(e) {
    e.preventDefault();
    if (busy) return;
    var email = emailEl.value.trim();
    if (!/^\S+@\S+\.\S{2,}$/.test(email)) {
      setError("Please enter a valid email address.");
      emailEl.focus();
      return;
    }
    if (typeof fetch !== "function") { setError("Your browser is too old for the spin. Please try another."); return; }

    setError("");
    setBusy("One moment…");
    var ctl = typeof AbortController === "function" ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 12000);
    var hp = formEl.querySelector('input[name="website"]');

    fetch(CONFIG.endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: email, website: hp ? hp.value : "" }),
      signal: ctl ? ctl.signal : undefined
    }).then(function (r) {
      return r.json().then(function (j) { return { status: r.status, data: j }; },
                           function () { return { status: r.status, data: {} }; });
    }).then(function (res) {
      clearTimeout(timer);
      if (res.status === 200 && res.data && indexOfPrize(res.data.id) >= 0) {
        spinTo(res.data.id, res.data.code || null);
        return;
      }
      setBusy("");
      if (res.status === 409) setError("This email has already used its spin. There is one spin per email address.");
      else if (res.status === 400) setError("Please enter a valid email address.");
      else if (res.status === 403) setError("Sorry, this promotion has ended.");
      else setError("Something went wrong on our side. Please try again in a moment.");
    }).catch(function () {
      clearTimeout(timer);
      setBusy("");
      setError("We could not reach the server. Check your connection and try again.");
    });
  }

  function spinTo(id, code) {
    var idx = indexOfPrize(id);
    var prize = CONFIG.prizes[idx];
    setBusy("Spinning…");
    card.classList.add("is-spinning");

    // Remember the result on this device right away (a refresh mid-spin
    // must not lose it). The server already holds the real record.
    write(localStorage, STORE, JSON.stringify({ id: id, code: code, at: Date.now() }));

    var ms = reduced ? 700 : SPIN_MS;
    rotation = landingAngle(idx, N, rotation, rnd, reduced ? 1 : 5 + Math.floor(rnd() * 2));
    discEl.style.transition = "transform " + ms + "ms cubic-bezier(.17,.67,.12,.99)";
    discEl.style.transform = "rotate(" + rotation + "deg)";

    // Reveal the result when the wheel has actually stopped. The timer is a
    // safety net for browsers that skip the transition; `finished` makes sure
    // only one of the two ever runs.
    var finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      discEl.removeEventListener("transitionend", onEnd);
      card.classList.remove("is-spinning");
      setBusy("");
      showResult(prize, code, false);
      card.focus();
      if (!prize.none) {
        var r = card.getBoundingClientRect();
        if (window.pdConfetti) window.pdConfetti(r.left + r.width / 2, r.top + Math.min(200, r.height / 3), 80);
      }
    }
    function onEnd(ev) {
      if (ev.target === discEl && ev.propertyName === "transform") finish();
    }
    discEl.addEventListener("transitionend", onEnd);
    setTimeout(finish, ms + 900);
  }

  /* ── Carry the prize into the Christmas booking form ─────── */
  function prefillChristmasForm() {
    var form = document.querySelector('form[name="christmas-enquiry"]');
    if (!form) return;
    var s = savedPrize();
    if (!s || s.cfg.none || !s.code) return;
    var notes = form.querySelector('textarea[name="notes"]');
    var line = "Christmas spin-wheel prize: " + s.cfg.title + " (code " + s.code + ")";
    if (notes && notes.value.indexOf(s.code) === -1) {
      notes.value = notes.value ? line + "\n" + notes.value : line;
    }
    var box = el("p", "pdx-claimed");
    box.appendChild(el("strong", null, "Your Christmas prize: "));
    box.appendChild(document.createTextNode(s.cfg.title + " — code " + s.code +
      ". We added it to your request below."));
    form.parentNode.insertBefore(box, form);
  }

  /* ── Go ──────────────────────────────────────────────────── */
  buildBar();
  buildModal();
  buildLauncher();
  prefillChristmasForm();

  var hasSpun = !!savedPrize();
  var snoozed = Number(read(localStorage, SNOOZE) || 0) > Date.now();
  var onFormPage = !!document.querySelector("form.form");

  if (params.get("spin") === "1" || params.get("spin") === "reset") {
    setTimeout(openModal, 400);
  } else if (!hasSpun && !snoozed && !onFormPage) {
    var opened = false;
    var go = function () {
      if (opened) return;
      opened = true;
      window.removeEventListener("scroll", onScroll);
      openModal();
    };
    var onScroll = function () {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      if (max > 0 && window.scrollY / max > 0.45) go();
    };
    setTimeout(go, CONFIG.autoOpenAfterMs);
    window.addEventListener("scroll", onScroll, { passive: true });
  }
})();
