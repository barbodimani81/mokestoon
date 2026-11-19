import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const directory = (relative: string) =>
  fileURLToPath(new URL(relative, import.meta.url));
export default defineConfig({
  server: {
    strictPort: true,
    host: "127.0.0.1",
    proxy: {
      "/api": { target: `http://${process.env.HTTP_ADDR || "127.0.0.1:8080"}` },
    },
    fs: {
      allow: [
        directory("."),
        directory("../../assets/manifests"),
        directory("../../assets/runtime/spritesheets"),
      ],
    },
  },
});
