const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export async function fetchSiswa({ q = '', page = 1, limit = 20 }, token) {
  const url = new URL(`${API}/siswa`);
  if (q) url.searchParams.set('q', q);
  url.searchParams.set('page', String(page));
  url.searchParams.set('limit', String(limit));

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Gagal mengambil siswa');
  return res.json(); // {items,total,page,limit,pages}
}

export async function fetchSiswaDetail(id, token) {
  const res = await fetch(`${API}/siswa/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Gagal mengambil detail');
  return res.json();
}
