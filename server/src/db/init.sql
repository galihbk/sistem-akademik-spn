-- ================================
-- init.sql  (idempotent migration)
-- ================================
-- Aman dipanggil berulang-ulang.

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
-- Legacy cleanup
-- =========================================
DROP TABLE IF EXISTS sosiometri CASCADE;

-- =========================================
-- MASTER DATA: siswa
-- =========================================
CREATE TABLE IF NOT EXISTS siswa (
  id SERIAL PRIMARY KEY,
  nosis                 VARCHAR(50),
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
  dikum_akhir           TEXT,
  jurusan               TEXT,
  tb                    TEXT,
  bb                    TEXT,
  gol_darah             TEXT,
  no_bpjs               TEXT,
  sim_yang_dimiliki     TEXT,
  no_hp_keluarga        TEXT,
  nama_ayah_kandung      TEXT,
  nama_ibu_kandung       TEXT,
  pekerjaan_ayah_kandung TEXT,
  pekerjaan_ibu_kandung  TEXT,
  asal_polda            TEXT,
  asal_polres           TEXT,
  kelompok_angkatan     TEXT,
  diktuk_awal           TEXT,
  tahun_diktuk          TEXT,
  personel              TEXT,
  ukuran_pakaian        TEXT,
  ukuran_celana         TEXT,
  ukuran_sepatu         TEXT,
  ukuran_tutup_kepala   TEXT,
  jenis_rekrutmen       TEXT,
  foto                  TEXT,
  batalion              TEXT,
  ton                   TEXT,
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_siswa_nama_lower ON siswa (LOWER(nama));
CREATE INDEX IF NOT EXISTS idx_siswa_nosis      ON siswa (nosis);

-- Pastikan tidak ada UNIQUE di nosis (idempotent)
DO $$
DECLARE c_name text;
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

-- Partial UNIQUE di nik (NULL tidak unik)
UPDATE siswa SET nik = NULLIF(BTRIM(nik), '') WHERE nik IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_siswa_nik_notnull ON siswa(nik) WHERE nik IS NOT NULL;

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
-- MENTAL (minggu_ke)
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
-- MAPEL (per pertemuan)
-- =========================================
CREATE TABLE IF NOT EXISTS mapel (
  id BIGSERIAL PRIMARY KEY,
  siswa_id INT NOT NULL REFERENCES siswa(id) ON DELETE CASCADE,
  mapel TEXT NOT NULL,
  nilai TEXT,
  semester TEXT,
  pertemuan INT,
  catatan TEXT,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Guard kolom
ALTER TABLE mapel
  ADD COLUMN IF NOT EXISTS siswa_id INT,
  ADD COLUMN IF NOT EXISTS mapel TEXT,
  ADD COLUMN IF NOT EXISTS nilai TEXT,
  ADD COLUMN IF NOT EXISTS semester TEXT,
  ADD COLUMN IF NOT EXISTS pertemuan INT,
  ADD COLUMN IF NOT EXISTS catatan TEXT,
  ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Trigger
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_mapel_updated') THEN
    CREATE TRIGGER trg_mapel_updated
    BEFORE UPDATE ON mapel
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END$$;

-- UNIQUE final: (siswa_id, mapel, pertemuan)
DO $$
DECLARE con RECORD;
BEGIN
  FOR con IN
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    WHERE tc.table_name = 'mapel'
      AND tc.constraint_type = 'UNIQUE'
  LOOP
    EXECUTE format('ALTER TABLE mapel DROP CONSTRAINT %I;', con.constraint_name);
  END LOOP;

  BEGIN
    ALTER TABLE mapel
      ADD CONSTRAINT uq_mapel_siswa_mapel_pertemuan
      UNIQUE (siswa_id, mapel, pertemuan);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END$$;

CREATE INDEX IF NOT EXISTS idx_mapel_siswa ON mapel (siswa_id);
CREATE INDEX IF NOT EXISTS idx_mapel_siswa_mapel_pertemuan ON mapel (siswa_id, mapel, pertemuan);

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
-- Sinkronisasi kolom (defensive)
-- =========================================
ALTER TABLE siswa
  ADD COLUMN IF NOT EXISTS nosis VARCHAR(50),
  ADD COLUMN IF NOT EXISTS foto TEXT,
  ADD COLUMN IF NOT EXISTS batalion TEXT,
  ADD COLUMN IF NOT EXISTS ton TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

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
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mental' AND column_name='siswa_id') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name='mental' AND tc.constraint_type='FOREIGN KEY' AND kcu.column_name='siswa_id'
    ) THEN
      ALTER TABLE mental
      ADD CONSTRAINT fk_mental_siswa FOREIGN KEY (siswa_id) REFERENCES siswa(id) ON DELETE CASCADE;
    END IF;
  END IF;
END$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mapel' AND column_name='siswa_id') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name='mapel' AND tc.constraint_type='FOREIGN KEY' AND kcu.column_name='siswa_id'
    ) THEN
      ALTER TABLE mapel
      ADD CONSTRAINT fk_mapel_siswa FOREIGN KEY (siswa_id) REFERENCES siswa(id) ON DELETE CASCADE;
    END IF;
  END IF;
