const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export async function fetchSiswa({ q = "", page = 1, limit = 20 }, token) {
  const url = new URL(`${API}/siswa`);
  if (q) url.searchParams.set("q", q);
  url.searchParams.set("page", String(page));
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Gagal mengambil siswa");
  console.log(res.json());
  return res.json(); // {items,total,page,limit,pages}
}

// services/api.js
export async function fetchSiswaDetailByNik(nik, token = "") {
  const val = String(nik ?? "").trim();
  if (!val) throw new Error("NIK kosong"); // <-- guard
  const res = await fetch(`${API}/siswa/nik/${encodeURIComponent(val)}`, {
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`Gagal ambil detail (${res.status})`);
  return res.json();
}

export async function fetchSiswaTabByNik(nik, tab, token = "") {
  const val = String(nik ?? "").trim();
  if (!val) throw new Error("NIK kosong");
  const res = await fetch(
    `${API}/siswa/nik/${encodeURIComponent(val)}/${tab}`,
    {
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  );
  if (!res.ok) throw new Error(`Gagal ambil ${tab} (${res.status})`);
  return res.json(); // boleh array atau {items:[]}
}
