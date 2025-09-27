const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export async function getSummary(token){
  const res = await fetch(`${API}/stats/summary`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if(!res.ok) throw new Error('Gagal mengambil ringkasan');
  return res.json();
}

export async function getRecentActivity(token){
  const res = await fetch(`${API}/stats/recent`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if(!res.ok) throw new Error('Gagal mengambil aktivitas');
  return res.json();
}
