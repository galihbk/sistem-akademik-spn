import { useEffect, useState } from "react";
import Modal from "../components/Modal";
import ImportExcel from "../components/ImportExcel";
import Siswa from "./Siswa";

function StatusBanner({ status, onClose }) {
  if (!status) return null;
  const { success, summary } = status;
  const tone = success
    ? { bg: "#07290f", br: "#14532d", fg: "#86efac" }
    : { bg: "#2a0b0b", br: "#7f1d1d", fg: "#fca5a5" };
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
        {success ? "Import berhasil" : "Import selesai dengan error"}
        {summary && (
          <span style={{ marginLeft: 8, color: "#e5e7eb" }}>
            (OK: <b>{summary.ok}</b>, Skip: <b>{summary.skip}</b>, Fail:{" "}
            <b>{summary.fail}</b>)
          </span>
        )}
      </div>
      <button
        className="btn"
        onClick={onClose}
        style={{
          background: "transparent",
          border: `1px solid ${tone.br}`,
          color: tone.fg,
        }}
        aria-label="Tutup notifikasi"
      >
        Tutup
      </button>
    </div>
  );
}

export default function ImportSiswa() {
  const [open, setOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // remount list
  const [status, setStatus] = useState(null); // {success, summary}

  // auto-dismiss setelah 6 detik
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
          <div style={{ fontWeight: 800, fontSize: 18 }}>Data Siswa</div>
          <div className="muted">Kelola dan impor data siswa dari Excel</div>
        </div>
        <button className="btn" onClick={() => setOpen(true)}>
          ⬇️ Import Excel
        </button>
      </div>

      <StatusBanner status={status} onClose={() => setStatus(null)} />

      <Siswa key={refreshKey} />
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Import Data Siswa (Excel)"
        width={920}
      >
        <ImportExcel
          endpoint="siswa"
          title="Import Data Siswa (Excel)"
          onAfterImport={({ success, summary }) => {
            // tampilkan status, tutup modal, refresh daftar
            setStatus({ success: !!success, summary });
            setOpen(false);
            setRefreshKey((k) => k + 1);
          }}
        />
      </Modal>
    </>
  );
}
