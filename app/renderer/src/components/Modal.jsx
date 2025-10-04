// src/components/Modal.jsx
import { useEffect } from "react";

export default function Modal({ open, onClose, title, children, width = 880 }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

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
          }}
        >
          <div style={{ fontWeight: 800 }}>{title}</div>
          <button
            className="btn"
            onClick={onClose}
            style={{ background: "#111827", border: "1px solid #1f2937" }}
          >
            ✕
          </button>
        </header>

        <div style={{ overflow: "auto", padding: 14 }}>{children}</div>
      </div>
    </div>
  );
}
