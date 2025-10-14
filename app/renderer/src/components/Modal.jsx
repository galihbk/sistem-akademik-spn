import { useEffect, useRef, useState } from "react";
import { useToast } from "./Toaster";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

/* ==== Utils ==== */
function buildDownloadUrl(filePath) {
  if (!filePath) return "#";
  const clean = String(filePath)
    .replace(/^\/+/, "")
    .replace(/^uploads\//i, "");
  return `${API}/download?path=${encodeURIComponent(clean)}`;
}
async function headExists(url, withAuth = true) {
  try {
    const headers = {};
    if (withAuth) {
      const token = await window.authAPI?.getToken?.();
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    const r = await fetch(url, { method: "HEAD", headers });
    return r.ok;
  } catch {
    return false;
  }
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  width = 880,
  // Opsi tombol download:
  downloadPath, // path di server → /download?path=...
  downloadUrl, // URL publik
  downloadLabel = "Download template",
}) {
  const toast = useToast();
  const [downloading, setDownloading] = useState(false);
  const unsubRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    // bersihkan listener progress saat unmount
    return () => {
      if (typeof unsubRef.current === "function") {
        try {
          unsubRef.current();
        } catch {}
        unsubRef.current = null;
      }
    };
  }, []);

  if (!open) return null;

  const showDownload = Boolean(downloadPath || downloadUrl);

  async function onDownloadClick() {
    if (!showDownload || downloading) return;

    const isRaw = !!downloadUrl;
    const targetUrl = isRaw ? downloadUrl : buildDownloadUrl(downloadPath);

    const ok = await headExists(targetUrl, !isRaw);
    if (!ok) {
      toast.show({
        type: "error",
        title: "File tidak ditemukan",
        message: "Tidak ada data / file tidak tersedia di server.",
      });
      return;
    }

    // Electron (dengan progres)
    if (window.electronAPI?.download) {
      setDownloading(true);
      const tid = toast.show({
        type: "loading",
        title: "Mengunduh…",
        message: "Menginisialisasi unduhan",
        indeterminate: true,
        duration: 0,
      });

      const off = window.electronAPI.onDownloadStatus?.((p) => {
        if (!p || p.type !== "download") return;
        if (p.phase === "start") {
          toast.update(tid, {
            message: "Unduhan dimulai…",
            indeterminate: true,
          });
        } else if (p.phase === "progress") {
          if (p.total > 0) {
            const pct = Math.min(100, Math.round((p.received / p.total) * 100));
            toast.update(tid, {
              message: `Mengunduh… ${pct}% (${p.received} / ${p.total} bytes)`,
              progress: pct / 100,
              indeterminate: false,
            });
          } else {
            toast.update(tid, { message: `Mengunduh… ${p.received} bytes` });
          }
        } else if (p.phase === "error") {
          toast.update(tid, {
            type: "error",
            title: "Gagal mengunduh",
            message: p.message || "Terjadi kesalahan saat mengunduh.",
            duration: 6000,
          });
          cleanup();
        } else if (p.phase === "done") {
          toast.update(tid, {
            type: "success",
            title: "Selesai",
            message: p.path
              ? `Tersimpan di: ${p.path}`
              : "Berkas telah diunduh.",
            progress: 1,
            duration: 5000,
          });
          cleanup();
        }
      });
      unsubRef.current = off;

      try {
        const res = await window.electronAPI.download(targetUrl);
        if (!res?.ok) {
          toast.update(tid, {
            type: "error",
            title: "Gagal mengunduh",
            message: res?.message || "Tidak dapat memulai unduhan.",
            duration: 6000,
          });
          cleanup();
        } else if (res?.path) {
          // kalau main tidak mengirim event 'done', tetap tampilkan sukses
          toast.update(tid, {
            type: "success",
            title: "Selesai",
            message: `Tersimpan di: ${res.path}`,
            progress: 1,
            duration: 5000,
          });
          cleanup();
        }
      } catch (e) {
        toast.show({
          type: "error",
          title: "Gagal mengunduh",
          message: e?.message || "Terjadi kesalahan.",
          duration: 6000,
        });
        cleanup();
      }
      function cleanup() {
        setDownloading(false);
        if (typeof unsubRef.current === "function") {
          try {
            unsubRef.current();
          } catch {}
        }
        unsubRef.current = null;
      }
      return;
    }

    // Fallback browser
    setDownloading(true);
    try {
      const a = document.createElement("a");
      a.href = targetUrl;
      a.download = "";
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.show({
        type: "success",
        title: "Unduhan dimulai",
        message: "Cek folder Downloads di browser Anda.",
        duration: 4000,
      });
    } catch (e) {
      toast.show({
        type: "error",
        title: "Gagal mengunduh",
        message: e?.message || "Terjadi kesalahan di browser.",
        duration: 6000,
      });
    } finally {
      setDownloading(false);
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
        /* gunakan token overlay agar cocok light/dark */
        background: "var(--overlay, rgba(0,0,0,.55))",
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
          background: "var(--panel)",
          color: "var(--text)", // <-- penting agar body jelas
          border: "1px solid var(--border)",
          borderRadius: 14,
          boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
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
            borderBottom: "1px solid var(--border)",
            gap: 8,
            background: "var(--panel)", // konsisten dengan tema
            color: "var(--text)",
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
                disabled={downloading}
                title={downloadLabel}
              >
                {downloading ? "⬇ Mengunduh…" : `⬇ ${downloadLabel}`}
              </button>
            )}
            <button
              className="btn"
              onClick={onClose}
              aria-label="Tutup modal"
              title="Tutup"
            >
              ✕
            </button>
          </div>
        </header>

        {/* BODY */}
        <div
          style={{
            overflow: "auto",
            padding: 14,
            background: "var(--panel-alt)", // sedikit kontras dari header
            color: "var(--text)", // <-- pastikan teks terang/gelap benar
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
