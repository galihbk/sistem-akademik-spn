// src/routes/siswa.routes.js
const router = require("express").Router();
const ctrl = require("../controllers/siswa.controller");
const multer = require("multer");

// --- debug ringan: lihat apa saja yang diekspor controller
if (process.env.NODE_ENV !== "production") {
  try {
    console.log("[routes:siswa] exported handlers:", Object.keys(ctrl || {}));
  } catch {}
}

// Helper: pastikan handler adalah function, kalau tidak, pakai fallback agar server tidak crash
function ensure(fnName) {
  const fn = ctrl?.[fnName];
  if (typeof fn === "function") return fn;
  console.error(
    `[routes:siswa] Missing handler "${fnName}" (got ${typeof fn})`
  );
  return (req, res) =>
    res
      .status(501)
      .json({ message: `Handler '${fnName}' belum tersedia di controller` });
}

// pakai memory storage supaya bisa tulis manual ke /uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// ================== LIST & DETAIL ==================
router.get("/", ensure("list"));
router.get("/nik/:nik", ensure("detailByNik"));
router.get("/nosis/:nosis", ensure("detailByNosis"));

// ================== RELASI BY NIK ==================
router.get("/nik/:nik/mental", ensure("listMental"));
router.get("/nik/:nik/bk", ensure("listBK"));
router.get("/nik/:nik/pelanggaran", ensure("listPelanggaran"));
router.get("/nik/:nik/mapel", ensure("listMapel"));
router.get("/nik/:nik/prestasi", ensure("listPrestasi"));

// ================== JASMANI (FOCUS) ==================
// list jasmani via view v_jasmani_itemized (fallback ke jasmani_spn latest)
router.get("/nik/:nik/jasmani", ensure("listJasmani"));

// overview & ranking jasmani (angkatan/batalion/kompi/pleton)
router.get("/nik/:nik/jasmani_overview", ensure("jasmaniOverviewByNik"));

// ================== LAIN2 (TETAP) ==================
router.get("/nik/:nik/riwayat_kesehatan", ensure("listRiwayatKesehatan"));
router.get("/nik/:nik/jasmani_polda", ensure("listJasmaniPolda"));

router.get("/nik/:nik/mental/rank", ensure("rankMentalByNik"));
router.get("/ranking/mental/pleton", ensure("rankMentalByPleton"));

// ================== WRITE ==================
router.post("/upsert", ensure("upsertByNik"));
router.patch("/nik/:nik", ensure("updatePartialByNik"));
router.post("/nik/:nik/foto", upload.single("foto"), ensure("uploadFotoByNik"));

module.exports = router;
