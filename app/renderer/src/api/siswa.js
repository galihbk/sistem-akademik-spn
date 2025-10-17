// renderer/src/api/siswa.js
export const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export async function fetchSiswa({ q = "", page = 1, limit = 20 }, token = "") {
  const url = new URL(`${API}/siswa`);
  if (q) url.searchParams.set("q", q);
  url.searchParams.set("page", String(page));
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`Gagal mengambil siswa (${res.status})`);
  return res.json(); // { items, total, page, limit, pages? }
}

export async function fetchSiswaDetailByNik(nik, token = "") {
  const val = String(nik ?? "").trim();
  if (!val) throw new Error("NIK kosong");
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
  const key = String(tab || "").trim();
  if (!val) throw new Error("NIK kosong");
  if (!key) throw new Error("Tab kosong");

  // endpoint mengikuti routes, backend jasmani = jasmani_spn sudah di-handle di controller
  const res = await fetch(
    `${API}/siswa/nik/${encodeURIComponent(val)}/${encodeURIComponent(key)}`,
    {
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  );
  if (!res.ok) throw new Error(`Gagal ambil ${key} (${res.status})`);
  return res.json();
}

export async function fetchMentalRankByNik(nik, token = "") {
  const val = String(nik ?? "").trim();
  if (!val) throw new Error("NIK kosong");
  const res = await fetch(
    `${API}/siswa/nik/${encodeURIComponent(val)}/mental/rank`,
    {
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  );
  if (!res.ok)
    throw new Error(await res.text().catch(() => `HTTP ${res.status}`));
  return res.json();
}

export async function headExportAllByNik(nik, token = "") {
  const val = String(nik ?? "").trim();
  if (!val) return false;
  try {
    const res = await fetch(
      `${API}/export/all?nik=${encodeURIComponent(val)}`,
      {
        method: "HEAD",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}
