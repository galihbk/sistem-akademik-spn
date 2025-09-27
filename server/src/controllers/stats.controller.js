const pool = require('../db/pool');

// ringkasan untuk dashboard
async function summary(_req, res){
  try {
    // total siswa
    const { rows: rSiswa } = await pool.query('SELECT COUNT(*)::int AS total FROM siswa');

    // info import terakhir (aksi = import_siswa)
    const { rows: rLast } = await pool.query(`
      SELECT
        created_at,
        COALESCE((detail::jsonb ->> 'rows')::int, 0)  AS rows,
        COALESCE((detail::jsonb ->> 'ok')::int, 0)    AS ok,
        COALESCE((detail::jsonb ->> 'skip')::int, 0)  AS skip,
        COALESCE((detail::jsonb ->> 'fail')::int, 0)  AS fail
      FROM audit_log
      WHERE aksi = 'import_siswa'
      ORDER BY created_at DESC
      LIMIT 1
    `);

    res.json({
      siswa_total: rSiswa[0]?.total ?? 0,
      last_import: rLast[0] || null,
      server_status: 'Online'
    });
  } catch (e) {
    console.error('[stats.summary]', e);
    res.status(500).json({ message: 'Failed to get summary' });
  }
}

// daftar aktivitas terbaru
async function recentActivity(_req, res){
  try{
    const { rows } = await pool.query(`
      SELECT id, admin, aksi, target, hasil, created_at
      FROM audit_log
      ORDER BY created_at DESC
      LIMIT 10
    `);
    res.json({ items: rows });
  }catch(e){
    console.error('[stats.recent]', e);
    res.status(500).json({ message: 'Failed to get activity' });
  }
}

async function latestLogs(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT id, admin, aksi, target, hasil, created_at
       FROM audit_log
       ORDER BY created_at DESC
       LIMIT 5`
    );
    res.json(rows);
  } catch (e) {
    console.error('[stats.latestLogs]', e);
    res.status(500).json({ error: 'Gagal ambil log terbaru' });
  }
}
module.exports = { summary, recentActivity, latestLogs };