END$$;

ALTER TABLE bk
  ADD COLUMN IF NOT EXISTS siswa_id INT,
  ADD COLUMN IF NOT EXISTS judul TEXT,
  ADD COLUMN IF NOT EXISTS tanggal DATE,
  ADD COLUMN IF NOT EXISTS file_path TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bk' AND column_name='siswa_id') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name='bk' AND tc.constraint_type='FOREIGN KEY' AND kcu.column_name='siswa_id'
    ) THEN
      ALTER TABLE bk
      ADD CONSTRAINT fk_bk_siswa FOREIGN KEY (siswa_id) REFERENCES siswa(id) ON DELETE CASCADE;
    END IF;
  END IF;
END$$;

ALTER TABLE pelanggaran
  ADD COLUMN IF NOT EXISTS siswa_id INT,
  ADD COLUMN IF NOT EXISTS judul TEXT,
  ADD COLUMN IF NOT EXISTS tanggal DATE,
  ADD COLUMN IF NOT EXISTS file_path TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pelanggaran' AND column_name='siswa_id') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name='pelanggaran' AND tc.constraint_type='FOREIGN KEY' AND kcu.column_name='siswa_id'
    ) THEN
      ALTER TABLE pelanggaran
      ADD CONSTRAINT fk_pelanggaran_siswa FOREIGN KEY (siswa_id) REFERENCES siswa(id) ON DELETE CASCADE;
    END IF;
  END IF;
END$$;

ALTER TABLE prestasi
  ADD COLUMN IF NOT EXISTS siswa_id INT,
  ADD COLUMN IF NOT EXISTS tingkat TEXT,
  ADD COLUMN IF NOT EXISTS deskripsi TEXT,
  ADD COLUMN IF NOT EXISTS tanggal DATE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='prestasi' AND column_name='siswa_id') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name='prestasi' AND tc.constraint_type='FOREIGN KEY' AND kcu.column_name='siswa_id'
    ) THEN
      ALTER TABLE prestasi
      ADD CONSTRAINT fk_prestasi_siswa FOREIGN KEY (siswa_id) REFERENCES siswa(id) ON DELETE CASCADE;
    END IF;
  END IF;
END$$;

ALTER TABLE riwayat_kesehatan
  ADD COLUMN IF NOT EXISTS siswa_id INT,
  ADD COLUMN IF NOT EXISTS judul TEXT,
  ADD COLUMN IF NOT EXISTS deskripsi TEXT,
  ADD COLUMN IF NOT EXISTS tanggal DATE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='riwayat_kesehatan' AND column_name='siswa_id') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name='riwayat_kesehatan' AND tc.constraint_type='FOREIGN KEY' AND kcu.column_name='siswa_id'
    ) THEN
      ALTER TABLE riwayat_kesehatan
      ADD CONSTRAINT fk_riwayatkes_siswa FOREIGN KEY (siswa_id) REFERENCES siswa(id) ON DELETE CASCADE;
    END IF;
  END IF;
END$$;

-- ======================================================================
-- JASMANI SPN – versi RS/TS (tanpa nama/pleton/kelas di tabel)
-- ======================================================================

-- Drop VIEW agar ALTER TABLE tidak terganjal
DROP VIEW IF EXISTS v_jasmani_itemized;

CREATE TABLE IF NOT EXISTS jasmani_spn (
  id                BIGSERIAL PRIMARY KEY,
  siswa_id          INT REFERENCES siswa(id) ON DELETE SET NULL,
  nosis             VARCHAR(50),

  lari_12_menit_ts  NUMERIC(10,2),
  lari_12_menit_rs  NUMERIC(10,2),
  sit_up_ts         NUMERIC(10,2),
  sit_up_rs         NUMERIC(10,2),
  shuttle_run_ts    NUMERIC(10,2),
  shuttle_run_rs    NUMERIC(10,2),
  push_up_ts        NUMERIC(10,2),
  push_up_rs        NUMERIC(10,2),
  pull_up_ts        NUMERIC(10,2),
  pull_up_rs        NUMERIC(10,2),

  nilai_akhir       NUMERIC(10,2),
  keterangan        TEXT,
  tahap             INT,
  sumber_file       TEXT,
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW()
);

