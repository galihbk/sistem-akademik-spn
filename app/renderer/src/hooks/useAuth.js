// src/hooks/useAuth.js
import { useEffect, useState, useCallback } from "react";
import { checkToken } from "../api/auth";

// Ambil authAPI dari preload kalau ada; kalau tidak, pakai stub aman
function getAuthAPI() {
  if (typeof window !== "undefined" && window.authAPI) return window.authAPI;
  return {
    async getToken() {
      return null;
    },
    async setToken(_t) {
      return true;
    },
    async clearToken() {
      return true;
    },
  };
}

export default function useAuth() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const api = getAuthAPI();
      const token = await api.getToken();
      if (token) {
        // checkToken sebaiknya return boolean
        const ok = await checkToken(token);
        setAuthed(!!ok);
      } else {
        setAuthed(false);
      }
    } catch {
      setAuthed(false);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    // jalan sekali saat mount
    refresh();
  }, [refresh]);

  const login = useCallback(async (newToken) => {
    const api = getAuthAPI();
    await api.setToken?.(newToken);
    const ok = newToken ? await checkToken(newToken) : false;
    setAuthed(!!ok);
    if (!ok) {
      // kalau token invalid, bersihkan
      await api.clearToken?.();
    }
  }, []);

  const logout = useCallback(async () => {
    const api = getAuthAPI();
    await api.clearToken?.();
    setAuthed(false);
  }, []);

  return { ready, authed, setAuthed, refresh, login, logout };
}
