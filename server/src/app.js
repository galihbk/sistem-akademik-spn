// app.js
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
const pool = require("./db/pool");

// Routes
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
const uploadRoutes = require("./routes/upload.routes");

const app = express();
const PROJECT_ROOT = process.env.PROJECT_ROOT
  ? path.resolve(process.env.PROJECT_ROOT)
  : path.resolve(process.cwd());

const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(PROJECT_ROOT, "uploads");

// Folder statis
app.use("/uploads", express.static(UPLOAD_DIR));

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
  })
);

app.use((req, res, next) => {
  res.removeHeader("Cross-Origin-Embedder-Policy");
  next();
});

// Body parser
app.use(express.json());

// ===== CORS configuration =====
const corsOpts = {
  origin: [
    "http://localhost:5173", // untuk dev lokal frontend
    "http://192.168.1.3:5173", // untuk akses dari LAN
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
  allowedHeaders: ["Authorization", "Content-Type", "Accept"],
  exposedHeaders: ["Content-Disposition"],
};
app.use(cors(corsOpts));
app.options("*", cors(corsOpts));

// Rate limit dasar
app.use(rateLimit({ windowMs: 60 * 1000, max: 120 }));

// Routes utama
app.use("/auth", authRoutes);
app.use("/import", importRoutes);
app.use("/stats", statsRoutes);
app.use("/siswa", siswaRoutes);
app.use("/ref", refRoutes);
app.use("/download", downloadRoutes);
app.use("/upload", require("./routes/upload.routes"));
app.use("/prestasi", prestasiRoutes);
app.use("/riwayat_kesehatan", riwayatRoutes);
app.use("/export", exportRoutes);
app.use("/mental", mentalRoutes);
// app.use("/bk", makeDocsRoutes("bk"));
// app.use("/pelanggaran", makeDocsRoutes("pelanggaran"));
app.use("/", uploadRoutes);
app.use("/mapel", mapelRoutes);
app.use("/jasmani", jasmaniRoutes);
app.use("/jasmani-polda", jasmaniPoldaRoutes);
app.use("/api", require("./routes/backup.routes"));

// ===== Health checks =====
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
