const express = require("express");
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();
app.disable("x-powered-by");

/* ─── Security Headers ─── */
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self'; img-src 'self' data:;"
  );
  next();
});

/* ─── Rate Limiting (in-memory, per-IP) ─── */
const rateMap = new Map();
const RATE_WINDOW = 60_000; // 1 minute
const RATE_LIMIT = 120; // requests per window

function rateLimit(req, res, next) {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  let entry = rateMap.get(ip);
  if (!entry || now - entry.start > RATE_WINDOW) {
    entry = { start: now, count: 0 };
    rateMap.set(ip, entry);
  }
  entry.count++;
  if (entry.count > RATE_LIMIT) {
    return res.status(429).json({ error: "Too many requests" });
  }
  next();
}

// Periodic cleanup of stale rate entries
setInterval(() => {
  const cutoff = Date.now() - RATE_WINDOW * 2;
  for (const [ip, entry] of rateMap) {
    if (entry.start < cutoff) rateMap.delete(ip);
  }
}, RATE_WINDOW * 5);

app.use(rateLimit);

/* ─── Auth Rate Limiter (brute-force protection) ─── */
const authRateMap = new Map();
const AUTH_WINDOW = 15 * 60_000; // 15 minutes
const AUTH_LIMIT = 10;

function authRateLimit(req, res, next) {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  let entry = authRateMap.get(ip);
  if (!entry || now - entry.start > AUTH_WINDOW) {
    entry = { start: now, count: 0 };
    authRateMap.set(ip, entry);
  }
  entry.count++;
  if (entry.count > AUTH_LIMIT) {
    const retryAfter = Math.ceil((AUTH_WINDOW - (now - entry.start)) / 1000);
    res.setHeader("Retry-After", retryAfter);
    return res.status(429).json({ error: "Too many attempts. Try again later." });
  }
  next();
}

setInterval(() => {
  const cutoff = Date.now() - AUTH_WINDOW * 2;
  for (const [ip, entry] of authRateMap) {
    if (entry.start < cutoff) authRateMap.delete(ip);
  }
}, AUTH_WINDOW);

/* ─── Auth ─── */
const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  console.warn("[AUTH] API_KEY not set — all storage endpoints will return 401");
}

