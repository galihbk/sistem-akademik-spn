const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const pool = require("./db/pool");
const importRoutes = require("./routes/import.routes");
const authRoutes = require("./routes/auth.routes");
const statsRoutes = require("./routes/stats.routes");
const siswaRoutes = require("./routes/siswa.routes");
const refRoutes = require("./routes/ref.routes");

const app = express();
app.use(helmet());
app.use(express.json());
app.use(cors({ origin: true, credentials: true }));
app.use(rateLimit({ windowMs: 60 * 1000, max: 60 }));

app.use("/auth", authRoutes);
app.use("/import", importRoutes);
app.use("/stats", statsRoutes);
app.use("/siswa", siswaRoutes);
app.use("/ref", refRoutes);

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
