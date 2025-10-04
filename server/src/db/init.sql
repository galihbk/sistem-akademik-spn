-- ================================
-- init.sql  (idempotent migration)
-- ================================
-- Catatan:
-- - Aman di-run berulang.
-- - Menambah kolom/constraint hanya jika belum ada.
-- - Relasi selalu pakai siswa.id (FK).
-- - 'nosis' disimpan (non-unique) untuk referensi/import.
-- - Siapkan partial UNIQUE index di nik agar ON CONFLICT (nik) valid.

-- Pastikan schema public ada & aktif
CREATE SCHEMA IF NOT EXISTS public;
SET search_path TO public;

-- =========================================
-- Helper: function updated_at
-- =========================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================
-- MASTER DATA: siswa
-- =========================================
CREATE TABLE IF NOT EXISTS siswa (
  id SERIAL PRIMARY KEY,

  -- kunci dari Excel (bukan unique sesuai revisi)
  nosis                 VARCHAR(50),

  -- identitas dasar
  nama                  TEXT NOT NULL,
  nik                   VARCHAR(32),
  file_ktp              TEXT,
  alamat                TEXT,
  tempat_lahir          TEXT,
  tanggal_lahir         TEXT,
  umur                  TEXT,
  agama                 TEXT,
  jenis_kelamin         TEXT,
  email                 TEXT,
  no_hp                 TEXT,

  -- pendidikan & lain-lain
  dikum_akhir           TEXT,
  jurusan               TEXT,

  -- fisik
  tb                    TEXT,
  bb                    TEXT,
  gol_darah             TEXT,

  -- administrasi
  no_bpjs               TEXT,
  sim_yang_dimiliki     TEXT,
  no_hp_keluarga        TEXT,

  -- keluarga
  nama_ayah_kandung      TEXT,
  nama_ibu_kandung       TEXT,
  pekerjaan_ayah_kandung TEXT,
  pekerjaan_ibu_kandung  TEXT,

  -- asal & angkatan
  asal_polda            TEXT,
  asal_polres           TEXT,
  kelompok_angkatan     TEXT,   -- dipakai untuk filter "Angkatan"
  diktuk_awal           TEXT,
  tahun_diktuk          TEXT,
  personel              TEXT,

  -- ukuran
  ukuran_pakaian        TEXT,
  ukuran_celana         TEXT,
  ukuran_sepatu         TEXT,
  ukuran_tutup_kepala   TEXT,

  -- rekrutmen
  jenis_rekrutmen       TEXT,

  -- REVISI
  foto                  TEXT,
  batalion              TEXT,
  ton                   TEXT,

  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP DEFAULT NOW()
);

-- Index bantu
CREATE INDEX IF NOT EXISTS idx_siswa_nama_lower ON siswa (LOWER(nama));
CREATE INDEX IF NOT EXISTS idx_siswa_nosis      ON siswa (nosis);

-- Pastikan tidak ada UNIQUE di nosis (jaga-jaga kalau sebelumnya dibuat)
DO $$
DECLARE
  c_name text;
BEGIN
  SELECT tc.constraint_name
  INTO c_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
  WHERE tc.table_name = 'siswa'
    AND tc.constraint_type = 'UNIQUE'
    AND ccu.column_name = 'nosis'
  LIMIT 1;

  IF c_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE siswa DROP CONSTRAINT %I;', c_name);
  END IF;
END$$;

-- Partial UNIQUE index di nik (ON CONFLICT (nik))
-- (rapikan nik kosong menjadi NULL supaya index tidak konflik)
UPDATE siswa SET nik = NULLIF(BTRIM(nik), '') WHERE nik IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_siswa_nik_notnull
  ON siswa(nik) WHERE nik IS NOT NULL;

-- Trigger updated_at untuk siswa
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_siswa_updated') THEN
    CREATE TRIGGER trg_siswa_updated
    BEFORE UPDATE ON siswa
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END$$;

-- =========================================
-- AUDIT LOG
-- =========================================
CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  admin VARCHAR(64),
  aksi VARCHAR(64),
  target VARCHAR(128),
  hasil VARCHAR(16),
  detail TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log (created_at DESC);

