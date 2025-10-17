// src/pages/SiswaDetail.jsx
import { useEffect, useMemo, useState, Fragment, useRef } from "react";
import {
  fetchSiswaDetailByNik,
  fetchSiswaTabByNik,
  fetchMentalRankByNik,
  fetchJasmaniOverviewByNik, // <— NEW
} from "../api/siswa";

import jsPDF from "jspdf";
import html2canvas from "html2canvas";

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

/* ========================= Utils ========================= */

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
function buildViewUrl(filePath) {
  const base = buildDownloadUrl(filePath);
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

/* ===================== Komponen kecil ==================== */

function SummaryItem({ label, children }) {
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        background: "var(--panel)",
        color: "var(--text)",
        borderRadius: 10,
        padding: "10px 12px",
      }}
    >
      <div className="muted" style={{ fontSize: 12, color: "var(--muted)" }}>
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
        border: "1px solid var(--border)",
        background: "var(--panel)",
        color: "var(--text)",
        borderRadius: 10,
        padding: "10px 12px",
      }}
    >
      <div className="muted" style={{ fontSize: 12, color: "var(--muted)" }}>
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
      <div className="muted" style={{ fontSize: 12, color: "var(--muted)" }}>
        {label}
      </div>
      <div style={{ color: "var(--text)" }}>{children || "-"}</div>
    </div>
  );
}