function requireAuth(req, res, next) {
  const key = req.headers["x-api-key"];
  if (!API_KEY || !key) return res.status(401).json({ error: "Unauthorized" });
  try {
    const a = Buffer.from(key);
    const b = Buffer.from(API_KEY);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

/* ─── Database Setup ─── */
const dataDir = process.env.DB_DIR || path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, "storage.db");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("synchronous = NORMAL");
db.pragma("cache_size = -2000"); // 2MB cache
db.exec(`
  CREATE TABLE IF NOT EXISTS kv_store (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at INTEGER DEFAULT (unixepoch())
  )
`);

/* ─── Prepared Statements (reused, much faster) ─── */
const stmtGet = db.prepare("SELECT value FROM kv_store WHERE key = ?");
const stmtUpsert = db.prepare(`
  INSERT INTO kv_store (key, value, updated_at)
  VALUES (?, ?, unixepoch())
  ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = unixepoch()
`);
const stmtDelete = db.prepare("DELETE FROM kv_store WHERE key = ?");
const stmtList = db.prepare("SELECT key FROM kv_store WHERE key LIKE ?");

/* ─── Middleware ─── */
app.use(express.json({ limit: "2mb" }));

// CORS: only allow same-origin in production, open in dev
if (process.env.NODE_ENV !== "production") {
  app.use((_req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-API-Key");
    if (_req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });
}

/* ─── Serve frontend build in production ─── */
const publicDir = path.join(__dirname, "public");
if (process.env.NODE_ENV === "production" && fs.existsSync(publicDir)) {
  app.use(express.static(publicDir, { maxAge: "7d" }));
}

/* ─── Input Validation ─── */
const KEY_RE = /^[a-zA-Z0-9_:.\-]{1,200}$/;
function validateKey(key) {
  return typeof key === "string" && KEY_RE.test(key);
}

/* ─── Storage API ─── */

// Auth verify
app.get("/api/auth/verify", authRateLimit, requireAuth, (_req, res) => res.json({ ok: true }));

// GET single key
app.get("/api/storage/:key", requireAuth, (req, res) => {
  const { key } = req.params;
  if (!validateKey(key)) return res.status(400).json({ error: "Invalid key" });
  const row = stmtGet.get(key);
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json({ key, value: row.value });
});

// POST (upsert) single key
app.post("/api/storage/:key", requireAuth, (req, res) => {
  const { key } = req.params;
  if (!validateKey(key)) return res.status(400).json({ error: "Invalid key" });
  const { value } = req.body;
  if (value === undefined || value === null)
    return res.status(400).json({ error: "Missing value" });
  if (typeof value !== "string")
    return res.status(400).json({ error: "Value must be a string" });
  if (Buffer.byteLength(value, "utf8") > 2_000_000)
    return res.status(413).json({ error: "Value too large" });
  stmtUpsert.run(key, value);
  res.json({ key, value });
});

// DELETE single key
app.delete("/api/storage/:key", requireAuth, (req, res) => {
  const { key } = req.params;
  if (!validateKey(key)) return res.status(400).json({ error: "Invalid key" });
  stmtDelete.run(key);
  res.json({ deleted: true, key });
});

// GET list keys by prefix
app.get("/api/storage", requireAuth, (req, res) => {
  const prefix = String(req.query.prefix || "");
  if (prefix && !validateKey(prefix))
    return res.status(400).json({ error: "Invalid prefix" });
  const rows = stmtList.all(prefix + "%");
  res.json({ keys: rows.map((r) => r.key) });
});

// POST batch — get/set multiple keys in one round-trip
const batchGet = db.transaction((keys) => {
  const result = {};
  for (const k of keys) {
    const row = stmtGet.get(k);
    result[k] = row ? row.value : null;
  }
  return result;
});

const batchSet = db.transaction((entries) => {
  for (const [k, v] of Object.entries(entries)) {
    stmtUpsert.run(k, v);
  }
});

app.post("/api/batch-get", requireAuth, (req, res) => {
  const { keys } = req.body;
  if (!Array.isArray(keys) || keys.length > 20)
    return res.status(400).json({ error: "keys must be array (max 20)" });
  if (!keys.every(validateKey))
    return res.status(400).json({ error: "Invalid key in array" });
  const result = batchGet(keys);
  res.json(result);
});

app.post("/api/batch-set", requireAuth, (req, res) => {
  const { entries } = req.body;
  if (typeof entries !== "object" || entries === null)
    return res.status(400).json({ error: "entries must be an object" });
  const keys = Object.keys(entries);
  if (keys.length > 20)
    return res.status(400).json({ error: "Max 20 keys per batch" });
  if (!keys.every(validateKey))
    return res.status(400).json({ error: "Invalid key" });
  for (const v of Object.values(entries)) {
    if (typeof v !== "string")
      return res.status(400).json({ error: "All values must be strings" });
    if (Buffer.byteLength(v, "utf8") > 2_000_000)
      return res.status(413).json({ error: "Value too large" });
  }
  batchSet(entries);
  res.json({ ok: true, keys });
});

// Health check
app.get("/api/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));

// SPA fallback
if (process.env.NODE_ENV === "production" && fs.existsSync(publicDir)) {
  app.get("*", (_req, res) =>
    res.sendFile(path.join(publicDir, "index.html"))
  );
}

/* ─── Graceful Shutdown ─── */
function shutdown() {
  console.log("Shutting down...");
  try { db.close(); } catch {}
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

const PORT = process.env.PORT || 3001;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`PLN Monitor API on port ${PORT} [${process.env.NODE_ENV || "development"}]`);
});
