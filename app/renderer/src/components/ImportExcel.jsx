import { useState } from "react";
const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function ImportExcel({ endpoint, title }){
  const [file, setFile]     = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading]= useState(false);
  const [modal, setModal]   = useState({ open:false, type:null, list:[] });

  async function requestImport(dryRun){
    if(!file) return;
    setLoading(true); setResult(null);
    try{
      const token = await window.authAPI.getToken();
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${API}/import/${endpoint}${dryRun ? '?dryRun=true':''}`, {
        method:'POST',
        headers:{ Authorization: `Bearer ${token}` },
        body: form
      });
      const data = await res.json();
      setResult(data);
    }catch(e){ setResult({ error: e.message || 'Gagal import' }); }
    finally{ setLoading(false); }
  }
  function openModal(type){
    if(!result?.detailLists?.[type]) return;
    setModal({ open:true, type, list: result.detailLists[type] });
  }
  function back(){ window.location.hash = '#/import'; }

  return (
    <div className="grid">
      <div className="card" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <div>
          <div style={{fontWeight:800, fontSize:18}}>{title}</div>
          <div className="muted">Gunakan file .xlsx sesuai template</div>
        </div>
        <button className="btn" onClick={back}>Kembali</button>
      </div>

      <div className="card">
        <div style={{display:'flex', gap:10, alignItems:'center', flexWrap:'wrap'}}>
          <input type="file" accept=".xlsx,.xls" onChange={e=>setFile(e.target.files[0])}/>
          <button className="btn" disabled={!file||loading} onClick={()=>requestImport(true)}>Cek (Dry Run)</button>
          <button className="btn" disabled={!file||loading} onClick={()=>requestImport(false)}>Mulai Import</button>
        </div>

        {result && (
          <div style={{marginTop:12}}>
            {"error" in result ? (
              <div style={{ color: "#fca5a5" }}>⚠ {result.error || result.message}</div>
            ) : (
              <>
                <div className="muted">
                  Sheet: <b>{result.sheetUsed}</b> · Rows: <b>{result.rows}</b> · Header row: <b>{result.headerRow}</b>
                </div>
                <div style={{ marginTop: 8, display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <span className="badge clickable" onClick={() => openModal("ok")}>OK: {result.ok}</span>
                  <span className="badge clickable" onClick={() => openModal("skip")}>Skip: {result.skip}</span>
                  <span className="badge clickable" onClick={() => openModal("fail")}>Fail: {result.fail}</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {modal.open && (
        <div className="modal" onClick={()=>setModal({open:false,type:null,list:[]})}>
          <div className="modal-content" onClick={(e)=>e.stopPropagation()}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <div style={{fontWeight:800}}>Detail {modal.type?.toUpperCase()} ({modal.list.length})</div>
              <button className="btn" onClick={()=>setModal({open:false,type:null,list:[]})}>Tutup</button>
            </div>
            <table className="table" style={{marginTop:10}}>
              <thead><tr><th>NOSIS</th><th>Nama</th>{modal.type==='fail' && <th>Error</th>}</tr></thead>
              <tbody>
                {modal.list.map((r,i)=>(
                  <tr key={i}>
                    <td>{r.nosis || '-'}</td>
                    <td>{r.nama || '-'}</td>
                    {modal.type==='fail' && <td>{r.error || '-'}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