function DataTable({ rows }) {
  const headers = useMemo(
    () => (rows?.[0] ? Object.keys(rows[0]) : []),
    [rows]
  );
  if (!rows?.length)
    return <div style={{ color: "var(--muted)" }}>Belum ada data.</div>;
  return (
    <div style={{ overflowX: "auto" }}>
      <table className="table" style={{ color: "var(--text)" }}>
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

/* ============= DownloadNotice (banner progres) ============ */

function DownloadNotice({ message, percent }) {
  if (!message && percent == null) return null;
  return (
    <div
      className="card"
      style={{
        marginBottom: 8,
        whiteSpace: "pre-line",
        border: "1px solid var(--border)",
        background: "var(--panel)",
        color: "var(--text)",
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
              background: "var(--border)",
              borderRadius: 4,
              marginTop: 4,
            }}
          >
            <div
              style={{
                width: `${Math.max(0, Math.min(100, percent))}%`,
                height: 6,
                background: "var(--accent, #60a5fa)",
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

/* ===== MentalTable (juga dipakai gaya ringkasan) ===== */

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
          border: "1px solid var(--border)",
          background: "var(--panel)",
          color: "var(--text)",
          borderRadius: 12,
          padding: 12,
        }}
      >
        <div style={{ fontWeight: 800 }}>
          Ringkasan
          {rank?.angkatan ? (
            <span
              className="muted"
              style={{ marginLeft: 8, fontWeight: 400, color: "var(--muted)" }}
            >
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

        <div className="muted" style={{ fontSize: 12, color: "var(--muted)" }}>
          Hanya nilai numeric (mis. <code>78</code>, <code>80,5</code>→80.5)
          yang dihitung untuk ringkasan.
        </div>
      </div>

      {norm.length ? (
        <div style={{ overflowX: "auto" }}>
          <table
            className="table"
            style={{ width: "100%", color: "var(--text)" }}
          >
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
        <div style={{ color: "var(--muted)" }}>Belum ada data.</div>
      )}
    </>
  );
}

/* ===================== JasmaniTable ====================== */
function JasmaniTable({ rows, rank }) {
  const GROUPS = [
    {
      key: "lari_12_menit",
      label: "Lari 12 Menit",
      match: /lari.*12|lari\s*12/i,
    },
    { key: "sit_up", label: "Sit Up", match: /sit\s*up/i },
    { key: "shuttle_run", label: "Shuttle Run", match: /shuttle\s*run/i },
    { key: "push_up", label: "Push Up", match: /push\s*up/i },
    { key: "pull_up", label: "Pull Up", match: /pull\s*up/i },
  ];

  const W_TAHAP = 120;
  const W_NUM = 90;

  const { tahapList, matrix, stats } = useMemo(() => {
    if (!Array.isArray(rows) || rows.length === 0) {
      return {
        tahapList: [],
        matrix: new Map(),
        stats: { count: 0, avg: null, min: null, max: null },
      };
    }

    const norm = rows
      .map((r) => {
        const item = String(r.item || "").trim();
        const kategori = String(r.kategori || "").trim();
        const tahap = Number(r.tahap) || 0;
        const nilai = r.nilai !== null ? parseFloat(r.nilai) : null;
        const time = new Date(
          r.updated_at || r.created_at || Date.now()
        ).getTime();

        let groupKey = null;
        for (const g of GROUPS) {
          if (g.match.test(item)) {
            groupKey = g.key;
            break;
          }
        }

        const sub = /^(ts|rs)$/i.test(kategori)
          ? kategori.toLowerCase()
          : item.toLowerCase().includes("(ts)")
          ? "ts"
          : item.toLowerCase().includes("(rs)")
          ? "rs"
          : null;

        return { tahap, groupKey, sub, nilai, time };
      })
      .filter((x) => x.groupKey && x.sub);

    const nums = norm.map((x) => x.nilai).filter((n) => n != null && !isNaN(n));
    const stats =
      nums.length === 0
        ? { count: 0, avg: null, min: null, max: null }
        : {
            count: nums.length,
            avg: nums.reduce((a, b) => a + b, 0) / nums.length,
            min: Math.min(...nums),
            max: Math.max(...nums),
          };

    const tahapList = [...new Set(norm.map((x) => x.tahap))].sort(
      (a, b) => a - b
    );

    const matrix = new Map();
    for (const row of norm) {
      const k = `${row.tahap}||${row.groupKey}||${row.sub}`;
      const prev = matrix.get(k);
      if (!prev || row.time > prev.time) matrix.set(k, row);
    }

    return { tahapList, matrix, stats };
  }, [rows]);

  const stickyTop = {
    position: "sticky",
    top: 0,
    background: "var(--table-header-bg)",
    zIndex: 4,
  };
  const thBase = {
    whiteSpace: "nowrap",
    fontWeight: 700,
    borderBottom: "1px solid var(--border)",
  };
  const numCell = {
    textAlign: "right",
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
  };
  const centerCell = { textAlign: "center", whiteSpace: "nowrap" };
  const stickyLeftTH = (px) => ({
    position: "sticky",
    top: 0,
    left: px,
    background: "var(--table-header-bg)",
    zIndex: 6,
    boxShadow: px
      ? "var(--table-sticky-shadow-left)"
      : "inset 0 -1px 0 var(--border)",
  });
  const stickyLeftTD = (px) => ({
    position: "sticky",
    left: px,
    background: "var(--panel)",
    zIndex: 5,
    boxShadow: px ? "var(--table-sticky-shadow-left)" : "none",
  });

  const fmtNum = (v) =>
    v == null || v === "" || Number.isNaN(Number(v)) ? "-" : Number(v);
  const tahapLabel = (t) => (t === 0 ? "Terbaru" : t);

  return (
    <>
      <div
        className="card"
        style={{
          marginBottom: 12,
          display: "grid",
          gap: 10,
          border: "1px solid var(--border)",
          background: "var(--panel)",
          color: "var(--text)",
          borderRadius: 12,
          padding: 12,
        }}
      >
        <div style={{ fontWeight: 800 }}>
          Ringkasan
          {rank?.angkatan ? (
            <span
              className="muted"
              style={{ marginLeft: 8, fontWeight: 400, color: "var(--muted)" }}
            >
              · Ranking Angkatan <b>{rank.angkatan}</b>
            </span>
          ) : null}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12,
          }}
        >
          <SummaryItem label="Jumlah Data">{stats.count}</SummaryItem>
          <SummaryItem label="Rata-rata">
            {stats.avg == null ? "-" : stats.avg.toFixed(2)}
          </SummaryItem>
          <SummaryItem label="Nilai Minimum">{stats.min ?? "-"}</SummaryItem>
          <SummaryItem label="Nilai Maksimum">{stats.max ?? "-"}</SummaryItem>
        </div>

        {rank ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 12,
            }}
          >
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
      </div>
      {tahapList.length ? (
        <div className="table-scroll-wrapper">
          <div style={{ display: "inline-block", minWidth: "100%" }}>
            <table
              className="table"
              style={{
                width: "100%",
                minWidth: 900,
                borderCollapse: "separate",
                borderSpacing: 0,
                color: "var(--text)",
              }}
            >
              <thead>
                <tr>
                  <th
                    rowSpan={2}
                    style={{
                      ...thBase,
                      ...stickyLeftTH(0),
                      textAlign: "left",
                      minWidth: W_TAHAP,
                      width: W_TAHAP,
                    }}
                  >
                    Tahap
                  </th>
                  {GROUPS.map((g) => (
                    <Fragment key={`grp-${g.key}`}>
                      <th
                        colSpan={2}
                        style={{
                          ...thBase,
                          ...stickyTop,
                          textAlign: "center",
                          minWidth: W_NUM * 2,
                        }}
                      >
                        {g.label}
                      </th>
                    </Fragment>
                  ))}
                </tr>
                <tr>
                  {GROUPS.map((g) => (
                    <Fragment key={`sub-${g.key}`}>
                      <th
                        style={{
                          ...thBase,
                          ...stickyTop,
                          ...centerCell,
                          minWidth: W_NUM,
                        }}
                      >
                        TS
                      </th>
                      <th
                        style={{
                          ...thBase,
                          ...stickyTop,
                          ...centerCell,
                          minWidth: W_NUM,
                        }}
                      >
                        RS
                      </th>
                    </Fragment>
                  ))}
                </tr>
              </thead>

              <tbody>
                {tahapList.map((t) => (
                  <tr key={`row-${t}`}>
                    <td
                      style={{
                        ...stickyLeftTD(0),
                        whiteSpace: "nowrap",
                        minWidth: W_TAHAP,
                        width: W_TAHAP,
                      }}
                    >
                      {tahapLabel(t)}
                    </td>
                    {GROUPS.map((g) => {
                      const ts = matrix.get(`${t}||${g.key}||ts`);
                      const rs = matrix.get(`${t}||${g.key}||rs`);
                      return (
                        <Fragment key={`cell-${t}-${g.key}`}>
                          <td style={numCell}>{fmtNum(ts?.nilai)}</td>
                          <td style={numCell}>{fmtNum(rs?.nilai)}</td>
                        </Fragment>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div style={{ color: "var(--muted)", padding: 12 }}>
          Belum ada data Jasmani.
        </div>
      )}
    </>
  );
}

/* =========== MapelTable (dinamis pertemuan) ============ */

function MapelTable({ rows, rank }) {
  const { matrix, mapelList, pertemuanList, stats } = useMemo(() => {
    if (!Array.isArray(rows)) {
      return {
        matrix: new Map(),
        mapelList: [],
        pertemuanList: [],
        stats: { count: 0, avg: null, min: null, max: null },
      };
    }

    const norm = rows
      .map((r) => {
        const mapel =
          r.mapel ??
          r.nama_mapel ??
          r.pelajaran ??
          r.subject ??
          r.mata_pelajaran ??
          "-";
        const pertemuanRaw =
          r.pertemuan ?? r.minggu_ke ?? r.minggu ?? r.week ?? r.week_no ?? null;
        const pertemuan =
          typeof pertemuanRaw === "number"
            ? pertemuanRaw
            : /^\d+$/.test(String(pertemuanRaw ?? "").trim())
            ? parseInt(String(pertemuanRaw).trim(), 10)
            : null;

        const nilai =
          r.nilai ?? r.skor ?? r.value ?? r.score ?? r.penilaian ?? null;
        const nilaiNum = toNumberOrNull(nilai);
        const ts =
          r.updated_at ?? r.updatedAt ?? r.created_at ?? r.tanggal ?? null;

        return {
          mapel: String(mapel),
          pertemuan,
          nilai: nilai == null ? null : String(nilai),
          nilaiNum,
          time: ts ? new Date(ts) : null,
        };
      })
      .filter((x) => x.mapel);

    const nums = norm.map((x) => x.nilaiNum).filter((n) => n != null);
    const stats =
      nums.length === 0
        ? { count: 0, avg: null, min: null, max: null }
        : {
            count: nums.length,
            avg: nums.reduce((a, b) => a + b, 0) / nums.length,
            min: Math.min(...nums),
            max: Math.max(...nums),
          };

    const mapelSet = new Set(norm.map((x) => x.mapel));
    const pertemuanSet = new Set(
      norm
        .map((x) => (typeof x.pertemuan === "number" ? x.pertemuan : null))
        .filter((x) => x != null)
    );

    const matrix = new Map();
    for (const row of norm) {
      if (typeof row.pertemuan !== "number") continue;
      const key = `${row.mapel}||${row.pertemuan}`;
      const prev = matrix.get(key);
      if (!prev || (row.time && (!prev.time || row.time > prev.time))) {
        matrix.set(key, row);
      }
    }

    const mapelList = Array.from(mapelSet).sort((a, b) =>
      a.localeCompare(b, "id")
    );
    const pertemuanList = Array.from(pertemuanSet).sort((a, b) => a - b);

    return { matrix, mapelList, pertemuanList, stats };
  }, [rows]);

  return (
    <>
      <div
        className="card"
        style={{
          marginBottom: 12,
          display: "grid",
          gap: 10,
          border: "1px solid var(--border)",
          background: "var(--panel)",
          color: "var(--text)",
          borderRadius: 12,
          padding: 12,
        }}
      >
        <div style={{ fontWeight: 800 }}>
          Ringkasan
          {rank?.angkatan ? (
            <span
              className="muted"
              style={{ marginLeft: 8, fontWeight: 400, color: "var(--muted)" }}
            >
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
            {stats.count.toString()}
          </SummaryItem>
          <SummaryItem label="Rata-rata">
            {stats.avg == null ? "-" : stats.avg.toFixed(2)}
          </SummaryItem>
          <SummaryItem label="Nilai Minimum">
            {stats.min == null ? "-" : stats.min}
          </SummaryItem>
          <SummaryItem label="Nilai Maksimum">
            {stats.max == null ? "-" : stats.max}
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
      </div>

      {mapelList.length ? (
        <div
          style={{
            width: "100%",
            overflowX: "auto",
            overscrollBehaviorX: "contain",
          }}
        >
          <div style={{ display: "inline-block", minWidth: "100%" }}>
            <table
              className="table"
              style={{
                width: "100%",
                tableLayout: "auto",
                borderCollapse: "separate",
                color: "var(--text)",
              }}
            >
              <thead>
                <tr>
                  <th style={{ textAlign: "left", whiteSpace: "nowrap" }}>
                    Mapel
                  </th>
                  <th
                    colSpan={pertemuanList.length}
                    style={{ textAlign: "center", whiteSpace: "nowrap" }}
                  >
                    Pertemuan
                  </th>
                </tr>

                <tr>
                  <th style={{ textAlign: "left", whiteSpace: "nowrap" }} />
                  {pertemuanList.map((p) => (
                    <th
                      key={p}
                      style={{ textAlign: "left", whiteSpace: "nowrap" }}
                    >
                      {p}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {mapelList.map((m) => (
                  <tr key={m}>
                    <td style={{ whiteSpace: "nowrap" }}>{m}</td>
                    {pertemuanList.map((p) => {
                      const cell = matrix.get(`${m}||${p}`);
                      if (!cell) {
                        return (
                          <td
                            key={`${m}-${p}`}
                            style={{ whiteSpace: "nowrap" }}
                          >
                            -
                          </td>
                        );
                      }
                      return (
                        <td key={`${m}-${p}`} style={{ whiteSpace: "nowrap" }}>
                          {cell.nilai ?? "-"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div style={{ color: "var(--muted)" }}>Belum ada data.</div>
      )}
    </>
  );
}

/* ===== JasmaniPoldaCards (card simpel per kategori) ===== */
function JasmaniPoldaCards({ rows }) {
  const ANTHRO = [
    { key: "tb_cm", label: "TB (cm)" },
    { key: "tb_inchi", label: "TB (inchi)", num: true },
    { key: "bb_kg", label: "BB (kg)" },
    { key: "bb_akbb", label: "BB AKBB", num: true },
    { key: "ratio_index", label: "Ratio" },
    { key: "somato_type", label: "Somato" },
    { key: "klasifikasi_tipe_tubuh", label: "Klasifikasi" },
    { key: "nilai_tipe_tubuh", label: "Nilai Tipe", num: true },
    { key: "nilai_kelainan", label: "Nilai Kelainan", num: true },
    { key: "nilai_terkecil", label: "Nilai Terkecil", num: true },
    { key: "nilai_anthro", label: "Nilai Anthro", num: true },
    { key: "antro", label: "ANTRO (raw)" },
    { key: "antro_pembobotan", label: "ANTHRO Pembobotan" },
    { key: "pencapaian_nbl", label: "NBL" },
  ];

  const SAMAPTA_RENANG = [
    { key: "kesamaptaan_hga", label: "Kesamaptaan HGA" },
    { key: "kesamaptaan_nga", label: "Kesamaptaan NGA" },
    { key: "pull_up_hgb1", label: "Pull Up HGB1", num: true },
    { key: "pull_up_ngb1", label: "Pull Up NGB1", num: true },
    { key: "sit_up_hgb2", label: "Sit Up HGB2", num: true },
    { key: "sit_up_ngb2", label: "Sit Up NGB2", num: true },
    { key: "push_up_hgb3", label: "Push Up HGB3", num: true },
    { key: "push_up_ngb3", label: "Push Up NGB3", num: true },
    { key: "shuttle_run_hgb4", label: "Shuttle Run HGB4", num: true },
    { key: "shuttle_run_ngb4", label: "Shuttle Run NGB4", num: true },
    { key: "renang_jarak", label: "Renang Jarak", num: true },
    { key: "renang_waktu", label: "Renang Waktu", num: true },
    { key: "renang_nilai", label: "Renang Nilai", num: true },
    { key: "renang", label: "Renang (Total)", num: true },
  ];

  const REKAP = [
    { key: "nilai_b", label: "Nilai B", num: true },
    { key: "na_a_b", label: "NA A+B", num: true },
    { key: "kesamaptaan_a_b", label: "Kesamaptaan A+B", num: true },
    { key: "renang_x20", label: "Renang ×20", num: true },
    { key: "samapta_x80", label: "Samapta ×80", num: true },
    { key: "nilai_akhir", label: "Nilai Akhir", num: true },
    { key: "ktgr", label: "KTGR" },
    { key: "ket", label: "KET" },
    { key: "catatan", label: "Catatan" },
  ];

  const record = useMemo(() => {
    if (!Array.isArray(rows) || rows.length === 0) return null;
    const withTime = rows.map((r) => {
      const t = r.tanggal ?? r.updated_at ?? r.created_at ?? null;
      return { r, t: t ? new Date(t).getTime() : 0 };
    });
    withTime.sort((a, b) => b.t - a.t);
    return withTime[0].r || rows[0];
  }, [rows]);

  if (!record) {
    return <div style={{ color: "var(--muted)" }}>Belum ada data.</div>;
  }

  const Pair = ({ label, value, isNum }) => {
    const show =
      value != null &&
      String(value).trim() !== "" &&
      String(value).trim() !== "-";
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "200px 1fr",
          gap: 10,
          padding: "6px 0",
          borderBottom: "1px dashed var(--border)",
        }}
      >
        <div className="muted" style={{ whiteSpace: "nowrap" }}>
          {label}
        </div>
        <div
          style={{
            whiteSpace: "nowrap",
            textAlign: isNum ? "right" : "left",
            fontVariantNumeric: isNum ? "tabular-nums" : "normal",
          }}
        >
          {show ? String(value) : "-"}
        </div>
      </div>
    );
  };

  const Section = ({ title, cols }) => {
    const filled = cols.filter((c) => {
      const v = record[c.key];
      return v != null && String(v).trim() !== "";
    });

    if (filled.length === 0) return null;

    return (
      <div
        className="card"
        style={{
          border: "1px solid var(--border)",
          background: "var(--panel)",
          color: "var(--text)",
          borderRadius: 12,
          padding: 12,
        }}
      >
        <div style={{ fontWeight: 800, marginBottom: 6 }}>{title}</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(1, minmax(0,1fr))",
            gap: 4,
          }}
        >
          {cols.map((c) => (
            <Pair
              key={c.key}
              label={c.label}
              value={record[c.key]}
              isNum={!!c.num}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        display: "grid",
        gap: 12,
        gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
      }}
    >
      <Section title="ANTHRO" cols={ANTHRO} />
      <Section title="KESAMAPTAAN & RENANG" cols={SAMAPTA_RENANG} />
      <Section title="REKAP" cols={REKAP} />
    </div>
  );
}

/* ============== DocTable (BK/PLG/PRST/Rikes) ============== */

function DocTable({ rows, onDelete }) {
  if (!rows?.length)
    return <div style={{ color: "var(--muted)" }}>Belum ada data.</div>;

  return (
    <div style={{ overflowX: "auto" }}>
      <table className="table" style={{ width: "100%", color: "var(--text)" }}>
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
      <div
        className="muted"
        style={{ fontSize: 12, marginTop: 6, color: "var(--muted)" }}
      >
        Download selalu mengunduh file tanpa menampilkan preview.
      </div>
    </div>
  );
}

/* ===================== Biodata grouping =================== */

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

/* ================= SectionCard editable =================== */

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
            border: "1px solid var(--border)",
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
            background: "var(--panel)",
            border: "1px solid var(--border)",
            padding: "4px 8px",
            borderRadius: 8,
            fontSize: 12,
            cursor: uploading ? "not-allowed" : "pointer",
            opacity: uploading ? 0.6 : 1,
            color: "var(--text)",
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
        background: "var(--panel)",
        border: "1px solid var(--border)",
        color: "var(--text)",
        position: "relative",
      }}
    >
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

      {isFotoIdentitas ? (
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
                        style={{
                          width: "100%",
                          background: "var(--input-bg)",
                          color: "var(--text)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          padding: "6px 8px",
                        }}
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
                        style={{
                          width: "100%",
                          background: "var(--input-bg)",
                          color: "var(--text)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          padding: "6px 8px",
                        }}
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
                      style={{
                        width: "100%",
                        background: "var(--input-bg)",
                        color: "var(--text)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        padding: "6px 8px",
                      }}
                      placeholder="-"
                    />
                  </Field>
                );
              })}
          </div>

          <div>
            <Field label="Foto">
              <FotoCell />
            </Field>
          </div>
        </div>
      ) : (
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
                    style={{
                      width: "100%",
                      background: "var(--input-bg)",
                      color: "var(--text)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      padding: "6px 8px",
                    }}
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
                    style={{
                      width: "100%",
                      background: "var(--input-bg)",
                      color: "var(--text)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      padding: "6px 8px",
                    }}
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
                  style={{
                    width: "100%",
                    background: "var(--input-bg)",
                    color: "var(--text)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    padding: "6px 8px",
                  }}
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

/* ===================== Halaman utama ====================== */

export default function SiswaDetail({ nik }) {
  const safeNik = useMemo(() => String(nik ?? "").trim(), [nik]);
  const [active, setActive] = useState("biodata");
  const [biodata, setBiodata] = useState(null);
  const [dataMap, setDataMap] = useState({});
  const [mentalRank, setMentalRank] = useState(null);
  const [jasmaniRank, setJasmaniRank] = useState(null); // <— NEW
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [busyCard, setBusyCard] = useState({});

  const [dlMsg, setDlMsg] = useState("");
  const [dlPct, setDlPct] = useState(null);

  // === REF: bungkus konten tab untuk ditangkap HTML2Canvas
  const tabContentRef = useRef(null);

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

      if (tabKey === "mental" || tabKey === "mapel") {
        try {
          const rank = await fetchMentalRankByNik(safeNik, token);
          setMentalRank(rank);
        } catch (e) {
          console.warn("[rank] fetch error:", e.message);
          setMentalRank(null);
        }
      }

      if (tabKey === "jasmani") {
        try {
          const token2 = await window.authAPI?.getToken?.();
          const ov = await fetchJasmaniOverviewByNik(safeNik, token2);
          const jr = ov?.rank
            ? {
                angkatan: ov?.angkatan ?? null,
                batalion: ov?.batalion ?? null,
                kompi: ov?.kompi ?? null,
                pleton: (() => {
                  const raw = ov?.pleton ?? ov?.pleton_label ?? null;
                  if (raw == null) return null;
                  const num = String(raw).replace(/^\D+/, "");
                  return num ? Number(num) : null;
                })(),
                rank: ov.rank,
              }
            : null;
          setJasmaniRank(jr);
        } catch (e) {
          console.warn("[jasmani_overview] fetch error:", e?.message);
          setJasmaniRank(null);
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
        return <div style={{ color: "var(--muted)" }}>Memuat biodata...</div>;
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
        <div style={{ color: "var(--muted)" }}>
          Memuat data {TABS.find((t) => t.key === active)?.label || active}...
        </div>
      );
    }

    if (active === "mental") {
      return <MentalTable rows={dataMap["mental"] || []} rank={mentalRank} />;
    }

    if (active === "mapel") {
      return <MapelTable rows={dataMap["mapel"] || []} rank={mentalRank} />;
    }

    if (active === "jasmani") {
      return (
        <JasmaniTable rows={dataMap["jasmani"] || []} rank={jasmaniRank} />
      );
    }

    if (active === "jasmani_polda") {
      return <JasmaniPoldaCards rows={dataMap["jasmani_polda"] || []} />;
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

  // =============== EXPORT PDF (semua tab → 1 PDF) ===============
  // Util: delay untuk tunggu render selesai setelah ganti tab
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // Potong canvas yang tinggi menjadi beberapa halaman A4 di jsPDF (px → mm via ratio)
  function addCanvasToPdf(
    pdf,
    canvas,
    title,
    headerInfo,
    margins = { top: 16, left: 16, right: 16, bottom: 16 }
  ) {
    const pageWidth = pdf.internal.pageSize.getWidth(); // mm
    const pageHeight = pdf.internal.pageSize.getHeight(); // mm

    const imgWidth = pageWidth - margins.left - margins.right; // mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width; // mm (scale proporsional)

    // Render title+header setiap halaman
    const headerHeight = 10; // mm (space judul)
    const availableHeight =
      pageHeight - margins.top - margins.bottom - headerHeight;

    // Konversi tinggi canvas (mm)
    const fullHeight = imgHeight;

    // Buat canvas sementara untuk slice vertikal
    const pxPerMm = canvas.width / imgWidth;
    const sliceHeightPx = Math.floor(availableHeight * pxPerMm);

    let rendered = 0;
    let pageIndex = 0;

    while (rendered < canvas.height) {
      const slice = document.createElement("canvas");
      slice.width = canvas.width;
      slice.height = Math.min(sliceHeightPx, canvas.height - rendered);

      const ctx = slice.getContext("2d");
      ctx.drawImage(
        canvas,
        0,
        rendered,
        canvas.width,
        slice.height,
        0,
        0,
        slice.width,
        slice.height
      );

      const sliceImgHeightMm = (slice.height * imgWidth) / slice.width;

      if (pageIndex > 0) pdf.addPage();

      // Header
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.text(title, margins.left, margins.top);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.text(headerInfo, margins.left, margins.top + 6);

      // Gambar isi di bawah header
      const yStart = margins.top + headerHeight;
      const imgData = slice.toDataURL("image/png");
      pdf.addImage(
        imgData,
        "PNG",
        margins.left,
        yStart,
        imgWidth,
        sliceImgHeightMm,
        "",
        "FAST"
      );

      rendered += slice.height;
      pageIndex += 1;
    }
  }

  async function exportAllTabsToPDF() {
    if (!biodata?.nik) {
      alert("NIK tidak tersedia.");
      return;
    }

    try {
      setDlMsg("Menyiapkan export PDF semua tab…");
      setDlPct(null);

      // Pastikan semua tab sudah punya data (agar saat capture tampil penuh)
      for (const t of TABS) {
        await loadTab(t.key);
      }

      const pdf = new jsPDF("p", "mm", "a4"); // Portrait, millimeter, A4
      const studentHeader = `${biodata?.nama || "-"} · NOSIS: ${
        biodata?.nosis || "-"
      } · NIK: ${biodata?.nik || "-"}`;

      // Simpan tab aktif, nanti balikin
      const prevActive = active;

      for (let i = 0; i < TABS.length; i++) {
        const tab = TABS[i];
        setActive(tab.key);
        // Tunggu render React (dua frame kecil supaya layout stabil)
        await wait(50);
        await wait(200);

        const node = tabContentRef.current;
        if (!node) continue;

        // Paksa lebar untuk hindari wrap aneh saat capture (opsional)
        const prevWidth = node.style.width;
        node.style.width = `${node.clientWidth}px`;

        // Screenshot DOM
        const canvas = await html2canvas(node, {
          scale: 2, // kualitas lebih tajam
          useCORS: true,
          backgroundColor: "#ffffff", // PDF putih
          logging: false,
          windowWidth: document.documentElement.scrollWidth,
          windowHeight: document.documentElement.scrollHeight,
        });

        node.style.width = prevWidth || "";

        // Tambah ke PDF (otomatis pecah halaman jika tinggi)
        addCanvasToPdf(pdf, canvas, tab.label, studentHeader);

        // Progres sederhana
        setDlMsg(`Memproses tab: ${tab.label} (${i + 1}/${TABS.length})…`);
        setDlPct(Math.round(((i + 1) / TABS.length) * 100));
      }

      // Simpan file
      // ...
      const ts = new Date();
      const y = ts.getFullYear();
      const m = String(ts.getMonth() + 1).padStart(2, "0");
      const d = String(ts.getDate()).padStart(2, "0");
      const hh = String(ts.getHours()).padStart(2, "0");
      const mm = String(ts.getMinutes()).padStart(2, "0");
      const ss = String(ts.getSeconds()).padStart(2, "0");
      const fname = `DetailSiswa-${
        biodata?.nosis || "NOSIS"
      }-${y}${m}${d}-${hh}${mm}${ss}.pdf`;

      // === FIX: Jangan pakai electronAPI.download untuk blob/dataURL
      // Cukup gunakan pdf.save() (berjalan di web & Electron)
      pdf.save(fname);

      setDlMsg(`✅ Export selesai: ${fname}`);
      setDlPct(100);
      setTimeout(() => {
        setDlMsg("");
        setDlPct(null);
      }, 6000);

      // Kembalikan tab sebelumnya
      setActive(prevActive);
    } catch (e) {
      console.error("[export-pdf] error:", e);
      setDlMsg(`❌ Export gagal: ${e?.message || "unknown"}`);
      setDlPct(null);
    }
  }

  function startExport() {
    if (!biodata?.nik) return alert("NIK tidak tersedia.");
    const url = `${API}/export/all-by-nik.pdf?nik=${encodeURIComponent(
      biodata.nik
    )}`;

    // HEAD sering tidak disupport oleh stream PDF; toleransi 405/501
    fetch(url, { method: "HEAD" })
      .then((r) => {
        if (!r.ok && r.status !== 405 && r.status !== 501) {
          throw new Error("Export tidak tersedia");
        }
        if (window.electronAPI?.download) {
          window.electronAPI.download(url); // <- HTTP langsung, bukan blob:
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
      <div
        className="card"
        style={{
          background: "var(--panel)",
          border: "1px solid var(--border)",
          color: "var(--text)",
        }}
      >
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
            <div style={{ color: "var(--muted)" }}>
              NOSIS:{" "}
              <code style={{ color: "var(--text)" }}>
                {biodata?.nosis || "-"}
              </code>
              <span style={{ marginLeft: 12, color: "var(--muted)" }}>
                (NIK:{" "}
                <code style={{ color: "var(--text)" }}>{safeNik || "-"}</code>)
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

      <div
        className="card"
        style={{
          background: "var(--panel)",
          border: "1px solid var(--border)",
          color: "var(--text)",
        }}
      >
        <DownloadNotice message={dlMsg} percent={dlPct} />

        <div className="tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`tab ${active === t.key ? "active" : ""}`}
            >
              <span onClick={() => onTabClick(t.key)}>{t.label}</span>
            </button>
          ))}
        </div>

        {/* === Bungkus konten tab dengan ref untuk capture PDF === */}
        <div style={{ marginTop: 12 }} ref={tabContentRef}>
          {renderActiveTab()}
        </div>
      </div>
    </div>
  );
}

/* ===================== Helper render value ===================== */

function renderValue(key, val) {
  if (!val && val !== 0) return "-";

  if (key === "foto") {
    const raw = String(val);
    const isAbs =
      /^https?:\/\//i.test(raw) ||
      raw.startsWith("data:") ||
      raw.startsWith("blob:");
    const src = isAbs ? raw : buildViewUrl(raw);
    return (
      <img
        src={src}
        alt="Foto siswa"
        style={{
          width: 180,
          height: 220,
          objectFit: "cover",
          borderRadius: 8,
          border: "1px solid var(--border)",
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
        style={{ color: "var(--link, #60a5fa)" }}
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
