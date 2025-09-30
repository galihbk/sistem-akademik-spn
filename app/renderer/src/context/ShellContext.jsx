import { createContext, useContext } from "react";

export const ShellContext = createContext({
  angkatan: "", // nilai terpilih di header
  setAngkatan: () => {}, // setter dari Shell
});

export function useShell() {
  return useContext(ShellContext);
}