ALTER TABLE jasmani_spn
  ADD COLUMN IF NOT EXISTS siswa_id INT,
  ADD COLUMN IF NOT EXISTS nosis VARCHAR(50),
  ADD COLUMN IF NOT EXISTS lari_12_menit_ts NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS lari_12_menit_rs NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS sit_up_ts NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS sit_up_rs NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS shuttle_run_ts NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS shuttle_run_rs NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS push_up_ts NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS push_up_rs NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS pull_up_ts NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS pull_up_rs NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS nilai_akhir NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS keterangan TEXT,
  ADD COLUMN IF NOT EXISTS tahap INT,
  ADD COLUMN IF NOT EXISTS sumber_file TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- buang legacy
ALTER TABLE jasmani_spn
  DROP COLUMN IF EXISTS lari_12m,
  DROP COLUMN IF EXISTS sit_up,
  DROP COLUMN IF EXISTS shuttle_run,
  DROP COLUMN IF EXISTS push_up,
  DROP COLUMN IF EXISTS pull_up,
  DROP COLUMN IF EXISTS nama,
  DROP COLUMN IF EXISTS pleton,
  DROP COLUMN IF EXISTS kelas;

ALTER TABLE jasmani_spn
  ADD COLUMN IF NOT EXISTS tb_cm NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS bb_kg NUMERIC(10,2);
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name='jasmani_spn' AND tc.constraint_type='FOREIGN KEY' AND kcu.column_name='siswa_id'
  ) THEN
    ALTER TABLE jasmani_spn
      ADD CONSTRAINT fk_jasmanispn_siswa FOREIGN KEY (siswa_id) REFERENCES siswa(id) ON DELETE SET NULL;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name='jasmani_spn' AND constraint_type='UNIQUE' AND constraint_name='uq_jasmanispn_siswa_tahap'
  ) THEN
    ALTER TABLE jasmani_spn
      ADD CONSTRAINT uq_jasmanispn_siswa_tahap UNIQUE (siswa_id, tahap);
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_jasmanispn_siswa ON jasmani_spn(siswa_id);
CREATE INDEX IF NOT EXISTS idx_jasmanispn_tahap ON jasmani_spn(tahap);
CREATE INDEX IF NOT EXISTS idx_jasmanispn_nosis ON jasmani_spn(nosis);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_jasmanispn_updated') THEN
    CREATE TRIGGER trg_jasmanispn_updated
    BEFORE UPDATE ON jasmani_spn
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END$$;

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
-- ======================================================================
-- NILAI JASMANI POLDA (IMPORT-ONLY, TANPA JSONB) — REVISED
-- ======================================================================

CREATE TABLE IF NOT EXISTS jasmani_polda (
  id                    BIGSERIAL PRIMARY KEY,
  siswa_id              INT NULL REFERENCES siswa(id) ON DELETE SET NULL,

  -- identitas
  no_panda              TEXT,
  nama                  TEXT,
  jenis_kelamin         TEXT,
  jalur_seleksi         TEXT,
  angkatan              TEXT,

  -- antropometri & deskriptif
  tb_cm                 NUMERIC(10,2),
  bb_kg                 NUMERIC(10,2),
  ratio_index           TEXT,
  somato_type           TEXT,
  klasifikasi_tipe_tubuh TEXT,
  nilai_tipe_tubuh      NUMERIC(10,2),
  nilai_kelainan        NUMERIC(10,2),
  nilai_terkecil        NUMERIC(10,2),
  nilai_anthro          NUMERIC(10,2),     -- angka
  antro                 TEXT,              -- huruf/grade/rekap angka jadi label
  antro_text            TEXT,              -- ANTHRO PEMBOBOTAN (teks)
  pencapaian_nbl        TEXT,

  -- renang & samapta
  renang                NUMERIC(10,2),
  renang_x20            NUMERIC(10,2),

  -- KESAMAPTAAN A (pengganti lari_12_menit)
  kesamaptaan_hga       NUMERIC(10,2),
  kesamaptaan_nga       NUMERIC(10,2),

  -- KESAMAPTAAN B (detail & generik)
  pull_up_hgb1          NUMERIC(10,2),
  pull_up_ngb1          NUMERIC(10,2),
  sit_up_hgb2           NUMERIC(10,2),
  sit_up_ngb2           NUMERIC(10,2),
  push_up_hgb3          NUMERIC(10,2),
  push_up_ngb3          NUMERIC(10,2),
  shuttle_run_hgb4      NUMERIC(10,2),
  shuttle_run_ngb4      NUMERIC(10,2),

  pull_up_chinning      NUMERIC(10,2),     -- generik (legacy) → diisi dari NGB1 jika ada
  sit_up                NUMERIC(10,2),     -- generik (legacy) → NGB2
  push_up               NUMERIC(10,2),     -- generik (legacy) → NGB3
  shuttle_run           NUMERIC(10,2),     -- generik (legacy) → NGB4

  -- rekap
  nilai_b               NUMERIC(10,2),
  na_a_b                NUMERIC(10,2),     -- NA A+B
  samapta_x80           NUMERIC(10,2),     -- SAMAPTA X80
  nilai_akhir           NUMERIC(10,2),
  ktgr                  TEXT,
  ket                   TEXT,
  catatan               TEXT,
  paraf                 TEXT,

  -- meta
  sumber_file           TEXT,
  sheet_name            TEXT,

  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP DEFAULT NOW()
);

