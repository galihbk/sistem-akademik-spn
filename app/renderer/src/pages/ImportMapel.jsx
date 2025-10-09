// src/pages/ImportMapel.jsx
import { useEffect, useState } from "react";
import Modal from "../components/Modal";
import ImportExcel from "../components/ImportExcel";
import RekapMapel from "./RekapMapel";

function StatusBanner({ status, onClose }) {
  if (!status) return null;
  const { success, summary } = status;
  const tone = success
    ? { bg: "#07290f", br: "#14532d", fg: "#86efac" }
    : { bg: "#2a0b0b", br: "#7f1d1d", fg: "#fca5a5" };

  // Ringkas angka (terima struktur mental atau mapel)
  const ok = summary?.ok ?? summary?.inserted ?? 0;
  const skip = summary?.skip ?? summary?.skipped ?? 0;
  const fail = summary?.fail ?? summary?.errors ?? 0;
  const upd = summary?.updated;

  return (
    <div
      className="card"
      style={{
        background: tone.bg,
        border: `1px solid ${tone.br}`,
        color: tone.fg,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 12,
      }}
      role="status"
      aria-live="polite"
    >
      <div style={{ fontWeight: 700 }}>
        {success
          ? "Import mapel berhasil"
          : "Import mapel selesai dengan error"}
        <span style={{ marginLeft: 8, color: "#e5e7eb" }}>
          (OK: <b>{ok}</b>
          {upd != null && (
            <>
              {" "}
              | Updated: <b>{upd}</b>
            </>
          )}
          {skip ? (
            <>
              {" "}
              | Skip: <b>{skip}</b>
            </>
          ) : null}
          {fail ? (
            <>
              {" "}
              | Fail: <b>{fail}</b>
            </>
          ) : null}
          )
        </span>
      </div>
      <button
        className="btn"
        onClick={onClose}
        style={{
          background: "transparent",
          border: `1px solid ${tone.br}`,
          color: tone.fg,
        }}
      >
        Tutup
      </button>
    </div>
  );
}

export default function ImportMapel() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0); // remount RekapMapel setelah import

  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(null), 6000);
    return () => clearTimeout(t);
  }, [status]);

  return (
    <>
      {/* Header + tombol Import */}
      <div
        className="card"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <div>
          <div style={{ fontWeight: 800, fontSize: 18 }}>Nilai Mapel</div>
          <div className="muted">Rekap nilai mapel per pertemuan</div>
        </div>
        <button className="btn" onClick={() => setOpen(true)}>
          ⬇️ Import Excel
        </button>
      </div>

      {/* Banner status */}
      <StatusBanner status={status} onClose={() => setStatus(null)} />

      {/* Rekap mapel (auto-fetch on mount) */}
      <div key={refreshKey}>
        <RekapMapel />
      </div>

      {/* Modal import */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Import Nilai Mapel (Rek_mat)"
        width={980}
      >
        <ImportExcel
          // SESUAIKAN PREFIX: kalau server kamu di /api -> "/api/mapel/import-excel"
          endpoint="/mapel/import-excel"
          title="Import Nilai Mapel (Rek_mat)"
          templatePath="templates/Template-import-mapel.xlsx"
          requireAngkatan
          onAfterImport={({ success, summary }) => {
            setStatus({ success: !!success, summary });
            setOpen(false);
            setRefreshKey((k) => k + 1); // paksa RekapMapel refetch (remount)
          }}
        />
      </Modal>
    </>
  );
}