-- =========================================
-- SOSIOMETRI (pakai siswa_id)
-- =========================================
CREATE TABLE IF NOT EXISTS sosiometri (
  id BIGSERIAL PRIMARY KEY,
  siswa_id INT NOT NULL REFERENCES siswa(id) ON DELETE CASCADE,
  nilai TEXT,
  catatan TEXT,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sosiometri_siswa ON sosiometri (siswa_id);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sosiometri_updated') THEN
    CREATE TRIGGER trg_sosiometri_updated
    BEFORE UPDATE ON sosiometri
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END$$;

-- =========================================
-- MENTAL (REVISI: minggu_ke; tanpa nama)
-- =========================================
CREATE TABLE IF NOT EXISTS mental (
  id BIGSERIAL PRIMARY KEY,
  siswa_id INT NOT NULL REFERENCES siswa(id) ON DELETE CASCADE,
  minggu_ke INT,
  nilai TEXT,
  catatan TEXT,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mental_siswa_minggu ON mental (siswa_id, minggu_ke);
CREATE INDEX IF NOT EXISTS idx_siswa_kelompok_angkatan ON siswa (kelompok_angkatan);
CREATE INDEX IF NOT EXISTS idx_siswa_nama_nosis_lower ON siswa ((lower(nama)), (lower(nosis)));
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_mental_updated') THEN
    CREATE TRIGGER trg_mental_updated
    BEFORE UPDATE ON mental
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END$$;

-- =========================================
-- MAPEL (unique per siswa_id, mapel, semester)
-- =========================================
CREATE TABLE IF NOT EXISTS mapel (
  id BIGSERIAL PRIMARY KEY,
  siswa_id INT NOT NULL REFERENCES siswa(id) ON DELETE CASCADE,
  mapel TEXT NOT NULL,
  nilai TEXT,
  semester TEXT,
  catatan TEXT,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (siswa_id, mapel, semester)
);
CREATE INDEX IF NOT EXISTS idx_mapel_siswa ON mapel (siswa_id);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_mapel_updated') THEN
    CREATE TRIGGER trg_mapel_updated
    BEFORE UPDATE ON mapel
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END$$;

-- =========================================
-- JASMANI (model lama per-item; dipertahankan)
-- =========================================
CREATE TABLE IF NOT EXISTS jasmani (
  id BIGSERIAL PRIMARY KEY,
  siswa_id INT NOT NULL REFERENCES siswa(id) ON DELETE CASCADE,
  item TEXT NOT NULL,
  nilai TEXT,
  kategori TEXT,
  catatan TEXT,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (siswa_id, item)
);
CREATE INDEX IF NOT EXISTS idx_jasmani_siswa ON jasmani (siswa_id);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_jasmani_updated') THEN
    CREATE TRIGGER trg_jasmani_updated
    BEFORE UPDATE ON jasmani
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END$$;

-- =========================================
-- BK (upload PDF)
-- =========================================
CREATE TABLE IF NOT EXISTS bk (
  id BIGSERIAL PRIMARY KEY,
  siswa_id INT NOT NULL REFERENCES siswa(id) ON DELETE CASCADE,
  judul TEXT NOT NULL,
  tanggal DATE,
  file_path TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bk_siswa ON bk (siswa_id);

-- =========================================
-- PELANGGARAN (upload PDF)
-- =========================================
CREATE TABLE IF NOT EXISTS pelanggaran (
  id BIGSERIAL PRIMARY KEY,
  siswa_id INT NOT NULL REFERENCES siswa(id) ON DELETE CASCADE,
  judul TEXT NOT NULL,
  tanggal DATE,
  file_path TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pelanggaran_siswa ON pelanggaran (siswa_id);

-- =========================================
-- PRESTASI (input manual)
-- =========================================
CREATE TABLE IF NOT EXISTS prestasi (
  id BIGSERIAL PRIMARY KEY,
  siswa_id INT NOT NULL REFERENCES siswa(id) ON DELETE CASCADE,
  judul TEXT,
  tingkat TEXT,
  deskripsi TEXT,
  file_path TEXT,
  tanggal DATE,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_prestasi_siswa ON prestasi (siswa_id);

-- =========================================
-- RIWAYAT KESEHATAN (input manual)
-- =========================================
CREATE TABLE IF NOT EXISTS riwayat_kesehatan (
  id BIGSERIAL PRIMARY KEY,
  siswa_id INT NOT NULL REFERENCES siswa(id) ON DELETE CASCADE,
  judul TEXT NOT NULL,
  deskripsi TEXT,
  file_path TEXT,
  tanggal DATE,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_riwayatkes_siswa ON riwayat_kesehatan (siswa_id);

-- =========================================
-- Sinkronisasi Kolom (defensive) - tambah jika belum ada
-- (Berguna kalau sebelumnya sudah terlanjur create versi lama)
-- =========================================

-- siswa: pastikan kolom penting ada (idempotent)
ALTER TABLE siswa
  ADD COLUMN IF NOT EXISTS nosis VARCHAR(50),
  ADD COLUMN IF NOT EXISTS foto TEXT,
  ADD COLUMN IF NOT EXISTS batalion TEXT,
  ADD COLUMN IF NOT EXISTS ton TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- sosiometri
ALTER TABLE sosiometri
  ADD COLUMN IF NOT EXISTS siswa_id INT,
  ADD COLUMN IF NOT EXISTS nilai TEXT,
  ADD COLUMN IF NOT EXISTS catatan TEXT,
  ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='sosiometri' AND column_name='siswa_id')
  THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name='sosiometri'
        AND tc.constraint_type='FOREIGN KEY'
        AND kcu.column_name='siswa_id'
    ) THEN
      ALTER TABLE sosiometri
      ADD CONSTRAINT fk_sosiometri_siswa
      FOREIGN KEY (siswa_id) REFERENCES siswa(id) ON DELETE CASCADE;
    END IF;
  END IF;
END$$;

-- mental
ALTER TABLE mental
  ADD COLUMN IF NOT EXISTS siswa_id INT,
  ADD COLUMN IF NOT EXISTS minggu_ke INT,
  ADD COLUMN IF NOT EXISTS nilai TEXT,
  ADD COLUMN IF NOT EXISTS catatan TEXT,
  ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='mental' AND column_name='siswa_id')
  THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name='mental'
        AND tc.constraint_type='FOREIGN KEY'
        AND kcu.column_name='siswa_id'
    ) THEN
      ALTER TABLE mental
      ADD CONSTRAINT fk_mental_siswa
      FOREIGN KEY (siswa_id) REFERENCES siswa(id) ON DELETE CASCADE;
    END IF;
  END IF;
END$$;

-- mapel
ALTER TABLE mapel
  ADD COLUMN IF NOT EXISTS siswa_id INT,
  ADD COLUMN IF NOT EXISTS mapel TEXT,
  ADD COLUMN IF NOT EXISTS semester TEXT,
  ADD COLUMN IF NOT EXISTS nilai TEXT,
  ADD COLUMN IF NOT EXISTS catatan TEXT,
  ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

DO $$
BEGIN
  -- FK
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='mapel' AND column_name='siswa_id')
  THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name='mapel'
        AND tc.constraint_type='FOREIGN KEY'
        AND kcu.column_name='siswa_id'
    ) THEN
      ALTER TABLE mapel
      ADD CONSTRAINT fk_mapel_siswa
      FOREIGN KEY (siswa_id) REFERENCES siswa(id) ON DELETE CASCADE;
    END IF;
  END IF;

  -- UNIQUE (siswa_id, mapel, semester)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name='mapel' AND constraint_type='UNIQUE'
  ) THEN
    ALTER TABLE mapel
    ADD CONSTRAINT uq_mapel_siswa_mapel_sem UNIQUE (siswa_id, mapel, semester);
  END IF;
