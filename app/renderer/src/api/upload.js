// src/api/upload.js
const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

/**
 * Upload PDF (BK / Pelanggaran)
 * @param {"bk"|"pelanggaran"} kind
 * @param {{ siswa_id: number|string, judul: string, tanggal?: string, file: File }} payload
 * @param {string} token
 * @returns {Promise<any>} response json dari server
 */
export async function uploadPdf(
  kind,
  { siswa_id, judul, tanggal, file },
  token = ""
) {
  if (kind !== "bk" && kind !== "pelanggaran") {
    throw new Error('kind harus "bk" atau "pelanggaran"');
  }
  const sid = String(siswa_id ?? "").trim();
  if (!sid) throw new Error("siswa_id wajib diisi (pilih dari autocomplete).");
  if (!judul || !judul.trim()) throw new Error("Judul wajib diisi.");
  if (!file) throw new Error("File wajib diisi.");
  if (file.type && file.type !== "application/pdf") {
    // beberapa browser mungkin tidak mengisi type, jadi cek hanya jika ada
    throw new Error("File harus PDF.");
  }

  const form = new FormData();
  form.append("siswa_id", sid);
  form.append("judul", judul.trim());
  if (tanggal) form.append("tanggal", tanggal);
  form.append("file", file);

  const res = await fetch(`${API}/upload/${kind}`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      // jangan set Content-Type saat kirim FormData
      Accept: "application/json",
    },
    body: form,
  });

  if (!res.ok) {
    // ikuti pola file siswa.js kamu: lempar error sederhana
    const msg = await res.text().catch(() => "");
    throw new Error(msg || `Gagal upload ${kind} (${res.status})`);
  }

  return res.json();
}

/** Helper khusus kalau mau dipanggil lebih simpel */
export async function uploadBK(args, token = "") {
  return uploadPdf("bk", args, token);
}
export async function uploadPelanggaran(args, token = "") {
  return uploadPdf("pelanggaran", args, token);
}
