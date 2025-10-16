-- =========================================
-- init.sql  (clean rebuild, idempotent - FIXED)
-- =========================================
SET client_min_messages = WARNING;
CREATE SCHEMA IF NOT EXISTS public;
SET search_path TO public;

-- ========== DROP PHASE ==========
DROP VIEW IF EXISTS v_jasmani_itemized CASCADE;

DROP TABLE IF EXISTS
  jasmani_polda,
  jasmani_spn,
  riwayat_kesehatan,
  prestasi,
  pelanggaran,
  bk,
  jasmani,              -- legacy, kita buang
  mapel,
  mental,
  audit_log,
  siswa
CASCADE;

DROP FUNCTION IF EXISTS set_updated_at() CASCADE;

-- ========== CREATE PHASE ==========
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ================================
-- MASTER DATA: siswa
-- ================================
CREATE TABLE siswa (
  id                SERIAL PRIMARY KEY,
  nosis             VARCHAR(50),
  nama              TEXT NOT NULL,
  nik               VARCHAR(32),
  foto              TEXT,
  file_ktp              TEXT,
  alamat            TEXT,
  tempat_lahir      TEXT,
  tanggal_lahir     TEXT,
  umur              TEXT,
  agama             TEXT,
  jenis_kelamin     TEXT,
  email             TEXT,
  no_hp             TEXT,
  dikum_akhir       TEXT,
  jurusan           TEXT,
  jenis_pendidikan  TEXT, -- kolom baru
  tb                TEXT,
  bb                TEXT,
  gol_darah         TEXT,
  no_bpjs           TEXT,
  sim_yang_dimiliki TEXT,
  no_hp_keluarga    TEXT,
  nama_ayah_kandung TEXT,
  nama_ibu_kandung  TEXT,
  pekerjaan_ayah_kandung TEXT,
  pekerjaan_ibu_kandung  TEXT,
  asal_polda        TEXT,
  asal_polres       TEXT,
  kelompok_angkatan TEXT,
  diktuk_awal       TEXT,
  tahun_diktuk      TEXT,
  personel          TEXT,
  ukuran_pakaian    TEXT,
  ukuran_celana     TEXT,
  ukuran_sepatu     TEXT,
  ukuran_tutup_kepala TEXT,
  jenis_rekrutmen   TEXT,
  batalion          TEXT,
  ton               TEXT,
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_siswa_nama_lower ON siswa (LOWER(nama));
CREATE INDEX idx_siswa_nosis      ON siswa (nosis);
CREATE UNIQUE INDEX uq_siswa_nik_notnull ON siswa(nik) WHERE nik IS NOT NULL;

CREATE TRIGGER trg_siswa_updated
BEFORE UPDATE ON siswa
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ================================
-- AUDIT LOG
-- ================================
CREATE TABLE audit_log (
  id          SERIAL PRIMARY KEY,
  admin       VARCHAR(64),
  aksi        VARCHAR(64),
  target      VARCHAR(128),
  hasil       VARCHAR(16),
  detail      TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_audit_log_created_at ON audit_log (created_at DESC);

-- ================================
-- MENTAL
-- ================================
CREATE TABLE mental (
  id         BIGSERIAL PRIMARY KEY,
  siswa_id   INT NOT NULL REFERENCES siswa(id) ON DELETE CASCADE,
  minggu_ke  INT,
  nilai      TEXT,
  catatan    TEXT,
  meta       JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_mental_siswa_minggu ON mental (siswa_id, minggu_ke);
CREATE TRIGGER trg_mental_updated BEFORE UPDATE ON mental FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ================================
-- MAPEL
-- ================================
CREATE TABLE mapel (
  id         BIGSERIAL PRIMARY KEY,
  siswa_id   INT NOT NULL REFERENCES siswa(id) ON DELETE CASCADE,
  mapel      TEXT NOT NULL,
  nilai      TEXT,
  semester   TEXT,
  pertemuan  INT,
  catatan    TEXT,
  meta       JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (siswa_id, mapel, pertemuan)
);
CREATE INDEX idx_mapel_siswa ON mapel (siswa_id);
CREATE TRIGGER trg_mapel_updated BEFORE UPDATE ON mapel FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ================================
-- BK / PELANGGARAN / PRESTASI / KESEHATAN
-- ================================
CREATE TABLE bk (
  id BIGSERIAL PRIMARY KEY,
  siswa_id INT NOT NULL REFERENCES siswa(id) ON DELETE CASCADE,
  judul TEXT NOT NULL,
  tanggal DATE,
  file_path TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_bk_siswa ON bk (siswa_id);

CREATE TABLE pelanggaran (
  id BIGSERIAL PRIMARY KEY,
  siswa_id INT NOT NULL REFERENCES siswa(id) ON DELETE CASCADE,
  judul TEXT NOT NULL,
  tanggal DATE,
  file_path TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_pelanggaran_siswa ON pelanggaran (siswa_id);

CREATE TABLE prestasi (
  id BIGSERIAL PRIMARY KEY,
  siswa_id INT NOT NULL REFERENCES siswa(id) ON DELETE CASCADE,
  judul TEXT,
  tingkat TEXT,
  deskripsi TEXT,
  file_path TEXT,
  tanggal DATE,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_prestasi_siswa ON prestasi (siswa_id);

CREATE TABLE riwayat_kesehatan (
  id BIGSERIAL PRIMARY KEY,
  siswa_id INT NOT NULL REFERENCES siswa(id) ON DELETE CASCADE,
  judul TEXT NOT NULL,
  deskripsi TEXT,
  file_path TEXT,
  tanggal DATE,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_riwayatkes_siswa ON riwayat_kesehatan (siswa_id);

-- ================================
-- JASMANI SPN
-- ================================
CREATE TABLE jasmani_spn (
  id BIGSERIAL PRIMARY KEY,
  siswa_id INT REFERENCES siswa(id) ON DELETE SET NULL,
  nosis VARCHAR(50),
  lari_12_menit_ts NUMERIC(10,2),
  lari_12_menit_rs NUMERIC(10,2),
  sit_up_ts NUMERIC(10,2),
  sit_up_rs NUMERIC(10,2),
  shuttle_run_ts NUMERIC(10,2),
  shuttle_run_rs NUMERIC(10,2),
  push_up_ts NUMERIC(10,2),
  push_up_rs NUMERIC(10,2),
  pull_up_ts NUMERIC(10,2),
  pull_up_rs NUMERIC(10,2),
  tb_cm NUMERIC(10,2),
  bb_kg NUMERIC(10,2),
  nilai_akhir NUMERIC(10,2),
  keterangan TEXT,
  tahap INT,
  sumber_file TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (siswa_id, tahap)
);
CREATE INDEX idx_jasmanispn_siswa ON jasmani_spn(siswa_id);
CREATE INDEX idx_jasmanispn_tahap ON jasmani_spn(tahap);
CREATE INDEX idx_jasmanispn_nosis ON jasmani_spn(nosis);
CREATE TRIGGER trg_jasmanispn_updated BEFORE UPDATE ON jasmani_spn FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- >>> FIX: gunakan UNION ALL agar kolom 'nilai' ada dengan jelas <<<
CREATE OR REPLACE VIEW v_jasmani_itemized AS
WITH ident AS (
  SELECT
    j.id AS jasmani_spn_id,
    j.siswa_id,
    COALESCE(s.nosis, j.nosis) AS nosis,
    s.nama,
    UPPER(NULLIF(regexp_replace(s.ton, '[^A-Za-z].*', ''), '')) AS kompi,
    CASE
      WHEN regexp_replace(COALESCE(s.ton,''), '\\D+', '', 'g') <> '' THEN
        (regexp_replace(s.ton, '\\D+', '', 'g'))::int
      ELSE NULL
    END AS pleton,
    j.tahap, j.keterangan, j.sumber_file, j.created_at, j.updated_at,
    j.lari_12_menit_ts, j.lari_12_menit_rs,
    j.sit_up_ts, j.sit_up_rs,
    j.shuttle_run_ts, j.shuttle_run_rs,
    j.push_up_ts, j.push_up_rs,
    j.pull_up_ts, j.pull_up_rs
  FROM jasmani_spn j
  LEFT JOIN siswa s ON s.id = j.siswa_id
)
SELECT jasmani_spn_id, siswa_id, nosis, nama, kompi, pleton, tahap,
       'Lari 12 Menit (TS)'::text AS item, lari_12_menit_ts::text AS nilai,
       'TS'::text AS kategori, keterangan, sumber_file, created_at, updated_at
FROM ident
UNION ALL
SELECT jasmani_spn_id, siswa_id, nosis, nama, kompi, pleton, tahap,
       'Lari 12 Menit (RS)', lari_12_menit_rs::text, 'RS', keterangan, sumber_file, created_at, updated_at
FROM ident
UNION ALL
SELECT jasmani_spn_id, siswa_id, nosis, nama, kompi, pleton, tahap,
       'Sit Up (TS)', sit_up_ts::text, 'TS', keterangan, sumber_file, created_at, updated_at
FROM ident
UNION ALL
SELECT jasmani_spn_id, siswa_id, nosis, nama, kompi, pleton, tahap,
       'Sit Up (RS)', sit_up_rs::text, 'RS', keterangan, sumber_file, created_at, updated_at
FROM ident
UNION ALL
SELECT jasmani_spn_id, siswa_id, nosis, nama, kompi, pleton, tahap,
       'Shuttle Run (TS)', shuttle_run_ts::text, 'TS', keterangan, sumber_file, created_at, updated_at
FROM ident
UNION ALL
SELECT jasmani_spn_id, siswa_id, nosis, nama, kompi, pleton, tahap,
       'Shuttle Run (RS)', shuttle_run_rs::text, 'RS', keterangan, sumber_file, created_at, updated_at
FROM ident
UNION ALL
SELECT jasmani_spn_id, siswa_id, nosis, nama, kompi, pleton, tahap,
       'Push Up (TS)', push_up_ts::text, 'TS', keterangan, sumber_file, created_at, updated_at
FROM ident
UNION ALL
SELECT jasmani_spn_id, siswa_id, nosis, nama, kompi, pleton, tahap,
       'Push Up (RS)', push_up_rs::text, 'RS', keterangan, sumber_file, created_at, updated_at
FROM ident
UNION ALL
SELECT jasmani_spn_id, siswa_id, nosis, nama, kompi, pleton, tahap,
       'Pull Up (TS)', pull_up_ts::text, 'TS', keterangan, sumber_file, created_at, updated_at
FROM ident
UNION ALL
SELECT jasmani_spn_id, siswa_id, nosis, nama, kompi, pleton, tahap,
       'Pull Up (RS)', pull_up_rs::text, 'RS', keterangan, sumber_file, created_at, updated_at
FROM ident;

-- ================================
-- JASMANI POLDA
-- ================================
CREATE TABLE jasmani_polda (
  id BIGSERIAL PRIMARY KEY,
  siswa_id INT NULL REFERENCES siswa(id) ON DELETE SET NULL,

  -- identitas
  no_panda TEXT,
  nama TEXT,
  jenis_kelamin TEXT,     -- "JK"
  jalur_seleksi TEXT,
  angkatan TEXT,

  -- antropometri (angka & teks)
  tb_cm NUMERIC(10,2),
  tb_inchi NUMERIC(10,2),
  bb_kg NUMERIC(10,2),
  bb_akbb NUMERIC(10,2),
  ratio_index TEXT,
  somato_type TEXT,
  klasifikasi_tipe_tubuh TEXT,
  nilai_tipe_tubuh NUMERIC(10,2),
  nilai_kelainan NUMERIC(10,2),
  nilai_terkecil NUMERIC(10,2),
  nilai_anthro NUMERIC(10,2),

  -- atribut lain
  pencapaian_nbl TEXT,

  -- renang per-detail (opsional dari sheet)
  renang_jarak NUMERIC(10,2),
  renang_waktu NUMERIC(10,2),
  renang_nilai NUMERIC(10,2),

  -- Kesamaptaan A (label, teks)
  kesamaptaan_hga TEXT,
  kesamaptaan_nga TEXT,

  -- Kesamaptaan B (angka per item)
  pull_up_hgb1 NUMERIC(10,2),
  pull_up_ngb1 NUMERIC(10,2),
  sit_up_hgb2 NUMERIC(10,2),
  sit_up_ngb2 NUMERIC(10,2),
  push_up_hgb3 NUMERIC(10,2),
  push_up_ngb3 NUMERIC(10,2),
  shuttle_run_hgb4 NUMERIC(10,2),
  shuttle_run_ngb4 NUMERIC(10,2),

  -- rekap
  nilai_b NUMERIC(10,2),
  na_a_b NUMERIC(10,2),            -- "NA A+B"
  antro TEXT,                      -- "ANTRO" mentah dari sheet
  renang NUMERIC(10,2),            -- "RENANG" total dari sheet
  kesamaptaan_a_b NUMERIC(10,2),   -- "KESAMAPTAAN A+B" (sheet)
  antro_pembobotan TEXT,           -- "ANTHRO PEMBOBOTAN" → teks kategori
  renang_x20 NUMERIC(10,2),        -- "RENANG X20"
  samapta_x80 NUMERIC(10,2),       -- "SAMAPTA X80"
  nilai_akhir NUMERIC(10,2),
  ktgr TEXT,
  ket TEXT,
  catatan TEXT,

  -- meta
  sumber_file TEXT,
  sheet_name TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE (no_panda, angkatan)
);

-- index
CREATE INDEX idx_jp_nopanda     ON jasmani_polda (no_panda);
CREATE INDEX idx_jp_angkatan    ON jasmani_polda (angkatan);
CREATE INDEX idx_jp_nama_lower  ON jasmani_polda (LOWER(nama));

-- trigger updated_at
CREATE TRIGGER trg_jasmani_polda_updated
BEFORE UPDATE ON jasmani_polda
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
-- ========== END ==========
