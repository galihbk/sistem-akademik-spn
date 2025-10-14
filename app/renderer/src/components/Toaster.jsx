// renderer/src/components/Toaster.jsx
import React, {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
  useEffect,
} from "react";
import { createPortal } from "react-dom";

const ToastCtx = createContext(null);
let _idSeq = 0;
const genId = () => `t_${Date.now()}_${++_idSeq}`;

/* =========================
   Provider + Global Listener
   ========================= */
export function ToasterProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const portalRef = useRef(null);

  // mount portal root
  useEffect(() => {
    const el = document.createElement("div");
    el.setAttribute("data-toaster-root", "true");
    document.body.appendChild(el);
    portalRef.current = el;
    return () => {
      document.body.removeChild(el);
    };
  }, []);

  const dismiss = (id) => setToasts((arr) => arr.filter((t) => t.id !== id));

  const clearAll = () => setToasts([]);

  const show = (opts) => {
    const id = opts.id || genId();
    const t = {
      id,
      title: opts.title ?? "",
      message: opts.message ?? "",
      type: opts.type ?? "info", // success | error | info | loading
      progress:
        typeof opts.progress === "number"
          ? Math.max(0, Math.min(100, opts.progress))
          : null,
      indeterminate: !!opts.indeterminate,
      canDismiss: opts.canDismiss ?? true,
      duration:
        typeof opts.duration === "number"
          ? opts.duration
          : opts.type === "loading"
          ? 0
          : 3500,
      actions: Array.isArray(opts.actions) ? opts.actions : null, // [{label, onClick}]
      createdAt: Date.now(),
    };
    setToasts((arr) => [t, ...arr]);
    if (t.duration > 0) setTimeout(() => dismiss(id), t.duration);
    return id;
  };

  const update = (id, patch) => {
    setToasts((arr) =>
      arr.map((t) =>
        t.id === id
          ? {
              ...t,
              ...patch,
              progress:
                "progress" in patch && patch.progress != null
                  ? Math.max(0, Math.min(100, patch.progress))
                  : t.progress,
              actions:
                "actions" in patch
                  ? Array.isArray(patch.actions)
                    ? patch.actions
                    : null
                  : t.actions,
            }
          : t
      )
    );
  };

  // sugar API
  const success = (message, opts = {}) =>
    show({ type: "success", message, ...opts });
  const error = (message, opts = {}) =>
    show({ type: "error", message, ...opts });
  const info = (message, opts = {}) => show({ type: "info", message, ...opts });
  const loading = (message, opts = {}) =>
    show({ type: "loading", message, duration: 0, ...opts });

  // expose API; kompatibel utk 2 gaya pemakaian:
  // - const toast = useToast();
  // - const { toast } = useToast();
  const api = useMemo(
    () => ({ show, update, dismiss, clearAll, success, error, info, loading }),
    []
  );
  const ctxValue = useMemo(() => ({ toast: api, ...api }), [api]);

  /* ----------------------------------------------------
     Global Electron download:status listener (optional)
     ---------------------------------------------------- */
  const idMapRef = useRef(new Map()); // key (url/path) -> toastId

  useEffect(() => {
    const off =
      window.electronAPI?.onDownloadStatus?.((p) => {
        if (!p || p.type !== "download") return;

        const key = p.url || p.path || "global-download";
        const map = idMapRef.current;
        let id = map.get(key) || null;

        if (p.phase === "progress") {
          const pct = p.total
            ? Math.min(100, Math.round((p.received / p.total) * 100))
            : undefined;
          if (!id) {
            id = loading("Mengunduh…", { autoClose: false });
            map.set(key, id);
          }
          update(id, {
            type: "loading",
            message:
              p.total && pct != null
                ? `Mengunduh… ${pct}% (${p.received} / ${p.total} bytes)`
                : `Mengunduh… ${p.received} bytes`,
            progress: pct,
            indeterminate: !(p.total > 0),
            duration: 0,
          });
        } else if (p.phase === "done") {
          if (!id) {
            id = success(`Selesai. Tersimpan di: ${p.path}`, {
              autoClose: 6000,
            });
          } else {
            update(id, {
              type: "success",
              message: `Selesai. Tersimpan di: ${p.path}`,
              progress: 100,
              indeterminate: false,
              duration: 6000,
            });
          }
          map.delete(key);
        } else if (p.phase === "error") {
          const msg = p.message || "Gagal mengunduh.";
          if (!id) {
            error(`Gagal mengunduh: ${msg}`, { autoClose: 7000 });
          } else {
            update(id, {
              type: "error",
              message: `Gagal mengunduh: ${msg}`,
              indeterminate: false,
              duration: 7000,
            });
          }
          map.delete(key);
        }
      }) || null;

    return () => {
      off && off();
      idMapRef.current.clear();
    };
  }, [loading, update, success, error]);

  return (
    <ToastCtx.Provider value={ctxValue}>
      {children}
      {portalRef.current &&
        createPortal(
          <ToastContainer toasts={toasts} onClose={dismiss} />,
          portalRef.current
        )}
    </ToastCtx.Provider>
  );
}

