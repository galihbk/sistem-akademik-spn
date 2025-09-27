import { useState } from "react";
const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function InputRiwayatKesehatan(){
  const [nosis, setNosis] = useState('');
  const [judul, setJudul] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [tanggal, setTanggal] = useState(() => new Date().toISOString().slice(0,10));
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(){
    setMsg('');
    if(!nosis.trim() || !judul.trim() || !deskripsi.trim()) { setMsg('Lengkapi NOSIS, Judul, Deskripsi.'); return; }
    try{
      setLoading(true);
      const token = await window.authAPI.getToken();
      const res = await fetch(`${API}/riwayat_kesehatan`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ nosis:nosis.trim(), judul:judul.trim(), deskripsi:deskripsi.trim(), tanggal })
      });
      const data = await res.json();
      if(!res.ok) throw new Error(data.message || 'Gagal simpan');
      setMsg('Berhasil disimpan.');
      setJudul(''); setDeskripsi('');
    }catch(e){ setMsg(`Gagal: ${e.message}`); }
    finally{ setLoading(false); }
  }
  function back(){ window.location.hash = '#/import'; }

  return (
    <div className="grid">
      <div className="card" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <div>
          <div style={{fontWeight:800, fontSize:18}}>Input Riwayat Kesehatan</div>
          <div className="muted">Catat riwayat kesehatan per siswa</div>
        </div>
        <button className="btn" onClick={back}>Kembali</button>
      </div>

      <div className="card">
        <div className="grid grid-2">
          <div>
            <label className="muted">NOSIS</label>
            <input className="input" value={nosis} onChange={e=>setNosis(e.target.value)} />
          </div>
          <div>
            <label className="muted">Tanggal</label>
            <input className="input" type="date" value={tanggal} onChange={e=>setTanggal(e.target.value)} />
          </div>
        </div>
        <div style={{marginTop:10}}>
          <label className="muted">Judul</label>
          <input className="input" value={judul} onChange={e=>setJudul(e.target.value)} />
        </div>
        <div style={{marginTop:10}}>
          <label className="muted">Deskripsi</label>
          <textarea className="input" rows={3} value={deskripsi} onChange={e=>setDeskripsi(e.target.value)} />
        </div>

        {msg && <div style={{marginTop:10, color: msg.startsWith('Berhasil') ? '#86efac' : '#fca5a5'}}>{msg}</div>}
        <div style={{marginTop:12}}><button className="btn" disabled={loading} onClick={submit}>Simpan</button></div>
      </div>
    </div>
  );
}
