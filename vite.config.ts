import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 8080,
    hmr: {
      overlay: false,
    },
    // The API is the Cloudflare Worker; run it locally with `npm run dev:api`.
    proxy: {
      "/api": "http://localhost:8787",
    },
  },
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Keep rarely-changing libraries in their own cacheable files.
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          dnd: ["@dnd-kit/core", "@dnd-kit/sortable", "@dnd-kit/utilities"],
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
