// src/components/Modal.jsx
import { useEffect } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

// --- Utils kecil: samakan perilaku dengan SiswaDetail ---
function buildDownloadUrl(filePath) {
  if (!filePath) return "#";
  const clean = String(filePath)
    .replace(/^\/+/, "")
    .replace(/^uploads\//i, "");
  return `${API}/download?path=${encodeURIComponent(clean)}`;
}

async function handleDownloadLikeApp({ url, isRaw = false }) {
  const targetUrl = isRaw ? url : buildDownloadUrl(url);

  try {
    // HEAD check seperti di SiswaDetail
    const head = await fetch(targetUrl, { method: "HEAD" });
    if (!head.ok) {
      alert("Tidak ada data / file tidak ditemukan.");
      return;
    }
  } catch (e) {
    alert("Gagal memeriksa file: " + (e?.message || "unknown"));
    return;
  }

  // Electron-aware download
  if (window.electronAPI?.download) {
    window.electronAPI.download(targetUrl);
  } else {
    const a = document.createElement("a");
    a.href = targetUrl;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  width = 880,

  // ✅ Opsi tombol download ala aplikasi desktop:
  // - pilih salah satu:
  downloadPath, // string: path di server → akan jadi /download?path=...
  downloadUrl, // string: URL langsung (public/CDN)
  downloadLabel = "Download template",
}) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const showDownload = Boolean(downloadPath || downloadUrl);

  async function onDownloadClick() {
    if (downloadUrl) {
      // URL langsung (raw)
      await handleDownloadLikeApp({ url: downloadUrl, isRaw: true });
    } else if (downloadPath) {
      // Path ke server → /download?path=...
      await handleDownloadLikeApp({ url: downloadPath, isRaw: false });
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(3,10,24,0.72)",
        backdropFilter: "blur(2px)",
        zIndex: 1000,
        display: "grid",
        placeItems: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: width,
          background: "#0b1220",
          color: "#e2e8f0",
          border: "1px solid #1f2937",
          borderRadius: 14,
          boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
          display: "grid",
          gridTemplateRows: "56px 1fr",
          maxHeight: "86vh",
          overflow: "hidden",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 14px",
            borderBottom: "1px solid #1f2937",
            gap: 8,
          }}
        >
          <div
            style={{
              fontWeight: 800,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {showDownload && (
              <button
                type="button"
                onClick={onDownloadClick}
                className="btn"
                style={{
                  background: "#0ea5e9",
                  border: "1px solid #0284c7",
                  color: "#0b1220",
                  fontWeight: 700,
                  padding: "8px 12px",
                  borderRadius: 10,
                }}
                aria-label={downloadLabel}
                title={downloadLabel}
              >
                ⬇ {downloadLabel}
              </button>
            )}

            <button
              className="btn"
              onClick={onClose}
              aria-label="Tutup modal"
              style={{
                background: "#111827",
                border: "1px solid #1f2937",
                color: "#e5e7eb",
                fontWeight: 700,
                padding: "8px 12px",
                borderRadius: 10,
              }}
            >
              ✕
            </button>
          </div>
        </header>

        <div style={{ overflow: "auto", padding: 14 }}>{children}</div>
      </div>
    </div>
  );
}
