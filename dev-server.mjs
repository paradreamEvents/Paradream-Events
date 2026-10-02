/* Paradream - local preview server.
 *
 * Serves the site exactly as it is on disk, and also runs the parts that
 * only exist on Netlify, so the spin wheel can be tried for real:
 *   - Netlify functions   /.netlify/functions/<name>   (netlify/functions/<name>.mjs)
 *   - Netlify Blobs       a local store in .netlify/blobs-local (kept between runs)
 *   - Netlify image CDN   /.netlify/images?url=/images/x.jpg  (serves the original file)
 *
 * Run (from this folder, after `npm install` once):
 *     node dev-server.mjs              -> http://127.0.0.1:8123
 *     node dev-server.mjs 9000         -> another port
 *     node dev-server.mjs --fresh      -> forget every email that has already spun
 *     node dev-server.mjs --lan        -> also reachable from a phone on your Wi-Fi
 *
 * Nothing here is used on the live site.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { BlobsServer } from "@netlify/blobs/server";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const PORT = Number(args.find((a) => /^\d+$/.test(a))) || 8123;
const HOST = args.includes("--lan") ? "0.0.0.0" : "127.0.0.1";
const BLOBS_DIR = path.join(ROOT, ".netlify", "blobs-local");

if (args.includes("--fresh")) fs.rmSync(BLOBS_DIR, { recursive: true, force: true });
fs.mkdirSync(BLOBS_DIR, { recursive: true });

/* local Blobs store, wired in the way Netlify wires it on the real site */
const blobs = new BlobsServer({ directory: BLOBS_DIR, token: "local-dev", port: 0 });
const { port: blobsPort } = await blobs.start();
process.env.NETLIFY_BLOBS_CONTEXT = Buffer.from(JSON.stringify({
  edgeURL: "http://127.0.0.1:" + blobsPort,
  token: "local-dev",
  siteID: "local-site"
})).toString("base64");

const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif",
  ".ico": "image/x-icon", ".woff2": "font/woff2", ".mp4": "video/mp4", ".pdf": "application/pdf"
};

function safeFile(urlPath) {
  const p = path.normalize(path.join(ROOT, decodeURIComponent(urlPath)));
  if (p !== ROOT && !p.startsWith(ROOT + path.sep)) return null;      // no ../ escapes
  const rel = path.relative(ROOT, p).split(path.sep);
  if (rel[0] === "node_modules" || rel[0] === ".git" || rel[0] === ".netlify") return null;
  return p;
}

function sendFile(res, file, status = 200) {
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404, { "content-type": "text/plain" }); return res.end("Not found"); }
    res.writeHead(status, {
      "content-type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream",
      "cache-control": "no-store"
    });
    res.end(buf);
  });
}

const fnCache = new Map();
async function runFunction(name, req, res, body) {
  const file = path.join(ROOT, "netlify", "functions", name.replace(/[^\w-]/g, "") + ".mjs");
  if (!fs.existsSync(file)) { res.writeHead(404); return res.end("No such function"); }
  try {
    if (!fnCache.has(file)) fnCache.set(file, await import(pathToFileURL(file).href));
    const request = new Request("http://" + (req.headers.host || "127.0.0.1") + req.url, {
      method: req.method,
      headers: req.headers,
      body: ["GET", "HEAD"].includes(req.method) ? undefined : body
    });
    const response = await fnCache.get(file).default(request, {});
    const headers = {};
    response.headers.forEach((v, k) => { headers[k] = v; });
    res.writeHead(response.status, headers);
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (e) {
    console.error("function " + name + " crashed:", e);
    res.writeHead(500, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "server" }));
  }
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url, "http://local");
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", async () => {
    const t0 = Date.now();
    res.on("finish", () => console.log(req.method.padEnd(4), res.statusCode, u.pathname + u.search.slice(0, 60), (Date.now() - t0) + "ms"));

    const fn = u.pathname.match(/^\/\.netlify\/functions\/([\w-]+)$/);
    if (fn) return runFunction(fn[1], req, res, Buffer.concat(chunks));

    if (u.pathname === "/.netlify/images") {                // image CDN stand-in
      const target = u.searchParams.get("url") || "";
      const file = safeFile(target);
      return file ? sendFile(res, file) : (res.writeHead(400), res.end("bad url"));
    }

    let pathname = u.pathname === "/" ? "/index.html" : u.pathname;
    let file = safeFile(pathname);
    if (!file) { res.writeHead(403); return res.end("Forbidden"); }
    if (!path.extname(file) && fs.existsSync(file + ".html")) file += ".html";
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    if (!fs.existsSync(file)) {
      const nf = path.join(ROOT, "404.html");
      return fs.existsSync(nf) ? sendFile(res, nf, 404) : (res.writeHead(404, { "content-type": "text/plain" }), res.end("Not found"));
    }
    sendFile(res, file);
  });
});

server.listen(PORT, HOST, () => {
  console.log("Paradream preview  http://127.0.0.1:" + PORT + (HOST === "0.0.0.0" ? "   (also on your LAN)" : ""));
  console.log("Spin wheel preview http://127.0.0.1:" + PORT + "/index.html?spin=1");
  console.log("Functions on. Spun emails are remembered in .netlify/blobs-local (use --fresh to clear).");
});

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, async () => { try { await blobs.stop(); } catch (e) { /* ignore */ } process.exit(0); });
}