-- Sinkronisasi kolom (idempotent)
ALTER TABLE jasmani_polda
  ADD COLUMN IF NOT EXISTS siswa_id                INT,
  ADD COLUMN IF NOT EXISTS no_panda                TEXT,
  ADD COLUMN IF NOT EXISTS nama                    TEXT,
  ADD COLUMN IF NOT EXISTS jenis_kelamin           TEXT,
  ADD COLUMN IF NOT EXISTS jalur_seleksi           TEXT,
  ADD COLUMN IF NOT EXISTS angkatan                TEXT,

  ADD COLUMN IF NOT EXISTS tb_cm                   NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS bb_kg                   NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS ratio_index             TEXT,
  ADD COLUMN IF NOT EXISTS somato_type             TEXT,
  ADD COLUMN IF NOT EXISTS klasifikasi_tipe_tubuh  TEXT,
  ADD COLUMN IF NOT EXISTS nilai_tipe_tubuh        NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS nilai_kelainan          NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS nilai_terkecil          NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS nilai_anthro            NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS antro                   TEXT,
  ADD COLUMN IF NOT EXISTS antro_text              TEXT,
  ADD COLUMN IF NOT EXISTS pencapaian_nbl          TEXT,

  ADD COLUMN IF NOT EXISTS renang                  NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS renang_x20              NUMERIC(10,2),

  ADD COLUMN IF NOT EXISTS kesamaptaan_hga         NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS kesamaptaan_nga         NUMERIC(10,2),

  ADD COLUMN IF NOT EXISTS pull_up_hgb1            NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS pull_up_ngb1            NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS sit_up_hgb2             NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS sit_up_ngb2             NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS push_up_hgb3            NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS push_up_ngb3            NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS shuttle_run_hgb4        NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS shuttle_run_ngb4        NUMERIC(10,2),

  ADD COLUMN IF NOT EXISTS pull_up_chinning        NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS sit_up                  NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS push_up                 NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS shuttle_run             NUMERIC(10,2),

  ADD COLUMN IF NOT EXISTS nilai_b                 NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS na_a_b                  NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS samapta_x80             NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS nilai_akhir             NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS ktgr                    TEXT,
  ADD COLUMN IF NOT EXISTS ket                     TEXT,
  ADD COLUMN IF NOT EXISTS catatan                 TEXT,
  ADD COLUMN IF NOT EXISTS paraf                   TEXT,

  ADD COLUMN IF NOT EXISTS sumber_file             TEXT,
  ADD COLUMN IF NOT EXISTS sheet_name              TEXT,
  ADD COLUMN IF NOT EXISTS created_at              TIMESTAMP DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at              TIMESTAMP DEFAULT NOW();

-- Migrasi: jika masih ada kolom lama lari_12_menit → salin ke kesamaptaan_hga lalu drop
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='jasmani_polda' AND column_name='lari_12_menit'
  ) THEN
    EXECUTE $m$
      UPDATE jasmani_polda
      SET kesamaptaan_hga = COALESCE(kesamaptaan_hga, lari_12_menit)
    $m$;
    EXECUTE 'ALTER TABLE jasmani_polda DROP COLUMN lari_12_menit';
  END IF;