END$$;

-- jasmani (model lama)
ALTER TABLE jasmani
  ADD COLUMN IF NOT EXISTS siswa_id INT,
  ADD COLUMN IF NOT EXISTS item TEXT,
  ADD COLUMN IF NOT EXISTS nilai TEXT,
  ADD COLUMN IF NOT EXISTS kategori TEXT,
  ADD COLUMN IF NOT EXISTS catatan TEXT,
  ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

DO $$
BEGIN
  -- FK
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='jasmani' AND column_name='siswa_id')
  THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name='jasmani'
        AND tc.constraint_type='FOREIGN KEY'
        AND kcu.column_name='siswa_id'
    ) THEN
      ALTER TABLE jasmani
      ADD CONSTRAINT fk_jasmani_siswa
      FOREIGN KEY (siswa_id) REFERENCES siswa(id) ON DELETE CASCADE;
    END IF;
  END IF;

  -- UNIQUE (siswa_id, item)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name='jasmani' AND constraint_type='UNIQUE'
  ) THEN
    ALTER TABLE jasmani
    ADD CONSTRAINT uq_jasmani_siswa_item UNIQUE (siswa_id, item);
  END IF;
END$$;

-- bk
ALTER TABLE bk
  ADD COLUMN IF NOT EXISTS siswa_id INT,
  ADD COLUMN IF NOT EXISTS judul TEXT,
  ADD COLUMN IF NOT EXISTS tanggal DATE,
  ADD COLUMN IF NOT EXISTS file_path TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='bk' AND column_name='siswa_id')
  THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name='bk'
        AND tc.constraint_type='FOREIGN KEY'
        AND kcu.column_name='siswa_id'
    ) THEN
      ALTER TABLE bk
      ADD CONSTRAINT fk_bk_siswa
      FOREIGN KEY (siswa_id) REFERENCES siswa(id) ON DELETE CASCADE;
    END IF;
  END IF;