/* ========== Hook ========== */
export const useToast = () => {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within <ToasterProvider>");
  // dukung 2 style:
  // - const toast = useToast();
  // - const { toast } = useToast();
  return ctx.toast ?? ctx;
};

/* ========== UI ========== */

const colors = {
  bg: "#0f1424",
  bgSoft: "#0b1220",
  border: "#1f2937",
  text: "#e5e7eb",
  muted: "#9ca3af",
  success: "#16a34a",
  error: "#dc2626",
  info: "#3b82f6",
};

function ToastContainer({ toasts, onClose }) {
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      style={{
        position: "fixed",
        right: 16,
        bottom: 16,
        display: "flex",
        flexDirection: "column-reverse",
        gap: 10,
        zIndex: 5000, // tinggi agar gak ketutup modal
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onClose={() => onClose(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onClose }) {
  const icon = { success: "✓", error: "✕", info: "ℹ", loading: "⟳" }[
    toast.type
  ];
  const color =
    toast.type === "success"
      ? colors.success
      : toast.type === "error"
      ? colors.error
      : colors.info;

  return (
    <div
      role="status"
      style={{
        pointerEvents: "auto",
        minWidth: 280,
        maxWidth: 480,
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        color: colors.text,
        borderRadius: 12,
        padding: 12,
        boxShadow: "0 10px 30px rgba(0,0,0,.35)",
      }}
    >
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <div
          aria-hidden
          style={{
            width: 26,
            height: 26,
            borderRadius: 999,
            background: `${color}22`,
            color,
            display: "grid",
            placeItems: "center",
            fontWeight: 700,
            flex: "0 0 auto",
          }}
        >
          {toast.type === "loading" ? (
            <span
              style={{
                display: "inline-block",
                animation: "spin 1s linear infinite",
              }}
            >
              {icon}
            </span>
          ) : (
            icon
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {!!toast.title && (
            <div style={{ fontWeight: 700, marginBottom: 2 }}>
              {toast.title}
            </div>
          )}
          {!!toast.message && (
            <div
              style={{
                color: colors.muted,
                fontSize: 13,
                lineHeight: 1.35,
                wordBreak: "break-word",
              }}
            >
              {toast.message}
            </div>
          )}

          {(toast.type === "loading" || typeof toast.progress === "number") && (
            <div style={{ marginTop: 8 }}>
              <div
                aria-hidden
                style={{
                  height: 6,
                  width: "100%",
                  borderRadius: 999,
                  background: colors.bgSoft,
                  overflow: "hidden",
                  border: `1px solid ${colors.border}`,
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: toast.indeterminate
                      ? "30%"
                      : `${Math.max(0, Math.min(100, toast.progress ?? 0))}%`,
                    background: color,
                    borderRadius: 999,
                    transform: toast.indeterminate
                      ? "translateX(0%)"
                      : undefined,
                    animation: toast.indeterminate
                      ? "indet 1.2s ease-in-out infinite"
                      : undefined,
                  }}
                />
              </div>
              {typeof toast.progress === "number" && (
                <div
                  style={{
                    textAlign: "right",
                    fontSize: 12,
                    color: colors.muted,
                    marginTop: 4,
                  }}
                >
                  {Math.round(toast.progress)}%
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          {Array.isArray(toast.actions) && toast.actions.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: 10,
                flexWrap: "wrap",
              }}
            >
              {toast.actions.map((a, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => a.onClick?.()}
                  style={{
                    background: colors.bgSoft,
                    border: `1px solid ${colors.border}`,
                    borderRadius: 8,
                    padding: "6px 10px",
                    color: colors.text,
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  {a.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {toast.canDismiss && (
          <button
            onClick={onClose}
            title="Tutup"
            style={{
              marginLeft: 6,
              border: 0,
              background: "transparent",
              color: colors.muted,
              cursor: "pointer",
              fontSize: 18,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        )}
      </div>

      <style>
        {`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes indet {
            0% { transform: translateX(-100%); }
            50% { transform: translateX(50%); }
            100% { transform: translateX(200%); }
          }
        `}
      </style>
    </div>
  );
}
