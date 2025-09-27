import { useEffect, useMemo, useRef, useState } from "react";
const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function SiswaPage(){
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("nama");      // 'nama' | 'nosis'
  const [sortDir, setSortDir] = useState("asc");     // 'asc'  | 'desc'
  const [data, setData] = useState({ items: [], total: 0, page: 1, limit: 20 });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // debounce ketik 300ms
  const debRef = useRef(0);
  function onType(val){
    setQ(val);
    clearTimeout(debRef.current);
    debRef.current = setTimeout(()=>{ setPage(1); load(1, sortBy, sortDir, val); }, 300);
  }

  async function load(pageArg = page, sb = sortBy, sd = sortDir, qArg = q) {
    try{
      setLoading(true); setErr("");
      const token = await window.authAPI.getToken();
      const url = new URL(`${API}/siswa`);
      if (qArg.trim()) url.searchParams.set("q", qArg.trim());
      url.searchParams.set("page", String(pageArg));
      url.searchParams.set("limit", "20");
      url.searchParams.set("sort_by", sb);
      url.searchParams.set("sort_dir", sd);
      const res  = await fetch(url, { headers: { Authorization: `Bearer ${token}` }});
      const json = await res.json();
      if(!res.ok) throw new Error(json.message || "Gagal memuat");
      setData(json);
    }catch(e){ setErr(e.message || "Error"); }
    finally{ setLoading(false); }
  }

  useEffect(()=>{ load(); /* eslint-disable-next-line */ }, [page, sortBy, sortDir]);

  // toggle sort saat klik header
  function toggleSort(column){
    if (sortBy === column) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDir('asc');
    }
  }

  function sortIcon(column){
    if (sortBy !== column) return '↕';
    return sortDir === 'asc' ? '↑' : '↓';
  }

  function gotoDetail(nosis){
    window.location.hash = `#/siswa/${encodeURIComponent(String(nosis))}`;
  }

  const totalPages = useMemo(
    ()=> Math.max(1, Math.ceil((data.total||0)/(data.limit||20))),
    [data.total, data.limit]
  );

  return (
    <div className="grid">
      <div className="card">
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap'}}>
          <div>
            <div style={{fontWeight:800, fontSize:18}}>Siswa</div>
            <div style={{color:'#94a3b8'}}>Cari by NOSIS atau Nama • Klik header untuk sorting</div>
          </div>
          <input
            className="input"
            placeholder="Ketik untuk mencari NOSIS / Nama..."
            value={q}
            onChange={(e)=>onType(e.target.value)}
            style={{minWidth:300}}
          />
        </div>
        {err && <div style={{marginTop:8, color:'#fca5a5'}}>⚠ {err}</div>}
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th style={{width:180, cursor:'pointer'}} onClick={()=>toggleSort('nosis')}>
                NOSIS <span style={{opacity:.6, marginLeft:6}}>{sortIcon('nosis')}</span>
              </th>
              <th style={{cursor:'pointer'}} onClick={()=>toggleSort('nama')}>
                Nama <span style={{opacity:.6, marginLeft:6}}>{sortIcon('nama')}</span>
              </th>
              <th style={{width:120, textAlign:'right'}}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="3" style={{padding:14, color:'#94a3b8'}}>Memuat...</td></tr>
            ) : (data.items||[]).length === 0 ? (
              <tr><td colSpan="3" style={{padding:14, color:'#94a3b8'}}>Tidak ada data.</td></tr>
            ) : data.items.map((s)=>(
              <tr key={s.nosis}>
                <td><code>{s.nosis}</code></td>
                <td>{s.nama}</td>
                <td style={{textAlign:'right'}}>
                  <button className="btn" onClick={()=>gotoDetail(s.nosis)}>Detail</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{display:'flex', justifyContent:'space-between', marginTop:10}}>
          <div style={{color:'#94a3b8'}}>Total: {data.total}</div>
          <div style={{display:'flex', gap:6}}>
            <button className="btn" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Prev</button>
            <div className="badge">Page {page} / {totalPages}</div>
            <button className="btn" disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)}>Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