END$$;

-- pelanggaran
ALTER TABLE pelanggaran
  ADD COLUMN IF NOT EXISTS siswa_id INT,
  ADD COLUMN IF NOT EXISTS judul TEXT,
  ADD COLUMN IF NOT EXISTS tanggal DATE,
  ADD COLUMN IF NOT EXISTS file_path TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='pelanggaran' AND column_name='siswa_id')
  THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name='pelanggaran'
        AND tc.constraint_type='FOREIGN KEY'
        AND kcu.column_name='siswa_id'
    ) THEN
      ALTER TABLE pelanggaran
      ADD CONSTRAINT fk_pelanggaran_siswa
      FOREIGN KEY (siswa_id) REFERENCES siswa(id) ON DELETE CASCADE;
    END IF;
  END IF;
END$$;

-- prestasi
ALTER TABLE prestasi
  ADD COLUMN IF NOT EXISTS siswa_id INT,
  ADD COLUMN IF NOT EXISTS tingkat TEXT,
  ADD COLUMN IF NOT EXISTS deskripsi TEXT,
  ADD COLUMN IF NOT EXISTS tanggal DATE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='prestasi' AND column_name='siswa_id')
  THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name='prestasi'
        AND tc.constraint_type='FOREIGN KEY'
        AND kcu.column_name='siswa_id'
    ) THEN
      ALTER TABLE prestasi
      ADD CONSTRAINT fk_prestasi_siswa
      FOREIGN KEY (siswa_id) REFERENCES siswa(id) ON DELETE CASCADE;
    END IF;
  END IF;
END$$;

-- riwayat_kesehatan
ALTER TABLE riwayat_kesehatan
  ADD COLUMN IF NOT EXISTS siswa_id INT,
  ADD COLUMN IF NOT EXISTS judul TEXT,
  ADD COLUMN IF NOT EXISTS deskripsi TEXT,
  ADD COLUMN IF NOT EXISTS tanggal DATE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='riwayat_kesehatan' AND column_name='siswa_id')
  THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name='riwayat_kesehatan'
        AND tc.constraint_type='FOREIGN KEY'
        AND kcu.column_name='siswa_id'
    ) THEN
      ALTER TABLE riwayat_kesehatan
      ADD CONSTRAINT fk_riwayatkes_siswa
      FOREIGN KEY (siswa_id) REFERENCES siswa(id) ON DELETE CASCADE;
    END IF;
  END IF;
END$$;


-- ======================================================================
-- >>> BAGIAN BARU: TABEL LEBAR UNTUK IMPOR EXCEL JASMANI SPN
-- ======================================================================

