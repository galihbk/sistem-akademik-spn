import { useEffect, useMemo, useState } from "react";
import {
  fetchSiswaDetailByNik,
  fetchSiswaTabByNik,
  fetchMentalRankByNik,
} from "../api/siswa";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

const TABS = [
  { key: "biodata", label: "Biodata" },
  { key: "sosiometri", label: "Sosiometri" },
  { key: "mental", label: "Mental Kepribadian" },
  { key: "bk", label: "BK" },
  { key: "pelanggaran", label: "Pelanggaran" },
  { key: "mapel", label: "Mapel" },
  { key: "prestasi", label: "Prestasi" },
  { key: "jasmani", label: "Jasmani" },
  { key: "riwayat_kesehatan", label: "Riwayat Kesehatan" },
];

/* ---------- Utils kecil ---------- */

function toNumberOrNull(v) {
  if (v == null) return null;
  const s = String(v).trim().replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function formatDateID(v) {
  if (!v) return "-";
  try {
    const d = new Date(v);
    if (isNaN(d)) return String(v);
    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return String(v);
  }
}

function buildDownloadUrl(filePath) {
  if (!filePath) return "#";
  const clean = String(filePath)
    .replace(/^\/+/, "")
    .replace(/^uploads\//i, "");
  return `${API}/download?path=${encodeURIComponent(clean)}`;
}

async function handleDownload(filePath) {
  const url = buildDownloadUrl(filePath);
  try {
    const head = await fetch(url, { method: "HEAD" });
    if (!head.ok) {
      alert("Tidak ada data / file tidak ditemukan.");
      return;
    }
  } catch (e) {
    alert("Gagal memeriksa file: " + (e?.message || "unknown"));
    return;
  }

  if (window.electronAPI?.download) {
    window.electronAPI.download(url);
  } else {
    const a = document.createElement("a");
    a.href = url;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}

/* ---------- Komponen kecil ---------- */

function SummaryItem({ label, children }) {
  return (
    <div
      style={{
        border: "1px solid #1f2937",
        background: "#0f1424",
        borderRadius: 10,
        padding: "10px 12px",
      }}
    >
      <div className="muted" style={{ fontSize: 12 }}>
        {label}
      </div>
      <div style={{ fontWeight: 800, fontSize: 18 }}>{children}</div>
    </div>
  );
}

function RankItem({ label, pos, total }) {
  const show = pos != null && total != null && total > 0;
  return (
    <div
      style={{
        border: "1px solid #1f2937",
        background: "#0f1424",
        borderRadius: 10,
        padding: "10px 12px",
      }}
    >
      <div className="muted" style={{ fontSize: 12 }}>
        {label}
      </div>
      <div style={{ fontWeight: 800, fontSize: 18 }}>
        {show ? `#${pos} dari ${total}` : "-"}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div className="muted" style={{ fontSize: 12 }}>
        {label}
      </div>
      <div>{children || "-"}</div>
    </div>
  );
}

function renderValue(key, val) {
  if (!val) return "-";

  if (key === "foto") {
    const src = String(val);
    return (
      <img
        src={src}
        alt="Foto siswa"
        style={{
          width: 180,
          height: 220,
          objectFit: "cover",
          borderRadius: 8,
          border: "1px solid #1f2937",
        }}
        onError={(e) => {
          e.currentTarget.src =
            "data:image/svg+xml;utf8," +
            encodeURIComponent(
              `<svg xmlns='http://www.w3.org/2000/svg' width='180' height='220'><rect width='100%' height='100%' fill='#0b1220'/><text x='50%' y='50%' fill='#64748b' dominant-baseline='middle' text-anchor='middle' font-family='monospace' font-size='12'>No Photo</text></svg>`
            );
        }}
      />
    );
  }

  if (key === "file_ktp") {
    const href = String(val);
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        style={{ color: "#60a5fa" }}
      >
        Lihat KTP
      </a>
    );
  }

  if ((key === "created_at" || key === "updated_at") && val) {
    try {
      const d = new Date(val);
      return d.toLocaleString("id-ID");
    } catch {
      return String(val);
    }
  }

  return String(val);
}

function DataTable({ rows }) {
  const headers = useMemo(
    () => (rows?.[0] ? Object.keys(rows[0]) : []),
    [rows]
  );
  if (!rows?.length)
    return <div style={{ color: "#94a3b8" }}>Belum ada data.</div>;
  return (
    <div style={{ overflowX: "auto" }}>
      <table className="table">
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h} style={{ whiteSpace: "nowrap" }}>
                {h.toUpperCase()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {headers.map((h) => (
                <td key={h} style={{ whiteSpace: "nowrap" }}>
                  {r[h] ?? "-"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- Mental ---------- */

function MentalTable({ rows, rank }) {
  const norm = useMemo(() => {
    if (!Array.isArray(rows)) return [];
    return rows
      .map((r) => {
        const minggu =
          r.minggu_ke ?? r.minggu ?? r.week ?? r.mingguKe ?? r.week_no;
        const nilaiRaw =
          r.nilai ?? r.skor ?? r.value ?? r.score ?? r.penilaian ?? null;
        const catatan = r.catatan ?? r.note ?? r.keterangan ?? null;
        const ts =
          r.updated_at ?? r.updatedAt ?? r.created_at ?? r.tanggal ?? null;

        const mk =
          typeof minggu === "number"
            ? minggu
            : /^\d+$/.test(String(minggu || "").trim())
            ? parseInt(String(minggu).trim(), 10)
            : minggu ?? null;

        const nilai = nilaiRaw == null ? null : String(nilaiRaw);
        const nilaiNum = toNumberOrNull(nilai);

        return {
          minggu_ke: mk,
          nilai,
          nilaiNum,
          catatan: catatan == null ? null : String(catatan),
          time: ts ? new Date(ts) : null,
        };
      })
      .sort((a, b) => {
        const A = typeof a.minggu_ke === "number" ? a.minggu_ke : 1e9;
        const B = typeof b.minggu_ke === "number" ? b.minggu_ke : 1e9;
        if (A !== B) return A - B;
        if (a.time && b.time) return b.time - a.time;
        return 0;
      });
  }, [rows]);

  const summary = useMemo(() => {
    const nums = norm.map((r) => r.nilaiNum).filter((n) => n != null);
    if (!nums.length) {
      return { count: 0, avg: null, min: null, max: null };
    }
    const sum = nums.reduce((a, b) => a + b, 0);
    const avg = sum / nums.length;
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    return { count: nums.length, avg, min, max };
  }, [norm]);

  if (!norm.length) {
    return <div style={{ color: "#94a3b8" }}>Belum ada nilai mental.</div>;
  }

  return (
    <>
      <div
        className="card"
        style={{
          marginBottom: 12,
          display: "grid",
          gap: 10,
          border: "1px solid #1f2937",
          background: "#0b1220",
          borderRadius: 12,
          padding: 12,
        }}
      >
        <div style={{ fontWeight: 800 }}>
          Ringkasan Nilai Mental
          {rank?.angkatan ? (
            <span className="muted" style={{ marginLeft: 8, fontWeight: 400 }}>
              · Ranking Angkatan <b>{rank.angkatan}</b>
            </span>
          ) : null}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0,1fr))",
            gap: 12,
          }}
        >
          <SummaryItem label="Jumlah Data">
            {summary.count.toString()}
          </SummaryItem>
          <SummaryItem label="Rata-rata">
            {summary.avg == null ? "-" : summary.avg.toFixed(2)}
          </SummaryItem>
          <SummaryItem label="Nilai Minimum">
            {summary.min == null ? "-" : summary.min}
          </SummaryItem>
          <SummaryItem label="Nilai Maksimum">
            {summary.max == null ? "-" : summary.max}
          </SummaryItem>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0,1fr))",
            gap: 12,
          }}
        >
          <RankItem
            label="Global"
            pos={rank?.rank?.global?.pos}
            total={rank?.rank?.global?.total}
          />
          <RankItem
            label={`Batalion${rank?.batalion ? ` ${rank.batalion}` : ""}`}
            pos={rank?.rank?.batalion?.pos}
            total={rank?.rank?.batalion?.total}
          />
          <RankItem
            label={`Kompi${rank?.kompi ? ` ${rank.kompi}` : ""}`}
            pos={rank?.rank?.kompi?.pos}
            total={rank?.rank?.kompi?.total}
          />
          <RankItem
            label={
              rank?.kompi && rank?.pleton != null
                ? `Pleton ${rank.kompi}${rank.pleton}`
                : "Pleton"
            }
            pos={rank?.rank?.pleton?.pos}
            total={rank?.rank?.pleton?.total}
          />
        </div>

        <div className="muted" style={{ fontSize: 12 }}>
          Hanya nilai numeric (mis. <code>78</code>, <code>80,5</code>→80.5)
          yang dihitung. Ranking dibatasi per angkatan.
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="table" style={{ width: "100%" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", whiteSpace: "nowrap" }}>
                Minggu
              </th>
              <th style={{ textAlign: "left", whiteSpace: "nowrap" }}>Nilai</th>
              <th style={{ textAlign: "left", whiteSpace: "nowrap" }}>
                Catatan
              </th>
              <th style={{ textAlign: "left", whiteSpace: "nowrap" }}>
                Diubah
              </th>
            </tr>
          </thead>
          <tbody>
            {norm.map((r, i) => (
              <tr key={i}>
                <td style={{ whiteSpace: "nowrap" }}>
                  {typeof r.minggu_ke === "number"
                    ? `Minggu ${r.minggu_ke}`
                    : r.minggu_ke ?? "-"}
                </td>
                <td style={{ whiteSpace: "nowrap" }}>{r.nilai ?? "-"}</td>
                <td style={{ maxWidth: 600, overflowWrap: "anywhere" }}>
                  {r.catatan ?? "-"}
                </td>
                <td style={{ whiteSpace: "nowrap" }}>
                  {r.time ? r.time.toLocaleString("id-ID") : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ---------- Dokumen (BK, Pelanggaran, Prestasi, Riwayat Kesehatan) ---------- */

function DownloadNotice({ message, percent }) {
  if (!message && percent == null) return null;
  return (
    <div
      className="card"
      style={{
        marginBottom: 8,
        whiteSpace: "pre-line",
        border: "1px solid #1f2937",
        background: "#0f1424",
        color: "#e2e8f0",
        borderRadius: 10,
        padding: "10px 12px",
      }}
    >
      {message}
      {percent != null && (
        <div style={{ marginTop: 6 }}>
          Progres: {percent}%
          <div
            style={{
              height: 6,
              background: "#1f2937",
              borderRadius: 4,
              marginTop: 4,
            }}
          >
            <div
              style={{
                width: `${Math.max(0, Math.min(100, percent))}%`,
                height: 6,
                background: "#60a5fa",
                borderRadius: 4,
                transition: "width .2s linear",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/** Tabel generik untuk semua tab dokumen */
function DocTable({ rows, onDelete }) {
  if (!rows?.length)
    return <div style={{ color: "#94a3b8" }}>Belum ada data.</div>;

  return (
    <div style={{ overflowX: "auto" }}>
      <table className="table" style={{ width: "100%" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", whiteSpace: "nowrap" }}>Judul</th>
            <th style={{ textAlign: "left", whiteSpace: "nowrap" }}>Tanggal</th>
            <th style={{ textAlign: "left", whiteSpace: "nowrap" }}>File</th>
            <th style={{ textAlign: "left", whiteSpace: "nowrap" }}>Dibuat</th>
            <th style={{ textAlign: "left", whiteSpace: "nowrap" }}>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td style={{ whiteSpace: "nowrap" }}>{r.judul ?? "-"}</td>
              <td style={{ whiteSpace: "nowrap" }}>
                {formatDateID(r.tanggal)}
              </td>
              <td style={{ whiteSpace: "nowrap" }}>
                {r.file_path ? (
                  <button
                    className="btn"
                    onClick={() => handleDownload(r.file_path)}
                    style={{ padding: "6px 10px" }}
                    title="Download"
                  >
                    Download
                  </button>
                ) : (
                  "-"
                )}
              </td>
              <td style={{ whiteSpace: "nowrap" }}>
                {formatDateID(r.created_at)}
              </td>
              <td style={{ whiteSpace: "nowrap" }}>
                <button
                  className="btn"
                  style={{
                    background: "#1b0c0c",
                    border: "1px solid #7f1d1d",
                    color: "#fca5a5",
                    padding: "6px 10px",
                  }}
                  onClick={() => onDelete?.(r)}
                  title="Hapus"
                >
                  Hapus
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
        Download selalu mengunduh file tanpa menampilkan preview.
      </div>
    </div>
  );
}

/* ---------- Biodata grouping ---------- */

const GROUPS = [
  {
    title: "Foto & Identitas",
    cols: 3,
    fields: [
      ["foto", "Foto"],
      ["nama", "Nama"],
      ["nosis", "NOSIS"],
      ["nik", "NIK"],
      ["batalion", "Batalion"],
      ["ton", "Ton"],
      ["jenis_kelamin", "Jenis Kelamin"],
      ["agama", "Agama"],
      ["jenis_rekrutmen", "Jenis Rekrutmen"],
    ],
  },
  {
    title: "Alamat & Kontak",
    cols: 2,
    fields: [
      ["alamat", "Alamat"],
      ["email", "Email"],
      ["no_hp", "No HP"],
      ["no_hp_keluarga", "No HP Keluarga"],
      ["file_ktp", "File KTP"],
    ],
  },
  {
    title: "Kelahiran",
    cols: 3,
    fields: [
      ["tempat_lahir", "Tempat Lahir"],
      ["tanggal_lahir", "Tanggal Lahir"],
      ["umur", "Umur"],
    ],
  },
  {
    title: "Pendidikan",
    cols: 3,
    fields: [
      ["dikum_akhir", "Pendidikan Terakhir"],
      ["jurusan", "Jurusan"],
    ],
  },
  {
    title: "Fisik & Kesehatan",
    cols: 4,
    fields: [
      ["tb", "Tinggi Badan"],
      ["bb", "Berat Badan"],
      ["gol_darah", "Gol. Darah"],
      ["no_bpjs", "No BPJS"],
      ["sim_yang_dimiliki", "SIM yg Dimiliki"],
    ],
  },
  {
    title: "Keluarga",
    cols: 3,
    fields: [
      ["nama_ayah_kandung", "Nama Ayah"],
      ["pekerjaan_ayah_kandung", "Pekerjaan Ayah"],
      ["nama_ibu_kandung", "Nama Ibu"],
      ["pekerjaan_ibu_kandung", "Pekerjaan Ibu"],
    ],
  },
  {
    title: "Asal & Angkatan",
    cols: 3,
    fields: [
      ["asal_polda", "Asal Polda"],
      ["asal_polres", "Asal Polres"],
      ["kelompok_angkatan", "Kelompok Angkatan"],
      ["diktuk_awal", "Diktuk Awal"],
      ["tahun_diktuk", "Tahun Diktuk"],
    ],
  },
  {
    title: "Ukuran",
    cols: 4,
    fields: [
      ["ukuran_pakaian", "Ukuran Pakaian"],
      ["ukuran_celana", "Ukuran Celana"],
      ["ukuran_sepatu", "Ukuran Sepatu"],
      ["ukuran_tutup_kepala", "Ukuran Tutup Kepala"],
    ],
  },
  {
    title: "Administrasi",
    cols: 2,
    fields: [
      ["created_at", "Dibuat"],
      ["updated_at", "Diubah"],
    ],
  },
];

function SectionCard({ title, cols = 3, biodata }) {
  const group = GROUPS.find((g) => g.title === title);
  if (!group) return null;
  return (
    <div
      className="card"
      style={{ background: "#0b1220", border: "1px solid #1f2937" }}
    >
      <div style={{ fontWeight: 700, marginBottom: 8 }}>{title}</div>
      <div
        className="grid"
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`,
        }}
      >
        {group.fields.map(([key, label]) => (
          <Field key={key} label={label}>
            {renderValue(key, biodata?.[key])}
          </Field>
        ))}
      </div>
    </div>
  );
}

/* ---------- Halaman utama ---------- */

export default function SiswaDetail({ nik }) {
  const safeNik = useMemo(() => String(nik ?? "").trim(), [nik]);
  const [active, setActive] = useState("biodata");
  const [biodata, setBiodata] = useState(null);
  const [dataMap, setDataMap] = useState({});
  const [mentalRank, setMentalRank] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  // notifikasi download/export global
  const [dlMsg, setDlMsg] = useState("");
  const [dlPct, setDlPct] = useState(null);

  useEffect(() => {
    if (!window.electronAPI?.onDownloadStatus) return;
    const off = window.electronAPI.onDownloadStatus((p) => {
      const label = p.isExport ? "Export" : "Download";
      if (p.state === "started") {
        setDlPct(0);
        setDlMsg(`${label} "${p.filename}" → ${p.path}`);
      } else if (p.state === "progress") {
        setDlPct(p.percent ?? null);
      } else if (p.state === "completed") {
        setDlPct(100);
        setDlMsg(`✅ ${label} selesai: "${p.filename}" disimpan di\n${p.path}`);
        setTimeout(() => {
          setDlMsg("");
          setDlPct(null);
        }, 6000);
      } else if (p.state === "failed") {
        setDlPct(null);
        setDlMsg(`❌ ${label} gagal: ${p.error || "unknown"}`);
      }
    });
    return () => off && off();
  }, []);

  // load biodata
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setErr("");
        setBiodata(null);
        if (!safeNik) return;
        const token = await window.authAPI?.getToken?.();
        const detail = await fetchSiswaDetailByNik(safeNik, token);
        if (alive) setBiodata(detail);
      } catch (e) {
        if (alive) setErr(e.message || "Error");
      }
    })();
    return () => {
      alive = false;
    };
  }, [safeNik]);

  async function loadTab(tabKey) {
    if (
      tabKey === "biodata" ||
      Object.prototype.hasOwnProperty.call(dataMap, tabKey) ||
      !safeNik
    )
      return;
    try {
      setLoading(true);
      setErr("");
      const token = await window.authAPI?.getToken?.();
      const json = await fetchSiswaTabByNik(safeNik, tabKey, token);
      const rows = Array.isArray(json) ? json : json.items || [];
      setDataMap((m) => ({ ...m, [tabKey]: rows }));
      if (tabKey === "mental") {
        try {
          const rank = await fetchMentalRankByNik(safeNik, token);
          setMentalRank(rank);
        } catch (e) {
          console.warn("[mental rank] fetch error:", e.message);
          setMentalRank(null);
        }
      }
    } catch (e) {
      setErr(e.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  function onTabClick(k) {
    setActive(k);
    loadTab(k);
  }

  function back() {
    window.location.hash = "#/siswa";
  }

  // hapus BK
  async function handleDeleteBK(item) {
    if (!item?.id) return;
    const ok = window.confirm(`Hapus BK: "${item.judul}"?`);
    if (!ok) return;
    try {
      setDeletingId(item.id);
      const token = await window.authAPI?.getToken?.();
      const res = await fetch(`${API}/bk/${item.id}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || `Gagal menghapus (HTTP ${res.status})`);
      }
      setDataMap((m) => ({
        ...m,
        bk: (m.bk || []).filter((x) => x.id !== item.id),
      }));
    } catch (e) {
      alert(e.message || "Gagal menghapus");
    } finally {
      setDeletingId(null);
    }
  }

  // hapus Pelanggaran
  async function handleDeletePelanggaran(item) {
    if (!item?.id) return;
    const ok = window.confirm(`Hapus Pelanggaran: "${item.judul}"?`);
    if (!ok) return;
    try {
      setDeletingId(item.id);
      const token = await window.authAPI?.getToken?.();
      const res = await fetch(`${API}/pelanggaran/${item.id}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || `Gagal menghapus (HTTP ${res.status})`);
      }
      setDataMap((m) => ({
        ...m,
        pelanggaran: (m.pelanggaran || []).filter((x) => x.id !== item.id),
      }));
    } catch (e) {
      alert(e.message || "Gagal menghapus");
    } finally {
      setDeletingId(null);
    }
  }

  // hapus Prestasi
  async function handleDeletePrestasi(item) {
    if (!item?.id) return;
    const ok = window.confirm(`Hapus Prestasi: "${item.judul}"?`);
    if (!ok) return;
    try {
      setDeletingId(item.id);
      const token = await window.authAPI?.getToken?.();
      const res = await fetch(`${API}/prestasi/${item.id}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || `Gagal menghapus (HTTP ${res.status})`);
      }
      setDataMap((m) => ({
        ...m,
        prestasi: (m.prestasi || []).filter((x) => x.id !== item.id),
      }));
    } catch (e) {
      alert(e.message || "Gagal menghapus");
    } finally {
      setDeletingId(null);
    }
  }

  // hapus Riwayat Kesehatan
  async function handleDeleteRikes(item) {
    if (!item?.id) return;
    const ok = window.confirm(`Hapus Riwayat Kesehatan: "${item.judul}"?`);
    if (!ok) return;
    try {
      setDeletingId(item.id);
      const token = await window.authAPI?.getToken?.();
      const res = await fetch(`${API}/riwayat_kesehatan/${item.id}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || `Gagal menghapus (HTTP ${res.status})`);
      }
      setDataMap((m) => ({
        ...m,
        riwayat_kesehatan: (m.riwayat_kesehatan || []).filter(
          (x) => x.id !== item.id
        ),
      }));
    } catch (e) {
      alert(e.message || "Gagal menghapus");
    } finally {
      setDeletingId(null);
    }
  }

  function renderActiveTab() {
    if (active === "biodata") {
      if (!safeNik) return <div className="muted">NIK belum tersedia.</div>;
      if (!biodata)
        return <div style={{ color: "#94a3b8" }}>Memuat biodata...</div>;
      return (
        <div style={{ display: "grid", gap: 16 }}>
          {GROUPS.map((g) => (
            <SectionCard
              key={g.title}
              title={g.title}
              cols={g.cols}
              biodata={biodata}
            />
          ))}
        </div>
      );
    }

    if (loading) {
      return (
        <div style={{ color: "#94a3b8" }}>
          Memuat data {TABS.find((t) => t.key === active)?.label || active}...
        </div>
      );
    }

    if (active === "mental") {
      return <MentalTable rows={dataMap["mental"] || []} rank={mentalRank} />;
    }

    if (active === "bk") {
      return (
        <>
          {deletingId && (
            <div className="muted" style={{ marginBottom: 8 }}>
              Menghapus item #{deletingId}...
            </div>
          )}
          <DocTable rows={dataMap["bk"] || []} onDelete={handleDeleteBK} />
        </>
      );
    }

    if (active === "pelanggaran") {
      return (
        <>
          {deletingId && (
            <div className="muted" style={{ marginBottom: 8 }}>
              Menghapus item #{deletingId}...
            </div>
          )}
          <DocTable
            rows={dataMap["pelanggaran"] || []}
            onDelete={handleDeletePelanggaran}
          />
        </>
      );
    }

    if (active === "prestasi") {
      return (
        <>
          {deletingId && (
            <div className="muted" style={{ marginBottom: 8 }}>
              Menghapus item #{deletingId}...
            </div>
          )}
          <DocTable
            rows={dataMap["prestasi"] || []}
            onDelete={handleDeletePrestasi}
          />
        </>
      );
    }

    if (active === "riwayat_kesehatan") {
      return (
        <>
          {deletingId && (
            <div className="muted" style={{ marginBottom: 8 }}>
              Menghapus item #{deletingId}...
            </div>
          )}
          <DocTable
            rows={dataMap["riwayat_kesehatan"] || []}
            onDelete={handleDeleteRikes}
          />
        </>
      );
    }

    return <DataTable rows={dataMap[active] || []} />;
  }

  function startExport() {
    if (!biodata?.nik) {
      alert("NIK tidak tersedia.");
      return;
    }
    const url = `${API}/export/all?nik=${encodeURIComponent(biodata.nik)}`;

    // Cek ketersediaan endpoint (HEAD), baru download
    fetch(url, { method: "HEAD" })
      .then((r) => {
        if (!r.ok) throw new Error("Export tidak tersedia");
        if (window.electronAPI?.download) {
          window.electronAPI.download(url);
        } else {
          const a = document.createElement("a");
          a.href = url;
          a.download = "";
          document.body.appendChild(a);
          a.click();
          a.remove();
        }
      })
      .catch((e) => alert(e.message || "Gagal memulai export"));
  }

  return (
    <div className="grid">
      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>Detail Siswa</div>
            <div style={{ color: "#94a3b8" }}>
              NOSIS: <code>{biodata?.nosis || "-"}</code>
              <span style={{ marginLeft: 12, color: "#64748b" }}>
                (NIK: <code>{safeNik || "-"}</code>)
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" onClick={startExport}>
              Export PDF
            </button>
            <button className="btn" onClick={back}>
              Kembali
            </button>
          </div>
        </div>
        {err && <div style={{ marginTop: 8, color: "#fca5a5" }}>⚠ {err}</div>}
      </div>

      <div className="card">
        {/* Banner progres download/export: tampil di semua tab */}
        <DownloadNotice message={dlMsg} percent={dlPct} />

        <div className="tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`tab ${active === t.key ? "active" : ""}`}
              onClick={() => onTabClick(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 12 }}>{renderActiveTab()}</div>
      </div>
    </div>
  );
}
