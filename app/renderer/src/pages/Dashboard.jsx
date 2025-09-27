import { useEffect, useState } from 'react'
import { getSummary, getRecentActivity } from '../api/stats'

export default function Dashboard(){
  const [sum,setSum]=useState(null)
  const [act,setAct]=useState({items:[]})
  const [err,setErr]=useState('')

  const load = async ()=>{
    try{
      setErr('')
      const token = await window.authAPI.getToken()
      const [s, a] = await Promise.all([getSummary(token), getRecentActivity(token)])
      setSum(s); setAct(a)
    }catch(e){ setErr(e.message || 'Gagal memuat data') }
  }

  useEffect(()=>{
    load()
    const id = setInterval(load, 15_000) // auto refresh 15 detik
    return ()=> clearInterval(id)
  },[])

  return (
    <div className="grid">
      {err && <div className="card" style={{borderColor:'#7f1d1d', color:'#fecaca'}}>⚠ {err}</div>}

      {/* ringkasan */}
      <div className="grid grid-4">
        <div className="card">
          <div style={{fontSize:12, color:'#94a3b8'}}>Siswa</div>
          <div style={{fontSize:26, fontWeight:800, marginTop:6}}>{sum?.siswa_total ?? '—'}</div>
        </div>
        <div className="card">
          <div style={{fontSize:12, color:'#94a3b8'}}>PDF BK</div>
          <div style={{fontSize:26, fontWeight:800, marginTop:6}}>{sum?.bk_pdf_total ?? '—'}</div>
        </div>
        <div className="card">
          <div style={{fontSize:12, color:'#94a3b8'}}>PDF Pelanggaran</div>
          <div style={{fontSize:26, fontWeight:800, marginTop:6}}>{sum?.pelanggaran_pdf_total ?? '—'}</div>
        </div>
        <div className="card">
          <div style={{fontSize:12, color:'#94a3b8'}}>Import Terakhir</div>
          <div style={{fontSize:16, fontWeight:700, marginTop:6}}>
            {sum?.last_import_at ? new Date(sum.last_import_at).toLocaleString() : '—'}
          </div>
        </div>
      </div>

      {/* aktivitas terbaru */}
      <div className="grid grid-2">
        <div className="card">
          <div style={{fontWeight:700, marginBottom:8}}>Aktivitas Terbaru</div>
          <ul style={{margin:0, paddingLeft:18, lineHeight:1.8, color:'#cbd5e1'}}>
            {(act.items||[]).map(item=>(
              <li key={item.id}>
                <b>{item.aksi}</b> oleh <span className="badge">{item.admin||'admin'}</span>
                {' '}<span style={{color:'#94a3b8'}}>{new Date(item.created_at).toLocaleString()}</span>
              </li>
            ))}
            {(!act.items || act.items.length===0) && <li>Tidak ada aktivitas.</li>}
          </ul>
        </div>
        <div className="card">
          <div style={{fontWeight:700, marginBottom:8}}>Quick Actions</div>
          <div className="grid">
            <a className="btn" href="#/import">Buka Halaman Import</a>
            <a className="btn" href="#/siswa">Cari Siswa</a>
          </div>
        </div>
      </div>
    </div>
  )
}
