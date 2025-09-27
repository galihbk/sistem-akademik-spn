const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

function toSnake(s){
  return String(s||'')
    .trim()
    .replace(/\r?\n+/g,' ')
    .replace(/[^\p{L}\p{N}]+/gu,'_')
    .replace(/_{2,}/g,'_')
    .replace(/^_|_$/g,'')
    .toLowerCase();
}

function main(){
  const file = process.argv[2];
  if(!file){ console.error('Usage: node src/db/gen_migration_from_headers.js "/abs/path/file.xlsx"'); process.exit(1); }
  if(!fs.existsSync(file)){ console.error('File not found:', file); process.exit(1); }

  const wb = XLSX.readFile(file, { cellDates:true });
  const colSet = new Set();

  wb.SheetNames.forEach(name=>{
    const ws = wb.Sheets[name];
    if(!ws) return;
    const rows = XLSX.utils.sheet_to_json(ws, { header:1, raw:true });
    const top = rows.slice(0, 30);
    let best = { idx:0, score:-1, header:[] };
    for (let i=0;i<top.length;i++){
      const row = top[i] || [];
      const header = row.map(c => (c==null?'':String(c).trim()));
      const score = header.filter(h=>h && /[A-Za-z]/.test(h)).length;
      if(score > best.score){ best = { idx:i, score, header }; }
    }
    const header = best.header;
    header.forEach(h=>{
      const snake = toSnake(h);
      if(snake && !['id','nisn','nik','nama','ttl','alamat','nosis_generate','created_at','updated_at'].includes(snake)){
        colSet.add(snake);
      }
    });
  });

  if(colSet.size===0){
    console.log('Tidak menemukan header tambahan. Tidak ada file migrasi dibuat.');
    return;
  }

  const cols = Array.from(colSet).sort();
  const ts = new Date().toISOString().slice(0,10).replace(/-/g,'');
  const filename = `${ts}_02_add_siswa_excel_columns.sql`;
  const out = path.join(__dirname, 'migrations', filename);

  let sql = '-- kolom tambahan hasil inspeksi excel (tipe TEXT; sesuaikan tipe jika perlu)\n';
  cols.forEach(c=>{
    sql += `ALTER TABLE siswa ADD COLUMN IF NOT EXISTS ${c} TEXT;\n`;
  });

  fs.writeFileSync(out, sql, 'utf8');
  console.log('[gen] migration created:', out);
  console.log('[gen] columns:', cols.join(', '));
}

main();
