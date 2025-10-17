const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export async function getSummary(token, angkatan, jenis) {
  const u = new URL(`${API}/stats/summary`);
  if (angkatan) u.searchParams.set("angkatan", angkatan);
  if (jenis) u.searchParams.set("jenis", jenis);
  const res = await fetch(u.toString(), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(await res.text().catch(() => "Gagal fetch"));
  return res.json();
}

export async function getRecentActivity(token, angkatan, jenis) {
  const u = new URL(`${API}/stats/recent`);
  if (angkatan) u.searchParams.set("angkatan", angkatan);
  if (jenis) u.searchParams.set("jenis", jenis);
  const res = await fetch(u.toString(), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(await res.text().catch(() => "Gagal fetch"));
  return res.json();
}
