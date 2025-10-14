import { useEffect, useState } from "react";

const THEME_KEY = "sa.theme"; // 'light' | 'dark'

function applyTheme(t) {
  const theme = t === "light" ? "light" : "dark";
  // pasang atribut di <html>
  document.documentElement.setAttribute("data-theme", theme);
  // optional: className di body kalau mau
  document.body.classList.toggle("theme-dark", theme === "dark");
  document.body.classList.toggle("theme-light", theme === "light");
  // simpan
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {}
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem(THEME_KEY) || "dark";
    } catch {
      return "dark";
    }
  });

  useEffect(() => {
    applyTheme(theme);
  }, []); // init sekali saat mount

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  }

  // tombol sederhana
  return (
    <button
      type="button"
      onClick={toggle}
      className="btn"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 12px",
      }}
      aria-label="Toggle theme"
      title="Ganti tema"
    >
      {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
    </button>
  );
}
