const fs = require('fs');
const path = require('path');
const pool = require('./pool');

(async ()=>{
  const sql = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf8');
  try {
    await pool.query(sql);
    console.log('[db:init] schema initialized ✔');
  } catch (e) {
    console.error('[db:init] failed:', e.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
