import { useMemo, useState } from "react";
const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function UploadPdf({ kind }) {
  const title = useMemo(()=> kind==='bk' ? 'Upload BK (PDF)' : 'Upload Pelanggaran (PDF)', [kind]);

  const [nosis, setNosis] = useState('');
  const [judul, setJudul] = useState('');
  const [tanggal, setTanggal] = useState(() => new Date().toISOString().slice(0,10));
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(){
    setMsg('');
    if(!nosis.trim() || !judul.trim() || !file) { setMsg('Lengkapi NOSIS, Judul, dan File.'); return; }
    if(file.type !== 'application/pdf'){ setMsg('File harus PDF.'); return; }

    try{
      setLoading(true);
      const token = await window.authAPI.getToken();
      const form = new FormData();
      form.append('file', file);
      form.append('nosis', nosis.trim());
      form.append('judul', judul.trim());
      form.append('tanggal', tanggal);

      const res = await fetch(`${API}/upload/${kind}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form
      });
      const data = await res.json();
      if(!res.ok) throw new Error(data.message || 'Gagal upload');
      setMsg('Berhasil diunggah.');
      setFile(null); (document.getElementById('pdfInput')||{}).value='';
    }catch(e){
      setMsg(`Gagal: ${e.message}`);
    }finally{
      setLoading(false);
    }
  }

  function back(){ window.location.hash = '#/import'; }

  return (
    <div className="grid">
      <div className="card" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <div>
          <div style={{fontWeight:800, fontSize:18}}>{title}</div>
          <div className="muted">Lampirkan file PDF sesuai siswa</div>
        </div>
        <button className="btn" onClick={back}>Kembali</button>
      </div>

      <div className="card">
        <div className="grid grid-2">
          <div>
            <label className="muted">NOSIS</label>
            <input className="input" placeholder="mis. 0123456" value={nosis} onChange={e=>setNosis(e.target.value)} />
          </div>
          <div>
            <label className="muted">Tanggal</label>
            <input className="input" type="date" value={tanggal} onChange={e=>setTanggal(e.target.value)} />
          </div>
        </div>

        <div style={{marginTop:10}}>
          <label className="muted">Judul</label>
          <input className="input" placeholder="Judul dokumen" value={judul} onChange={e=>setJudul(e.target.value)} />
        </div>

        <div style={{marginTop:10}}>
          <label className="muted">File PDF</label>
          <input id="pdfInput" type="file" accept="application/pdf" onChange={e=>setFile(e.target.files[0])}/>
        </div>

        {msg && <div style={{marginTop:10, color: msg.startsWith('Berhasil') ? '#86efac' : '#fca5a5'}}>{msg}</div>}

        <div style={{marginTop:12}}>
          <button className="btn" disabled={loading} onClick={submit}>Unggah</button>
        </div>
      </div>
    </div>
  );
}
