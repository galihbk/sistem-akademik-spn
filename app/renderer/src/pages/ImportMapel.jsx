// src/pages/ImportMapel.jsx
import { useState } from "react";
import Modal from "../components/Modal";
import ImportExcel from "../components/ImportExcel";

export default function ImportMapel() {
  const [open, setOpen] = useState(false);
  const [alert, setAlert] = useState({ type: "", text: "" });

  return (
    <div className="grid">
      {/* Header */}
      <div
        className="card"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ fontWeight: 800, fontSize: 18 }}>Nilai Mapel</div>
          <div className="muted">Import dari sheet <b>Rek_mat</b> per angkatan</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={() => setOpen(true)}>
            + Import Nilai Mapel
          </button>
          <button className="btn" onClick={() => (window.location.hash = "#/import")}>
            Kembali
          </button>
        </div>
      </div>

      {/* Alert global di atas tabel/apa pun */}
      {alert.text && (
        <div
          className="card"
          style={{
            border: `1px solid ${alert.type === "success" ? "#166534" : "#7f1d1d"}`,
            background: alert.type === "success" ? "#052e1a" : "#1b0c0c",
            color: alert.type === "success" ? "#86efac" : "#fca5a5",
            padding: "8px 12px",
            borderRadius: 12,
          }}
        >
          {alert.text}
        </div>
      )}

      {/* ... kalau kamu punya daftar hasil atau statistik, taruh di sini ... */}

      {/* Modal Import */}
      <Modal open={open} onClose={() => setOpen(false)} title="Import Nilai Mapel (Rek_mat)" width={980}>
        <ImportExcel
          title="Import Nilai Mapel (Rek_mat)"
          // PILIH SALAH SATU dari dua opsi endpoint berikut:

          // 1) Jika backend kamu punya route langsung: app.use("/mapel/import-excel", ...)
          endpoint="/mapel/import-excel"

          // 2) ATAU kalau route kamu ada di /import/:endpoint (mis. /import/mapel-rekmat):
          // endpoint="mapel-rekmat"

          requireAngkatan
          onAfterImport={({ success, summary }) => {
            if (success) {
              setAlert({
                type: "success",
                text: `Import selesai. OK: ${summary.ok}, Skip: ${summary.skip}, Fail: ${summary.fail}`,
              });
              setOpen(false); // tutup modal saat sukses
            } else {
              setAlert({
                type: "danger",
                text: "Import gagal. Cek detail pada panel hasil di modal.",
              });
              // biarkan modal tetap terbuka supaya user bisa lihat detail fail/skip
            }
          }}
        />
      </Modal>
    </div>
  );
}
