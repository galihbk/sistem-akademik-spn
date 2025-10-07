import { useEffect, useMemo, useState } from "react";
import {
  fetchSiswaDetailByNik,
  fetchSiswaTabByNik,
  fetchMentalRankByNik,
} from "../api/siswa";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

const TABS = [
  { key: "biodata", label: "Biodata" },
  { key: "mental", label: "Mental Kepribadian" },
  { key: "bk", label: "BK" },
  { key: "pelanggaran", label: "Pelanggaran" },
  { key: "mapel", label: "Mapel" },
  { key: "prestasi", label: "Prestasi" },
  { key: "jasmani", label: "Jasmani" },
  { key: "riwayat_kesehatan", label: "Riwayat Kesehatan" },
  { key: "jasmani_polda", label: "Jasmani Polda" }, // paling akhir
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

function toInputDate(v) {
  if (!v) return "";
  try {
    const d = new Date(v);
    if (isNaN(d)) return "";
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  } catch {
    return "";
  }
}

function buildDownloadUrl(filePath) {
  if (!filePath) return "#";
  const clean = String(filePath)
    .replace(/^\/+/, "")
    .replace(/^uploads\//i, "");
  return `${API}/download?path=${encodeURIComponent(clean)}`;
}

// Untuk preview inline (img/video/audio)
function buildViewUrl(filePath) {
  const base = buildDownloadUrl(filePath); // /download?path=...
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}inline=1`;
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
  if (!val && val !== 0) return "-";

  if (key === "foto") {
    const raw = String(val);
    const isAbs =
      /^https?:\/\//i.test(raw) ||
      raw.startsWith("data:") ||
      raw.startsWith("blob:");
    const src = isAbs ? raw : buildViewUrl(raw); // pakai inline=1
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

/* ---------- Mental-like table (dipakai untuk Mental, Mapel, Jasmani) ---------- */

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
          Ringkasan
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

        {rank ? (
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
        ) : null}

        <div className="muted" style={{ fontSize: 12 }}>
          Hanya nilai numeric (mis. <code>78</code>, <code>80,5</code>→80.5)
          yang dihitung untuk ringkasan.
        </div>
      </div>

      {norm.length ? (
        <div style={{ overflowX: "auto" }}>
          <table className="table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", whiteSpace: "nowrap" }}>
                  Minggu
                </th>
                <th style={{ textAlign: "left", whiteSpace: "nowrap" }}>
                  Nilai
                </th>
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
      ) : (
        <div style={{ color: "#94a3b8" }}>Belum ada data.</div>
      )}
    </>
  );
}

/* ---------- DownloadNotice (banner progres) ---------- */

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

/* ---------- DocTable (BK, Pelanggaran, Prestasi, Riwayat Kesehatan) ---------- */

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

/* ---------- SectionCard editable (foto di kanan utk “Foto & Identitas”) ---------- */

function isReadOnlyKey(key) {
  return (
    key === "foto" ||
    key === "file_ktp" ||
    key === "created_at" ||
    key === "updated_at" ||
    key === "nik"
  );
}
function isDateKey(key) {
  return key === "tanggal_lahir";
}
function isSelectKey(key) {
  return key === "jenis_kelamin" || key === "agama";
}

function SectionCard({
  title,
  cols = 3,
  biodata,
  onSave,
  onEditFoto,
  busyKeys = {},
}) {
  const group = GROUPS.find((g) => g.title === title);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});

  useEffect(() => {
    if (!editing) setForm({});
  }, [editing, biodata?.nik]);

  if (!group) return null;

  const startEdit = () => {
    const init = {};
    for (const [key] of group.fields) init[key] = biodata?.[key] ?? "";
    setForm(init);
    setEditing(true);
  };
  const cancel = () => {
    setEditing(false);
    setForm({});
  };

  const save = async () => {
    try {
      setSaving(true);
      const payload = {};
      for (const [key] of group.fields) {
        if (isReadOnlyKey(key)) continue;
        const before = biodata?.[key] ?? "";
        const now = form[key];
        if (isDateKey(key)) {
          if (now !== "" && now !== before) payload[key] = now;
          else if (now === "" && before) payload[key] = null;
        } else if (now !== before) {
          payload[key] = now === "" ? null : now;
        }
      }
      if (Object.keys(payload).length === 0) {
        setEditing(false);
        return;
      }
      await onSave?.(payload);
      setEditing(false);
    } catch (e) {
      alert(e?.message || "Gagal menyimpan data");
    } finally {
      setSaving(false);
    }
  };

  function FotoCell() {
    const val = biodata?.foto;
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState("");

    const onPick = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        setUploading(true);
        setPreview(URL.createObjectURL(file));
        await onEditFoto?.(file);
      } catch (err) {
        alert(err?.message || "Gagal upload foto");
        setPreview("");
      } finally {
        setUploading(false);
      }
    };

    return (
      <div style={{ position: "relative", width: 180, justifySelf: "end" }}>
        <img
          src={
            preview ||
            (val
              ? /^(https?:|data:|blob:)/i.test(String(val))
                ? String(val)
                : buildViewUrl(val)
              : "data:image/svg+xml;utf8," +
                encodeURIComponent(
                  `<svg xmlns='http://www.w3.org/2000/svg' width='180' height='220'><rect width='100%' height='100%' fill='#0b1220'/><text x='50%' y='50%' fill='#64748b' dominant-baseline='middle' text-anchor='middle' font-family='monospace' font-size='12'>No Photo</text></svg>`
                ))
          }
          alt="Foto siswa"
          style={{
            width: 180,
            height: 220,
            objectFit: "cover",
            borderRadius: 8,
            border: "1px solid #1f2937",
            display: "block",
          }}
          onError={(e) => {
            e.currentTarget.src =
              "data:image/svg+xml;utf8," +
              encodeURIComponent(
                `<svg xmlns='http://www.w3.org/2000/svg' width='180' height='220'><rect width='100%' height='100%' fill='#0b1220'/><text x='50%' y='50%' fill='#64748b' dominant-baseline='middle' text-anchor='middle' font-family='monospace' font-size='12'>No Photo</text></svg>`
              );
          }}
        />
        <label
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            background: "#0b1220",
            border: "1px solid #1f2937",
            padding: "4px 8px",
            borderRadius: 8,
            fontSize: 12,
            cursor: uploading ? "not-allowed" : "pointer",
            opacity: uploading ? 0.6 : 1,
          }}
          title="Edit Foto"
        >
          {uploading ? "Uploading..." : "Edit Foto"}
          <input
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            disabled={uploading}
            onChange={onPick}
          />
        </label>
      </div>
    );
  }

  const isBusy = !!busyKeys[title];
  const isFotoIdentitas = title === "Foto & Identitas";

  return (
    <div
      className="card"
      style={{
        background: "#0b1220",
        border: "1px solid #1f2937",
        position: "relative",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 8,
          alignItems: "center",
        }}
      >
        <div style={{ fontWeight: 700 }}>{title}</div>
        {!editing ? (
          <button
            className="btn"
            onClick={startEdit}
            disabled={isBusy}
            style={{ padding: "6px 10px" }}
          >
            Edit
          </button>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn"
              onClick={save}
              disabled={saving}
              style={{ padding: "6px 10px" }}
            >
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
            <button
              className="btn"
              onClick={cancel}
              disabled={saving}
              style={{
                padding: "6px 10px",
                background: "#1b0c0c",
                border: "1px solid #7f1d1d",
                color: "#fca5a5",
              }}
            >
              Batal
            </button>
          </div>
        )}
      </div>

      {/* Body */}
      {isFotoIdentitas ? (
        // Foto di kanan
        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: `repeat(${Math.max(
              1,
              cols - 1
            )}, minmax(0,1fr)) 200px`,
            alignItems: "start",
            opacity: isBusy ? 0.6 : 1,
            pointerEvents: isBusy ? "none" : "auto",
          }}
        >
          {/* Kiri: semua field kecuali foto */}
          <div
            style={{
              display: "grid",
              gap: 12,
              gridTemplateColumns: `repeat(${Math.max(
                1,
                cols - 1
              )}, minmax(0,1fr))`,
            }}
          >
            {group.fields
              .filter(([key]) => key !== "foto")
              .map(([key, label]) => {
                if (!editing) {
                  return (
                    <Field key={key} label={label}>
                      {renderValue(key, biodata?.[key])}
                    </Field>
                  );
                }
                if (isDateKey(key)) {
                  return (
                    <Field key={key} label={label}>
                      <input
                        type="date"
                        value={toInputDate(form[key]) || ""}
                        disabled={isReadOnlyKey(key)}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, [key]: e.target.value }))
                        }
                        style={{ width: "100%" }}
                      />
                    </Field>
                  );
                }
                if (isSelectKey(key)) {
                  const options =
                    key === "jenis_kelamin"
                      ? ["Laki-laki", "Perempuan"]
                      : [
                          "Islam",
                          "Kristen",
                          "Katolik",
                          "Hindu",
                          "Buddha",
                          "Konghucu",
                          "Lainnya",
                        ];
                  return (
                    <Field key={key} label={label}>
                      <select
                        value={form[key] ?? ""}
                        disabled={isReadOnlyKey(key)}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, [key]: e.target.value }))
                        }
                        style={{ width: "100%" }}
                      >
                        <option value="">-</option>
                        {options.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    </Field>
                  );
                }
                return (
                  <Field key={key} label={label}>
                    <input
                      type="text"
                      value={form[key] ?? ""}
                      disabled={isReadOnlyKey(key)}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, [key]: e.target.value }))
                      }
                      style={{ width: "100%" }}
                      placeholder="-"
                    />
                  </Field>
                );
              })}
          </div>

          {/* Kanan: foto */}
          <div>
            <Field label="Foto">
              <FotoCell />
            </Field>
          </div>
        </div>
      ) : (
        // Default layout
        <div
          className="grid"
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`,
            opacity: isBusy ? 0.6 : 1,
            pointerEvents: isBusy ? "none" : "auto",
          }}
        >
          {group.fields.map(([key, label]) => {
            if (!editing) {
              return (
                <Field key={key} label={label}>
                  {renderValue(key, biodata?.[key])}
                </Field>
              );
            }
            if (isDateKey(key)) {
              return (
                <Field key={key} label={label}>
                  <input
                    type="date"
                    value={toInputDate(form[key]) || ""}
                    disabled={isReadOnlyKey(key)}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, [key]: e.target.value }))
                    }
                    style={{ width: "100%" }}
                  />
                </Field>
              );
            }
            if (isSelectKey(key)) {
              const options =
                key === "jenis_kelamin"
                  ? ["Laki-laki", "Perempuan"]
                  : [
                      "Islam",
                      "Kristen",
                      "Katolik",
                      "Hindu",
                      "Buddha",
                      "Konghucu",
                      "Lainnya",
                    ];
              return (
                <Field key={key} label={label}>
                  <select
                    value={form[key] ?? ""}
                    disabled={isReadOnlyKey(key)}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, [key]: e.target.value }))
                    }
                    style={{ width: "100%" }}
                  >
                    <option value="">-</option>
                    {options.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </Field>
              );
            }
            return (
              <Field key={key} label={label}>
                <input
                  type="text"
                  value={form[key] ?? ""}
                  disabled={isReadOnlyKey(key)}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, [key]: e.target.value }))
                  }
                  style={{ width: "100%" }}
                  placeholder="-"
                />
              </Field>
            );
          })}
        </div>
      )}
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

  const [busyCard, setBusyCard] = useState({}); // {title: true/false}

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

  // --- API helpers untuk UPDATE biodata & upload foto
  async function updateBiodata(partialPayload, cardTitle) {
    if (!biodata?.nik) throw new Error("NIK tidak tersedia");
    const token = await window.authAPI?.getToken?.();
    try {
      setBusyCard((m) => ({ ...m, [cardTitle]: true }));
      const res = await fetch(
        `${API}/siswa/nik/${encodeURIComponent(biodata.nik)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(partialPayload),
        }
      );
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || `Gagal menyimpan (HTTP ${res.status})`);
      }
      const updated = await res.json().catch(() => ({}));
      setBiodata((b) => ({ ...(b || {}), ...(updated || partialPayload) }));
    } finally {
      setBusyCard((m) => ({ ...m, [cardTitle]: false }));
    }
  }

  async function uploadFoto(file) {
    if (!biodata?.nik) throw new Error("NIK tidak tersedia");
    const token = await window.authAPI?.getToken?.();
    const fd = new FormData();
    fd.append("foto", file);
    const res = await fetch(
      `${API}/siswa/nik/${encodeURIComponent(biodata.nik)}/foto`,
      {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: fd,
      }
    );
    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      throw new Error(msg || `Gagal upload foto (HTTP ${res.status})`);
    }
    const json = await res.json().catch(() => ({}));
    const newUrl = json?.foto || json?.url || null;
    if (newUrl) {
      setBiodata((b) => ({ ...(b || {}), foto: newUrl }));
    }
    return newUrl;
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
              onSave={(payload) => updateBiodata(payload, g.title)}
              onEditFoto={
                g.title === "Foto & Identitas" ? uploadFoto : undefined
              }
              busyKeys={busyCard}
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

    // Mapel & Jasmani: tampilkan ala MentalTable (ringkasan angka + tabel)
    if (active === "mapel") {
      return <MentalTable rows={dataMap["mapel"] || []} />;
    }
    if (active === "jasmani") {
      return <MentalTable rows={dataMap["jasmani"] || []} />;
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

    // default untuk tab lain (mis. jasmani_polda → tabel generik)
    return <DataTable rows={dataMap[active] || []} />;
  }

  function startExport() {
    if (!biodata?.nik) {
      alert("NIK tidak tersedia.");
      return;
    }
    const url = `${API}/export/all?nik=${encodeURIComponent(biodata.nik)}`;

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
