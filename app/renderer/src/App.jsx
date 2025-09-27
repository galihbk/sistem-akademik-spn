import { useEffect, useMemo, useState } from 'react'
import { login } from './api/auth'
import useAuth from './hooks/useAuth'
import Shell from './layouts/Shell'

import Dashboard from './pages/Dashboard'
import Siswa from './pages/Siswa'
import SiswaDetail from './pages/SiswaDetail'

// Import/Upload/Input pages (sesuai flow)
import ImportIndex from './pages/ImportIndex'
import ImportSiswa from './pages/ImportSiswa'
import ImportSosiometri from './pages/ImportSosiometri'
import ImportMental from './pages/ImportMental'
import ImportMapel from './pages/ImportMapel'
import ImportJasmani from './pages/ImportJasmani'
import UploadPdf from './pages/UploadPdf'
import InputPrestasi from './pages/InputPrestasi'
import InputRiwayatKesehatan from './pages/InputRiwayatKesehatan'

import Settings from './pages/Settings'

function Login({ onSuccess }){
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onSubmit = async (e)=>{
    e.preventDefault(); setError(''); setLoading(true)
    try{
      const data = await login(username.trim(), password)
      await window.authAPI.setToken(data.token)
      onSuccess()
    }catch(err){ setError(err.message||'Login gagal') }
    finally{ setLoading(false) }
  }

  return (
    <div style={{display:'grid', placeItems:'center', minHeight:'100vh', background:'#0f172a'}}>
      <form onSubmit={onSubmit} className="card" style={{width:440, background:'#fff', color:'#0b1220'}}>
        <h1 style={{marginBottom:8, lineHeight:1.2}}>SISTEM AKADEMIK<br/>Admin Login</h1>
        <p style={{marginTop:0, color:'#475569'}}>Masuk sebagai Admin untuk melanjutkan.</p>
        <label style={{display:'block', marginTop:12}}>Username</label>
        <input className="input" value={username} onChange={e=>setUsername(e.target.value)} required placeholder="admin" />
        <label style={{display:'block', marginTop:12}}>Password</label>
        <input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} required placeholder="••••••••" />
        {error && <div style={{marginTop:12, color:'#dc2626'}}>{error}</div>}
        <button disabled={loading} type="submit" className="btn" style={{marginTop:16}}>
          {loading? 'Memproses…':'Masuk'}
        </button>
      </form>
    </div>
  )
}

function parseHash(){
  const raw = (window.location.hash || '#/dashboard').replace(/^#\/?/, '')
  const seg = raw.split('/').filter(Boolean)

  if (seg.length === 0) return { name: 'dashboard' }

  // siswa & detail
  if (seg[0] === 'siswa' && !seg[1]) return { name: 'siswa' }
  if (seg[0] === 'siswa' && seg[1])  return { name: 'siswaDetail', params: { nosis: seg[1] } }

  // import index & masing-masing jenis (excel)
  if (seg[0] === 'import' && !seg[1])              return { name:'importIndex' }
  if (seg[0] === 'import' && seg[1] === 'siswa')   return { name:'importSiswa' }
  if (seg[0] === 'import' && seg[1] === 'sosiometri') return { name:'importSosiometri' }
  if (seg[0] === 'import' && seg[1] === 'mental')  return { name:'importMental' }
  if (seg[0] === 'import' && seg[1] === 'mapel')   return { name:'importMapel' }
  if (seg[0] === 'import' && seg[1] === 'jasmani') return { name:'importJasmani' }

  // upload PDF
  if (seg[0] === 'upload' && seg[1] === 'bk')          return { name:'uploadBK' }
  if (seg[0] === 'upload' && seg[1] === 'pelanggaran') return { name:'uploadPelanggaran' }

  // input manual (form)
  if (seg[0] === 'input' && seg[1] === 'prestasi')           return { name:'inputPrestasi' }
  if (seg[0] === 'input' && seg[1] === 'riwayat-kesehatan')  return { name:'inputRiwayatKesehatan' }

  // halaman sederhana lain
  if (['dashboard','settings'].includes(seg[0])) return { name: seg[0] }

  return { name:'notfound' }
}

export default function App(){
  const { ready, authed, setAuthed, logout } = useAuth()
  const [route, setRoute] = useState(parseHash())

  useEffect(()=>{
    const onHash=()=> setRoute(parseHash())
    window.addEventListener('hashchange', onHash)
    return ()=> window.removeEventListener('hashchange', onHash)
  },[])

  const nav = useMemo(()=>([
    {key:'dashboard', label:'Dashboard', href:'#/dashboard'},
    {key:'siswa',     label:'Siswa',     href:'#/siswa'},
    {key:'import',    label:'Import',    href:'#/import'}, // ini buka ImportIndex
    {key:'settings',  label:'Settings',  href:'#/settings'},
  ]),[])

  if(!ready) return null
  if(!authed) return <Login onSuccess={()=>setAuthed(true)} />

let content = null, title = 'SISTEM AKADEMIK', active = 'dashboard';

if (route.name === 'dashboard') {
  title = 'Dashboard'; active = 'dashboard'; content = <Dashboard />;
} else if (route.name === 'siswa') {
  title = 'Siswa'; active = 'siswa'; content = <Siswa />;
} else if (route.name === 'siswaDetail') {
  title = 'Detail Siswa'; active = 'siswa'; content = <SiswaDetail nosis={route.params.nosis} />;

} else if (route.name === 'importIndex') {
  title = 'Import & Upload'; active = 'import'; content = <ImportIndex />;
} else if (route.name === 'importSiswa') {
  title = 'Import Data Siswa'; active = 'import'; content = <ImportSiswa />;
} else if (route.name === 'importSosiometri') {
  title = 'Import Sosiometri'; active = 'import'; content = <ImportSosiometri />;
} else if (route.name === 'importMental') {
  title = 'Import Mental'; active = 'import'; content = <ImportMental />;
} else if (route.name === 'importMapel') {
  title = 'Import Mapel'; active = 'import'; content = <ImportMapel />;
} else if (route.name === 'importJasmani') {
  title = 'Import Jasmani'; active = 'import'; content = <ImportJasmani />;

} else if (route.name === 'uploadBK') {
  title = 'Upload BK (PDF)'; active = 'import'; content = <UploadPdf kind="bk" />;
} else if (route.name === 'uploadPelanggaran') {
  title = 'Upload Pelanggaran (PDF)'; active = 'import'; content = <UploadPdf kind="pelanggaran" />;

} else if (route.name === 'inputPrestasi') {
  title = 'Input Prestasi'; active = 'import'; content = <InputPrestasi />;
} else if (route.name === 'inputRiwayatKesehatan') {
  title = 'Input Riwayat Kesehatan'; active = 'import'; content = <InputRiwayatKesehatan />;

} else if (route.name === 'settings') {
  title = 'Settings'; active = 'settings'; content = <Settings />;
} else {
  title = 'Not Found'; active = ''; content = <div className="card">Halaman tidak ditemukan.</div>;
}


  return (
    <Shell title={title} onLogout={logout} nav={nav} active={active}>
      {content}
    </Shell>
  )
}
