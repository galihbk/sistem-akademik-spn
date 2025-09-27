const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export async function listSheets(file, token){
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(`${API}/import/siswa?dryRun=true&listSheets=true`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd
  });
  if(!res.ok) throw new Error((await res.json().catch(()=>({message:'Gagal ambil sheet'}))).message);
  return res.json(); // { sheets: [...] }
}

export async function dryRunImport(file, sheet, token){
  const fd = new FormData();
  fd.append('file', file);
  const url = new URL(`${API}/import/siswa`);
  url.searchParams.set('dryRun','true');
  if (sheet) url.searchParams.set('sheet', sheet);
  const res = await fetch(url, { method:'POST', headers:{ Authorization:`Bearer ${token}` }, body: fd });
  if(!res.ok) throw new Error((await res.json().catch(()=>({message:'Dry-run gagal'}))).message);
  return res.json(); // summary + headerDetected + headerRow
}

export async function importSiswaExcel(file, sheet, token){
  const fd = new FormData();
  fd.append('file', file);
  const url = new URL(`${API}/import/siswa`);
  if (sheet) url.searchParams.set('sheet', sheet);
  const res = await fetch(url, { method:'POST', headers:{ Authorization:`Bearer ${token}` }, body: fd });
  if(!res.ok) throw new Error((await res.json().catch(()=>({message:'Import failed'}))).message);
  return res.json(); // summary
}