CREATE TABLE IF NOT EXISTS jasmani_spn (
  id BIGSERIAL PRIMARY KEY,
  siswa_id INT REFERENCES siswa(id) ON DELETE SET NULL,

  -- identitas ringan dari Excel (opsional)
  nosis VARCHAR(50),
  nama  TEXT,
  pleton TEXT,
  kelas  TEXT,

  -- nilai jasmani (tambahkan kolom lain jika ada di Excel)
  lari_12m      NUMERIC(10,2),
  push_up       NUMERIC(10,2),
  sit_up        NUMERIC(10,2),
  shuttle_run   NUMERIC(10,2),
  pull_up       NUMERIC(10,2),

  nilai_akhir   NUMERIC(10,2),
  keterangan    TEXT,

  -- metadata impor
  tahap INT,                -- tahap/remidi ke-
  sumber_file TEXT,         -- nama file excel
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index bantu
CREATE INDEX IF NOT EXISTS idx_jasmanispn_siswa ON jasmani_spn(siswa_id);
CREATE INDEX IF NOT EXISTS idx_jasmanispn_tahap ON jasmani_spn(tahap);
CREATE INDEX IF NOT EXISTS idx_jasmanispn_nosis ON jasmani_spn(nosis);

-- Trigger updated_at
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_jasmanispn_updated') THEN
    CREATE TRIGGER trg_jasmanispn_updated
    BEFORE UPDATE ON jasmani_spn
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END$$;

-- Guard kolom
ALTER TABLE jasmani_spn
  ADD COLUMN IF NOT EXISTS siswa_id INT,
  ADD COLUMN IF NOT EXISTS nosis VARCHAR(50),
  ADD COLUMN IF NOT EXISTS nama TEXT,
  ADD COLUMN IF NOT EXISTS pleton TEXT,
  ADD COLUMN IF NOT EXISTS kelas TEXT,
  ADD COLUMN IF NOT EXISTS lari_12m NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS push_up NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS sit_up NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS shuttle_run NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS pull_up NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS nilai_akhir NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS keterangan TEXT,
  ADD COLUMN IF NOT EXISTS tahap INT,
  ADD COLUMN IF NOT EXISTS sumber_file TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- FK guard
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='jasmani_spn' AND column_name='siswa_id')
  THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name='jasmani_spn'
        AND tc.constraint_type='FOREIGN KEY'
        AND kcu.column_name='siswa_id'
    ) THEN
      ALTER TABLE jasmani_spn
      ADD CONSTRAINT fk_jasmanispn_siswa
      FOREIGN KEY (siswa_id) REFERENCES siswa(id) ON DELETE SET NULL;
    END IF;
  END IF;
END$$;

-- ======================================================================
-- VIEW bantu: bentuk “per item” dari jasmani_spn (untuk laporan fleksibel)
-- ======================================================================
CREATE OR REPLACE VIEW v_jasmani_itemized AS
SELECT
  j.id AS jasmani_spn_id,
  j.siswa_id,
  COALESCE(s.nosis, j.nosis) AS nosis,
  COALESCE(s.nama, j.nama)   AS nama,
  j.pleton,
  j.kelas,
  j.tahap,
  'Lari 12 Menit'::text AS item,
  j.lari_12m::text      AS nilai,
  NULL::text            AS kategori,
  j.keterangan,
  j.sumber_file,
  j.created_at,
  j.updated_at
FROM jasmani_spn j
LEFT JOIN siswa s ON s.id = j.siswa_id
UNION ALL
SELECT j.id, j.siswa_id, COALESCE(s.nosis, j.nosis), COALESCE(s.nama, j.nama),
       j.pleton, j.kelas, j.tahap,
       'Push Up', j.push_up::text, NULL::text,
       j.keterangan, j.sumber_file, j.created_at, j.updated_at
FROM jasmani_spn j
LEFT JOIN siswa s ON s.id = j.siswa_id
UNION ALL
SELECT j.id, j.siswa_id, COALESCE(s.nosis, j.nosis), COALESCE(s.nama, j.nama),
       j.pleton, j.kelas, j.tahap,
       'Sit Up', j.sit_up::text, NULL::text,
       j.keterangan, j.sumber_file, j.created_at, j.updated_at
FROM jasmani_spn j
LEFT JOIN siswa s ON s.id = j.siswa_id
UNION ALL
SELECT j.id, j.siswa_id, COALESCE(s.nosis, j.nosis), COALESCE(s.nama, j.nama),
       j.pleton, j.kelas, j.tahap,
       'Shuttle Run', j.shuttle_run::text, NULL::text,
       j.keterangan, j.sumber_file, j.created_at, j.updated_at
FROM jasmani_spn j
LEFT JOIN siswa s ON s.id = j.siswa_id
UNION ALL
SELECT j.id, j.siswa_id, COALESCE(s.nosis, j.nosis), COALESCE(s.nama, j.nama),
       j.pleton, j.kelas, j.tahap,
       'Pull Up', j.pull_up::text, NULL::text,
       j.keterangan, j.sumber_file, j.created_at, j.updated_at
FROM jasmani_spn j
LEFT JOIN siswa s ON s.id = j.siswa_id;

-- (Opsional) materialized view jika butuh performa:
-- CREATE MATERIALIZED VIEW mv_jasmani_itemized AS SELECT * FROM v_jasmani_itemized;
-- REFRESH MATERIALIZED VIEW mv_jasmani_itemized;

-- =========================================
-- Selesai
-- =========================================
