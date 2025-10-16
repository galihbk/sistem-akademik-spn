// app.js
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
const pool = require("./db/pool");

const importRoutes = require("./routes/import.routes");
const authRoutes = require("./routes/auth.routes");
const statsRoutes = require("./routes/stats.routes");
const siswaRoutes = require("./routes/siswa.routes");
const refRoutes = require("./routes/ref.routes");
const prestasiRoutes = require("./routes/prestasi.routes");
const downloadRoutes = require("./routes/download.routes");
const riwayatRoutes = require("./routes/riwayat.routes");
const exportRoutes = require("./routes/export.routes");
const mentalRoutes = require("./routes/mental.routes");
const makeDocsRoutes = require("./routes/docs.routes");
const mapelRoutes = require("./routes/mapel.routes");
const jasmaniRoutes = require("./routes/jasmani.routes");
const jasmaniPoldaRoutes = require("./routes/jasmani_polda.routes");

const app = express();
const PROJECT_ROOT = process.env.PROJECT_ROOT
  ? path.resolve(process.env.PROJECT_ROOT)
  : path.resolve(process.cwd());

const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(PROJECT_ROOT, "uploads");

// buka static /uploads menunjuk ke folder yang sama dengan controller
app.use("/uploads", express.static(UPLOAD_DIR));
/**
 * HELMET GLOBAL:
 * - CORP: cross-origin → izinkan <img> dari origin lain (5173 ↔ 4000)
 * - COEP: off → hindari ERR_BLOCKED_BY_RESPONSE.NotSameOrigin
 */
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
    // (opsional) kalau butuh popup login SSO: crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  })
);

// JAGA-JAGA: pastikan tidak ada header COEP/COOP yang tersisa
app.use((req, res, next) => {
  res.removeHeader("Cross-Origin-Embedder-Policy");
  // res.removeHeader("Cross-Origin-Opener-Policy"); // biasanya tidak perlu dicabut
  next();
});

app.use(express.json());

const corsOpts = {
  origin: "http://localhost:5173",
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
  allowedHeaders: ["Authorization", "Content-Type", "Accept"],
  exposedHeaders: ["Content-Disposition"],
};
app.use(cors(corsOpts));
app.options("*", cors(corsOpts));

// app.use(rateLimit({ windowMs: 60 * 1000, max: 60 }));

/** (opsional) fallback static, berguna buat debug */
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// ROUTES
app.use("/auth", authRoutes);
app.use("/import", importRoutes);
app.use("/stats", statsRoutes);
app.use("/siswa", siswaRoutes);
app.use("/ref", refRoutes);

// /download mendukung ?inline=1
app.use("/download", downloadRoutes);

app.use("/upload", require("./routes/upload.routes"));
app.use("/prestasi", prestasiRoutes);
app.use("/riwayat_kesehatan", riwayatRoutes);
app.use("/export", exportRoutes);
app.use("/mental", mentalRoutes);
app.use("/bk", makeDocsRoutes("bk"));
app.use("/pelanggaran", makeDocsRoutes("pelanggaran"));
app.use("/mapel", mapelRoutes);
app.use("/jasmani", jasmaniRoutes);
app.use("/jasmani-polda", jasmaniPoldaRoutes);
app.use("/api", require("./routes/backup.routes"));

// Health checks
app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/health/db", async (_req, res) => {
  try {
    const r = await pool.query("SELECT now() AS now");
    res.json({ ok: true, now: r.rows[0].now });
  } catch (e) {
    console.error("[health/db]", e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = app;
