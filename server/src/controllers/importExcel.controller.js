const { importExcelGeneric } = require('./importExcel.generic');

// Konfigurasi per-jenis (header varian bisa kamu tambah kapan saja)
const cfgs = {
  sosiometri: {
    table: 'sosiometri',
    sheetKeywords: ['sosio','sosiometri'],
    uniqueKeys: ['nosis'],
    headerMap: {
      nosis: ['NOSIS','NO SISWA','NIM','NIMEN'],
      nama:  ['NAMA','NAMA SISWA'],
      nilai: ['NILAI','SKOR','SCORE'],
      catatan: ['CATATAN','KET','KETERANGAN'],
      meta: []
    },
    ddl: `
      CREATE TABLE IF NOT EXISTS sosiometri(
        nosis TEXT PRIMARY KEY,
        nama TEXT,
        nilai TEXT,
        catatan TEXT,
        meta JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `
  },

  mental: {
    table: 'mental',
    sheetKeywords: ['mental','kepribadian','psikologi'],
    uniqueKeys: ['nosis'],
    headerMap: {
      nosis: ['NOSIS','NIM','NIMEN'],
      nama:  ['NAMA'],
      nilai: ['NILAI','SKOR','SCORE','RATA2','RERATA'],
      catatan: ['CATATAN','KETERANGAN','KET'],
      meta: []
    },
    ddl: `
      CREATE TABLE IF NOT EXISTS mental(
        nosis TEXT PRIMARY KEY,
        nama TEXT,
        nilai TEXT,
        catatan TEXT,
        meta JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `
  },

  mapel: {
    table: 'mapel',
    sheetKeywords: ['mapel','mata pelajaran','nilai mapel'],
    // satu siswa bisa banyak mapel -> kunci unik gabungan
    uniqueKeys: ['nosis','mapel'],
    headerMap: {
      nosis: ['NOSIS','NIM','NIMEN'],
      nama:  ['NAMA'],
      mapel: ['MAPEL','MATA PELAJARAN','PELAJARAN'],
      nilai: ['NILAI','SKOR','SCORE'],
      semester: ['SEMESTER'],
      catatan: ['CATATAN','KETERANGAN','KET'],
      meta: []
    },
    ddl: `
      CREATE TABLE IF NOT EXISTS mapel(
        id BIGSERIAL PRIMARY KEY,
        nosis TEXT NOT NULL,
        nama TEXT,
        mapel TEXT NOT NULL,
        nilai TEXT,
        semester TEXT,
        catatan TEXT,
        meta JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE (nosis, mapel)
      );
    `
  },

  jasmani: {
    table: 'jasmani',
    sheetKeywords: ['jasmani','kesamaptaan','samapta'],
    // satu siswa bisa banyak item jasmani -> unik gabungan
    uniqueKeys: ['nosis','item'],
    headerMap: {
      nosis: ['NOSIS','NIM','NIMEN'],
      nama:  ['NAMA'],
      item:  ['ITEM','TEST','JENIS TES','CABANG'],
      nilai: ['NILAI','SKOR','HASIL'],
      kategori: ['KATEGORI','PREDIKAT','GRADE'],
      catatan: ['CATATAN','KETERANGAN','KET'],
      meta: []
    },
    ddl: `
      CREATE TABLE IF NOT EXISTS jasmani(
        id BIGSERIAL PRIMARY KEY,
        nosis TEXT NOT NULL,
        nama TEXT,
        item TEXT NOT NULL,
        nilai TEXT,
        kategori TEXT,
        catatan TEXT,
        meta JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE (nosis, item)
      );
    `
  }
};

// controller endpoint: /import/:type
async function importExcel(req, res) {
  try {
    const type = (req.params.type || '').toLowerCase();
    const cfg = cfgs[type];
    if (!cfg) return res.status(404).json({ message: 'Tipe import tidak dikenali' });

    if (!req.file) return res.status(400).json({ message: 'File Excel wajib' });

    const dryRun    = String(req.query.dryRun || '').toLowerCase() === 'true';
    const sheetName = req.query.sheet || undefined;
    const admin     = req.user?.username || 'admin';

    const result = await importExcelGeneric(req.file.buffer, { dryRun, sheetName, admin }, cfg);
    return res.json(result);
  } catch (e) {
    console.error('[importExcel]', e);
    res.status(500).json({ message: e.message || 'Gagal import' });
  }
}

module.exports = { importExcel };
