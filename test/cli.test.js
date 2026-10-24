import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:net";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { run } from "../src/cli/index.js";

test("starts the app and passes its ready URL to the browser opener", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "wowo-cli-"));
  const filePath = path.join(directory, "api.yaml");
  await writeFile(
    filePath,
    "openapi: 3.0.3\ninfo:\n  title: Test API\n  version: 1.0.0\npaths: {}\n",
  );
  const reservation = createServer();
  await new Promise((resolve) => reservation.listen(0, "127.0.0.1", resolve));
  const { port } = reservation.address();
  await new Promise((resolve, reject) =>
    reservation.close((error) => (error ? reject(error) : resolve())),
  );

  const messages = [];
  let openedUrl;
  const instance = await run({
    argv: [filePath, "--port", String(port)],
    openBrowserFn: async (url) => {
      openedUrl = url;
    },
    output: {
      info: (message) => messages.push(message),
      success: (message) => messages.push(message),
      error: (message) => messages.push(message),
    },
    waitForShutdown: false,
  });

  try {
    assert.equal(openedUrl, instance.url);
    assert.ok(messages.includes("OpenAPI loaded"));
    assert.ok(messages.includes("Server started"));
    const page = await fetch(instance.url);
    assert.doesNotMatch(await page.text(), /new EventSource/);
    const response = await fetch(`${instance.url}/openapi.json`);
    assert.equal(response.status, 200);
  } finally {
    await instance.close();
    await rm(directory, { recursive: true, force: true });
  }
});