END$$;

-- Migrasi ringan: isikan kolom generik dari NGB jika generik NULL
UPDATE jasmani_polda
SET
  pull_up_chinning = COALESCE(pull_up_chinning, pull_up_ngb1),
  sit_up           = COALESCE(sit_up,           sit_up_ngb2),
  push_up          = COALESCE(push_up,          push_up_ngb3),
  shuttle_run      = COALESCE(shuttle_run,      shuttle_run_ngb4)
WHERE
  pull_up_chinning IS NULL OR sit_up IS NULL OR push_up IS NULL OR shuttle_run IS NULL;

-- Trigger updated_at (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_jasmani_polda_updated') THEN
    CREATE TRIGGER trg_jasmani_polda_updated
    BEFORE UPDATE ON jasmani_polda
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END$$;

-- Indeks bantu + Unique
CREATE INDEX IF NOT EXISTS idx_jp_nopanda    ON jasmani_polda (no_panda);
CREATE INDEX IF NOT EXISTS idx_jp_angkatan   ON jasmani_polda (angkatan);
CREATE INDEX IF NOT EXISTS idx_jp_nama_lower ON jasmani_polda (LOWER(nama));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name='jasmani_polda'
      AND constraint_type='UNIQUE'
      AND constraint_name='uq_jp_no_panda_angkatan'
  ) THEN
    ALTER TABLE jasmani_polda
      ADD CONSTRAINT uq_jp_no_panda_angkatan UNIQUE (no_panda, angkatan);
  END IF;
END$$;

-- ======================================================================
-- END: jasmani_polda
-- ======================================================================
-- =========================================
-- PATCH: jasmani_polda - KESAMAPTAAN HGA/NGA dan versi numeriknya
-- =========================================

-- Tambah kolom TEXT (label) bila belum ada
ALTER TABLE jasmani_polda
  ADD COLUMN IF NOT EXISTS kesamaptaan_hga TEXT,
  ADD COLUMN IF NOT EXISTS kesamaptaan_nga TEXT;

-- Opsi: kolom angka pendamping (kalau nanti ada nilai numerik)
ALTER TABLE jasmani_polda
  ADD COLUMN IF NOT EXISTS kesamaptaan_hga_num NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS kesamaptaan_nga_num NUMERIC(10,2);

-- Jika sebelumnya sempat dibuat NUMERIC, ubah ke TEXT agar tidak error "MS"
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name='jasmani_polda' AND column_name='kesamaptaan_hga'
      AND udt_name IN ('numeric','float8','float4')
  ) THEN
    EXECUTE $q$
      ALTER TABLE jasmani_polda
      ALTER COLUMN kesamaptaan_hga TYPE TEXT
      USING NULLIF(TRIM(kesamaptaan_hga::text),'')
    $q$;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name='jasmani_polda' AND column_name='kesamaptaan_nga'
      AND udt_name IN ('numeric','float8','float4')
  ) THEN
    EXECUTE $q$
      ALTER TABLE jasmani_polda
      ALTER COLUMN kesamaptaan_nga TYPE TEXT
      USING NULLIF(TRIM(kesamaptaan_nga::text),'')
    $q$;
  END IF;
END$$;

-- Kolom HGB/NGB per item (aman dijalankan berulang)
ALTER TABLE jasmani_polda
  ADD COLUMN IF NOT EXISTS pull_up_hgb1     NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS pull_up_ngb1     NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS sit_up_hgb2      NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS sit_up_ngb2      NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS push_up_hgb3     NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS push_up_ngb3     NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS shuttle_run_hgb4 NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS shuttle_run_ngb4 NUMERIC(10,2);
ALTER TABLE jasmani_polda
  DROP COLUMN IF EXISTS jk,
  DROP COLUMN IF EXISTS pull_up_chining,
  DROP COLUMN IF EXISTS sit_up,
  DROP COLUMN IF EXISTS push_up,
  DROP COLUMN IF EXISTS shuttle_run,
  DROP COLUMN IF EXISTS paraf,
  DROP COLUMN IF EXISTS polda,
  DROP COLUMN IF EXISTS panda,
  DROP COLUMN IF EXISTS tahun,
  DROP COLUMN IF EXISTS kesamaptaan_hga_num,
  DROP COLUMN IF EXISTS kesamaptaan_nga_num;
ALTER TABLE jasmani_polda
  DROP COLUMN IF EXISTS pull_up_chining CASCADE;
-- =========================================
-- Selesai
-- =========================================
