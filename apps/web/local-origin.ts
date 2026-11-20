import type { Plugin } from "vite";

const loopbackHosts = ["localhost", "127.0.0.1", "[::1]"];

// Browsers keep cookies and IndexedDB per origin. Move page navigations to
// the game origin before the UI loads a save or calls the API.
export function localGameOrigin(configured?: string): Plugin {
  return {
    name: "f7-local-game-origin",
    apply: "serve",
    configureServer(server) {
      const origin = configured ? new URL(configured) : undefined;
      server.middlewares.use((req, res, next) => {
        const port = req.socket.localPort;
        const host = req.headers.host;
        const path = req.url ?? "/";
        const page = path.split("?", 1)[0];
        if (
          !port ||
          !loopbackHosts.some((name) => host === `${name}:${port}`) ||
          (req.method !== "GET" && req.method !== "HEAD") ||
          !(page === "/" || /^\/[\w-]+\.html$/.test(page))
        )
          return next();

        const target = origin ?? new URL(`http://127.0.0.1:${port}`);
        if (
          target.protocol !== "http:" ||
          !loopbackHosts.includes(target.hostname) ||
          target.host === host
        )
          return next();
        res.writeHead(302, {
          Location: target.origin + path,
          "Cache-Control": "no-store",
        });
        res.end();
      });
    },
  };
}
