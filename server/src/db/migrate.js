const fs = require('fs');
const path = require('path');
const pool = require('./pool');

async function tableExists(table){
  const q = `
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = $1
    LIMIT 1
  `;
  const r = await pool.query(q, [table]);
  return r.rowCount > 0;
}

function inferCreateTableName(filename){
  // contoh: 20250923_01_create_siswa.sql -> siswa
  const m = filename.match(/_create_([a-z0-9_]+)\.sql$/i);
  return m ? m[1] : null;
}

(async ()=>{
  try{
    const dir = path.join(__dirname, 'migrations');
    const files = (fs.existsSync(dir) ? fs.readdirSync(dir) : [])
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const f of files) {
      const maybeTable = inferCreateTableName(f);
      if (maybeTable) {
        const exists = await tableExists(maybeTable);
        if (exists) { console.log(`[migrate] ${f} ... SKIP (table "${maybeTable}" already exists)`); continue; }
      }

      const sql = fs.readFileSync(path.join(dir, f), 'utf8');
      process.stdout.write(`[migrate] ${f} ... `);
      await pool.query(sql);
      console.log('OK');
    }
    console.log('[migrate] done.');
  } catch (e) {
    console.error('\n[ERROR]', e.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
