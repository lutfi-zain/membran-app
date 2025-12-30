import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true,
        secure: false,
        // Don't rewrite the path - keep /api prefix
        configure: (proxy, _options) => {
          proxy.on('proxyRes', (proxyRes, _req, _res) => {
            // Ensure cookies are properly forwarded
            const cookies = proxyRes.headers['set-cookie'];
            if (cookies) {
              // Modify cookie to work on localhost (remove Secure flag)
              proxyRes.headers['set-cookie'] = cookies.map((cookie: string) => {
                return cookie
                  .replace(/; Secure/i, '')
                  .replace(/; SameSite=Lax/i, '; SameSite=Lax');
              });
            }
          });
        },
      },
    },
  },
});
