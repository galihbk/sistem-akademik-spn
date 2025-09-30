import { useEffect, useMemo, useState } from "react";
import { fetchSiswaDetailByNik, fetchSiswaTabByNik } from "../api/siswa";

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

/** tabel generik untuk tab non-biodata */
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

/** 1 field rapi */
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

/** render value khusus (foto/link/format) */
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

  // tanggal simple (kalau timestamp)
  if ((key === "created_at" || key === "updated_at") && val) {
    try {
      const d = new Date(val);
      return d.toLocaleString();
    } catch {
      return String(val);
    }
  }

  return String(val);
}

/** definisi kelompok kartu biodata (foto dipindah ke kartu pertama) */
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

export default function SiswaDetail({ nik }) {
  const safeNik = useMemo(() => String(nik ?? "").trim(), [nik]);
  const [active, setActive] = useState("biodata");
  const [biodata, setBiodata] = useState(null);
  const [dataMap, setDataMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // load biodata (by NIK)
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

  // lazy-load tab selain biodata
  async function loadTab(tabKey) {
    if (tabKey === "biodata" || dataMap[tabKey] || !safeNik) return;
    try {
      setLoading(true);
      setErr("");
      const token = await window.authAPI?.getToken?.();
      const json = await fetchSiswaTabByNik(safeNik, tabKey, token);
      const rows = Array.isArray(json) ? json : json.items || [];
      setDataMap((m) => ({ ...m, [tabKey]: rows }));
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

  return (
    <div className="grid">
      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
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
          <button className="btn" onClick={back}>
            Kembali
          </button>
        </div>
        {err && <div style={{ marginTop: 8, color: "#fca5a5" }}>⚠ {err}</div>}
      </div>

      <div className="card">
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

        <div style={{ marginTop: 12 }}>
          {active === "biodata" ? (
            !safeNik ? (
              <div className="muted">NIK belum tersedia.</div>
            ) : biodata ? (
              // ⬇️ HANYA KOLOM KANAN (deretan kartu), kartu kiri dihapus
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
            ) : (
              <div style={{ color: "#94a3b8" }}>Memuat biodata...</div>
            )
          ) : loading ? (
            <div style={{ color: "#94a3b8" }}>Memuat data {active}...</div>
          ) : (
            <DataTable rows={dataMap[active] || []} />
          )}
        </div>
      </div>
    </div>
  );
}
