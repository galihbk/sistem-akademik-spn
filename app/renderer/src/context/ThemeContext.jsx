import { createContext, useContext, useEffect, useMemo, useState } from "react";

const ThemeContext = createContext({
  theme: "system",
  effective: "light",
  setTheme: () => {},
});
const KEY = "sa.theme";

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(
    () => localStorage.getItem(KEY) || "system"
  );

  const systemDark = useMemo(() => {
    if (!window.matchMedia) return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }, []);
  const effective =
    theme === "system" ? (systemDark ? "dark" : "light") : theme;

  useEffect(() => {
    localStorage.setItem(KEY, theme);
  }, [theme]);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", effective);
  }, [effective]);

  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (theme === "system")
        document.documentElement.setAttribute(
          "data-theme",
          mq.matches ? "dark" : "light"
        );
    };
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, effective, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
export function useTheme() {
  return useContext(ThemeContext);
}
