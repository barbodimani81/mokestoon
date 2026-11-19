import assert from "node:assert/strict";
import test from "node:test";
import { checkReadiness } from "../../src/api/readiness.ts";

test("only a successful readiness response confirms the connection", async () => {
  for (const [status, body, expected] of [
    [200, '{"status":"ready"}', true],
    [503, '{"status":"ready"}', false],
    [200, '{"status":"live"}', false],
    [200, "null", false],
    [200, "invalid", false],
  ] as const) {
    assert.equal(
      await checkReadiness(async () => new Response(body, { status })),
      expected,
    );
  }
  assert.equal(
    await checkReadiness(async () => {
      throw new TypeError("offline");
    }),
    false,
  );
});
