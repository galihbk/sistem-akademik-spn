export default function Shell({ title="SISTEM AKADEMIK", children, onLogout, nav, active }){
  return (
    <div style={{display:'grid', gridTemplateColumns:'240px 1fr', height:'100vh'}}>
      {/* Sidebar */}
      <aside style={{background:'#0b1220',borderRight:'1px solid #1f2937',padding:16}}>
        <div style={{fontWeight:800, fontSize:18, letterSpacing:.5, marginBottom:16}}>
          SISTEM AKADEMIK
        </div>
        <nav className="grid">
          {nav.map(item=>(
            <a key={item.key} href={item.href}
               style={{
                 padding:'10px 12px', borderRadius:10,
                 background: active===item.key ? '#0f1424' : 'transparent',
                 border: active===item.key ? '1px solid #1f2937' : '1px solid transparent',
                 color:'#cbd5e1'
               }}>
              {item.label}
            </a>
          ))}
        </nav>
        <div style={{position:'absolute', bottom:16}}>
          <button className="btn" onClick={onLogout}>Logout</button>
        </div>
      </aside>

      {/* Right */}
      <section style={{display:'grid', gridTemplateRows:'64px 1fr'}}>
        {/* Topbar */}
        <header style={{display:'flex',alignItems:'center',justifyContent:'space-between',
          padding:'0 16px', borderBottom:'1px solid #1f2937', background:'#0b1220'}}>
          <div style={{fontWeight:700}}>{title}</div>
          <span className="badge">Admin</span>
        </header>

        {/* Content */}
        <main style={{padding:16, overflow:'auto'}}>{children}</main>
      </section>
    </div>
  )
}
