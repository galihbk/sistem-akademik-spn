import { useEffect, useMemo, useState } from "react";
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

function DataTable({ rows }) {
  // auto header dari keys baris pertama
  const headers = useMemo(() => (rows?.[0] ? Object.keys(rows[0]) : []), [rows]);
  if (!rows || rows.length === 0) {
    return <div style={{ color: "#94a3b8" }}>Belum ada data.</div>;
  }
  return (
    <div style={{ overflowX: "auto" }}>
      <table className="table">
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h} style={{ whiteSpace: "nowrap" }}>{h.toUpperCase()}</th>
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

export default function SiswaDetail({ nosis }) {
  const [active, setActive] = useState("biodata");
  const [biodata, setBiodata] = useState(null);
  const [dataMap, setDataMap] = useState({}); // cache per tab
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // load biodata sekali
  useEffect(() => {
    (async () => {
      try {
        setErr("");
        const token = await window.authAPI.getToken();
        const res = await fetch(`${API}/siswa/${encodeURIComponent(String(nosis))}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || "Gagal ambil detail");
        setBiodata(json);
      } catch (e) {
        setErr(e.message || "Error");
      }
    })();
  }, [nosis]);

  // lazy load per tab (selain biodata)
  async function loadTab(tabKey) {
    if (tabKey === "biodata") return;
    if (dataMap[tabKey]) return; // sudah ada cache
    try {
      setLoading(true);
      setErr("");
      const token = await window.authAPI.getToken();
      const url = `${API}/siswa/${encodeURIComponent(String(nosis))}/${tabKey}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Gagal ambil data");
      setDataMap((m) => ({ ...m, [tabKey]: Array.isArray(json) ? json : (json.items || []) }));
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>Detail Siswa</div>
            <div style={{ color: "#94a3b8" }}>
              NOSIS: <code>{nosis}</code>
            </div>
          </div>
          <button className="btn" onClick={back}>
            Kembali
          </button>
        </div>
        {err && <div style={{ marginTop: 8, color: "#fca5a5" }}>⚠ {err}</div>}
      </div>

      {/* Tabs */}
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

        {/* Content */}
        <div style={{ marginTop: 12 }}>
          {active === "biodata" ? (
            biodata ? (
              <div className="grid grid-2">
                <div>
                  <div className="muted">Nama</div>
                  <div>{biodata.nama}</div>

                  <div className="muted" style={{ marginTop: 10 }}>
                    Tempat Lahir
                  </div>
                  <div>{biodata.tempat_lahir || "-"}</div>

                  <div className="muted" style={{ marginTop: 10 }}>
                    Tanggal Lahir
                  </div>
                  <div>{biodata.tanggal_lahir || "-"}</div>

                  <div className="muted" style={{ marginTop: 10 }}>
                    Alamat
                  </div>
                  <div>{biodata.alamat || "-"}</div>

                  <div className="muted" style={{ marginTop: 10 }}>
                    Agama
                  </div>
                  <div>{biodata.agama || "-"}</div>
                </div>

                <div>
                  <div className="muted">Jenis Kelamin</div>
                  <div>{biodata.jenis_kelamin || "-"}</div>

                  <div className="muted" style={{ marginTop: 10 }}>
                    No HP
                  </div>
                  <div>{biodata.no_hp || "-"}</div>

                  <div className="muted" style={{ marginTop: 10 }}>
                    Asal Polda / Polres
                  </div>
                  <div>
                    {[biodata.asal_polda, biodata.asal_polres].filter(Boolean).join(" / ") || "-"}
                  </div>

                  <div className="muted" style={{ marginTop: 10 }}>
                    Kelompok / Tahun Diktuk
                  </div>
                  <div>
                    {[biodata.kelompok_angkatan, biodata.tahun_diktuk].filter(Boolean).join(" / ") || "-"}
                  </div>
                </div>
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
