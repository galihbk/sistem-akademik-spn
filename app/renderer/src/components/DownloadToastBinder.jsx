import { useEffect, useRef } from "react";
import { useToast } from "./Toaster";

/**
 * Mengikat event download dari Electron ke Toaster.
 * - Satu URL = satu toast.
 * - Progress di-update, lalu otomatis menjadi Selesai/Gagal dan ditutup.
 * - Mencegah duplikasi toast "Selesai".
 */
export default function DownloadToasterBinder() {
  const toast = useToast();
  // Map url -> { id, phase }
  const mapRef = useRef(new Map());

  useEffect(() => {
    const off = window.electronAPI?.onDownloadStatus?.((p) => {
      if (!p || p.type !== "download" || !p.url) return;

      const map = mapRef.current;
      let rec = map.get(p.url);

      const ensureToast = (initialTitle = "Menyiapkan file…") => {
        if (!rec) {
          const id = toast.show({
            type: "loading",
            title: initialTitle,
            message: "",
            indeterminate: true,
            canDismiss: true,
            duration: 0, // manual close via update
          });
          rec = { id, phase: "start" };
          map.set(p.url, rec);
        }
        return rec.id;
      };

      if (p.phase === "progress") {
        const id = ensureToast("Mengunduh…");
        const total = Number(p.total || 0);
        const received = Number(p.received || 0);
        if (total > 0) {
          const pct = Math.min(100, Math.round((received / total) * 100));
          toast.update(id, {
            type: "loading",
            title: "Mengunduh…",
            message: `Mengunduh… ${pct}% (${received} / ${total} bytes)`,
            progress: pct,
            indeterminate: false,
            duration: 0,
          });
        } else {
          toast.update(id, {
            type: "loading",
            title: "Mengunduh…",
            message: `Mengunduh… ${received} bytes`,
            indeterminate: true,
            duration: 0,
          });
        }
        rec.phase = "progress";
      } else if (p.phase === "done") {
        const id = ensureToast("Mengunduh…");
        // Update toast YANG SAMA → tidak membuat toast baru
        toast.update(id, {
          type: "success",
          title: "Selesai",
          message: p.path ? `Tersimpan di: ${p.path}` : "Unduhan selesai.",
          progress: 100,
          indeterminate: false,
          duration: 4500, // auto-close
        });
        rec.phase = "done";
        // cleanup map sesudah auto-close
        setTimeout(() => {
          toast.dismiss(id);
          map.delete(p.url);
        }, 4600);
      } else if (p.phase === "error") {
        const id = ensureToast("Mengunduh…");
        toast.update(id, {
          type: "error",
          title: "Gagal mengunduh",
          message: p.message || "Terjadi kesalahan.",
          indeterminate: false,
          duration: 6000,
        });
        rec.phase = "error";
        setTimeout(() => {
          toast.dismiss(id);
          map.delete(p.url);
        }, 6100);
      }
    });

    return () => {
      off && off();
      // bersihkan sisa-sisa toast saat unmount
      mapRef.current.forEach(({ id }) => toast.dismiss(id));
      mapRef.current.clear();
    };
  }, [toast]);

  return null;
}
