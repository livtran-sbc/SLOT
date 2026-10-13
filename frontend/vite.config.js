import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler"]],
      },
    }),
  ],
  server: {
    proxy: {
      "/api/link-micronic-codes": "http://127.0.0.1:8000",
      "/api/assign-fb-barcode": "http://127.0.0.1:8000",
      "/api/validate-micronic-file": "http://127.0.0.1:8000",
      "/api/assign-freezer-location": "http://127.0.0.1:8000",
      "/api/verify-tube-location": "http://127.0.0.1:8000", 
      "/api/sso-verification": "http://127.0.0.1:8000",
      "/api/upload-ngs": "http://127.0.0.1:8000", 
      "/api/check-ngs-tray": "http://127.0.0.1:8000", 
      "/api/query-db": "http://127.0.0.1:8000"
    },
  },
});
