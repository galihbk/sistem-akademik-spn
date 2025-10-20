// app/renderer/vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const isDev = process.env.NODE_ENV !== "production";

export default defineConfig({
  plugins: [react()],
  // penting: pakai path relatif saat production agar file:// bisa menemukan assets
  base: isDev ? "/" : "./",
  build: {
    outDir: "dist",
    assetsDir: "assets",
  },
});
