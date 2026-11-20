import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { localGameOrigin } from "./local-origin.ts";
import { fa } from "./src/i18n/interface.ts";

const directory = (relative: string) =>
  fileURLToPath(new URL(relative, import.meta.url));
export default defineConfig({
  plugins: [
    localGameOrigin(process.env.PUBLIC_WEB_ORIGIN),
    {
      name: "persian-interface",
      transformIndexHtml(html) {
        return html.replace(/\{\{(\w+)\}\}/g, (_, key: keyof typeof fa) => {
          if (!Object.hasOwn(fa, key))
            throw new Error(`Missing translation ${key}`);
          return fa[key];
        });
      },
    },
  ],
  build: {
    rolldownOptions: {
      input: {
        account: directory("./account.html"),
        apartment: directory("./index.html"),
        characters: directory("./characters.html"),
      },
    },
  },
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
        directory("../../assets/runtime/maps"),
        directory("../../assets/runtime/audio"),
        directory("../../assets/runtime/spritesheets"),
      ],
    },
  },
});
