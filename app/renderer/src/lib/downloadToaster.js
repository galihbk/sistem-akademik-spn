// Pastikan semua unduhan pakai SATU toast saja.
let currentToastId = null;
let lastTick = 0;
let map = new Map(); // url -> {id, lastPct, lastTs}

export function bindDownloadToasts(toast) {
  const off = window.electronAPI?.onDownloadStatus?.((p) => {
    if (!p || p.type !== "download") return;

    // Kunci pengelompokan: url (fallback ke 'default')
    const key = p.url || "default";
    const now = Date.now();
    const rec = map.get(key) || {};

    // helper update/dismiss aman
    const update = (patch) => rec.id && toast.update(rec.id, patch);
    const dismiss = () => {
      if (rec.id) toast.dismiss(rec.id);
      map.delete(key);
    };

    // START → buat satu toast (atau refresh pesan)
    if (p.phase === "start") {
      if (!rec.id) {
        rec.id = toast.show({
          type: "loading",
          title: "Menyiapkan file…",
          message: "Mulai mengunduh",
          indeterminate: true,
          canDismiss: true,
          duration: 0,
        });
      } else {
        update({
          type: "loading",
          title: "Menyiapkan file…",
          indeterminate: true,
        });
      }
      rec.lastPct = 0;
      rec.lastTs = now;
      map.set(key, rec);
      return;
    }

    // PROGRESS → throttle biar tidak spam
    if (p.phase === "progress") {
      const pct = p.total
        ? Math.min(100, Math.round((p.received / p.total) * 100))
        : null;
      if (pct != null) {
        const changed = rec.lastPct == null || Math.abs(pct - rec.lastPct) >= 2;
        const throttled = rec.lastTs == null || now - rec.lastTs >= 80;
        if (changed && throttled) {
          update({
            type: "loading",
            title: "Mengunduh…",
            message: p.total
              ? `${pct}% (${p.received} / ${p.total} bytes)`
              : `${p.received} bytes`,
            progress: pct,
            indeterminate: false,
            duration: 0,
          });
          rec.lastPct = pct;
          rec.lastTs = now;
        }
      } else {
        update({
          type: "loading",
          title: "Mengunduh…",
          message: `${p.received} bytes`,
          indeterminate: true,
          duration: 0,
        });
      }
      map.set(key, rec);
      return;
    }

    // DONE → tandai sukses + auto tutup
    if (p.phase === "done") {
      update({
        type: "success",
        title: "Selesai",
        message: `Tersimpan di: ${p.path}`,
        progress: 100,
        indeterminate: false,
        duration: 4500, // ⬅️ auto-close
      });
      // bersihkan record setelah durasi
      setTimeout(dismiss, 4700);
      return;
    }

    // ERROR → tampilkan error + auto tutup
    if (p.phase === "error") {
      update({
        type: "error",
        title: "Gagal mengunduh",
        message: p.message || "Terjadi kesalahan.",
        indeterminate: false,
        duration: 6000, // ⬅️ auto-close
      });
      setTimeout(dismiss, 6200);
      return;
    }
  });

  return () => {
    off && off();
    map.clear();
  };
}
