import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer as httpServer } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";
import { createServer } from "vite";
import { localGameOrigin } from "../../local-origin.ts";

test("dev page aliases preserve deep links and only redirect page reads", async (t) => {
  const canonical = "http://127.0.0.1:5174";
  const vite = await createServer({
    configFile: false,
    appType: "custom",
    logLevel: "silent",
    server: { middlewareMode: true, watch: null, hmr: false },
    optimizeDeps: { noDiscovery: true },
    plugins: [localGameOrigin(canonical)],
  });
  vite.middlewares.use((_req, res) => {
    res.writeHead(204);
    res.end();
  });
  const server = httpServer(vite.middlewares);
  t.after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await vite.close();
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const port = (server.address() as AddressInfo).port;
  const base = `http://localhost:${port}`;
  for (const path of [
    "/",
    "/account.html?mode=verify&token=example",
    "/characters.html",
  ]) {
    const res = await fetch(base + path, { redirect: "manual" });
    assert.equal(res.status, 302);
    assert.equal(res.headers.get("location"), canonical + path);
  }
  for (const [path, method] of [
    ["/api/v1/health/ready", "GET"],
    ["/", "POST"],
  ]) {
    assert.equal(
      (await fetch(base + path, { method, redirect: "manual" })).status,
      204,
    );
  }
});
