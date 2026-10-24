import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:net";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { run } from "../src/cli/index.js";
import { watchOpenApiFile } from "../src/watcher/watcher.js";

async function getAvailablePort() {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  return port;
}

const openApiYaml = (title) =>
  `openapi: 3.0.3\ninfo:\n  title: ${title}\n  version: 1.0.0\npaths: {}\n`;

function createOutput() {
  const messages = [];
  return {
    messages,
    output: {
      info: (message) => messages.push(message),
      success: (message) => messages.push(message),
      error: (message) => messages.push(message),
    },
  };
}

async function waitFor(predicate, timeoutMs = 4000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  assert.fail("Timed out waiting for file watcher event");
}

test("watches a file and debounces filesystem change events", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "wowo-watch-"));
  const filePath = path.join(directory, "api.yaml");
  const changes = [];
  let watcher;
  try {
    await writeFile(filePath, openApiYaml("Initial"));
    watcher = watchOpenApiFile(filePath, {
      debounceMs: 50,
      onChange: async () => changes.push("changed"),
      onError: (error) => assert.fail(error.message),
    });
    await new Promise((resolve) => setTimeout(resolve, 100));
    await writeFile(filePath, openApiYaml("Updated"));
    await waitFor(() => changes.length === 1);
    assert.equal(changes.length, 1);
  } finally {
    if (watcher) await watcher.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("serves live reload events and preserves last valid spec after invalid edits", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "wowo-watch-"));
  const filePath = path.join(directory, "api.yaml");
  await writeFile(filePath, openApiYaml("Initial API"));
  const { messages, output } = createOutput();
  let watcherCallbacks;
  let watcherClosed = false;
  const instance = await run({
    argv: [filePath, "--watch", "--port", String(await getAvailablePort())],
    output,
    openBrowserFn: async () => {},
    watchFile: (watchedPath, callbacks) => {
      assert.equal(watchedPath, filePath);
      watcherCallbacks = callbacks;
      return {
        close: async () => {
          watcherClosed = true;
        },
      };
    },
    waitForShutdown: false,
  });

  try {
    const eventResponse = await fetch(`${instance.url}/api/events`);
    const reader = eventResponse.body.getReader();
    await reader.read();

    await writeFile(filePath, openApiYaml("Updated API"));
    await watcherCallbacks.onChange();
    const reloadEvent = await reader.read();
    assert.match(new TextDecoder().decode(reloadEvent.value), /data: reload/);
    assert.equal(
      (await (await fetch(`${instance.url}/openapi.json`)).json()).info.title,
      "Updated API",
    );

    await writeFile(filePath, "openapi: [invalid");
    await watcherCallbacks.onChange();
    assert.match(messages.join("\n"), /Could not reload OpenAPI file/);
    assert.equal(
      (await (await fetch(`${instance.url}/openapi.json`)).json()).info.title,
      "Updated API",
    );

    await writeFile(filePath, openApiYaml("Recovered API"));
    await watcherCallbacks.onChange();
    await reader.read();
    assert.equal(
      (await (await fetch(`${instance.url}/openapi.json`)).json()).info.title,
      "Recovered API",
    );
  } finally {
    await instance.close();
    assert.equal(watcherClosed, true);
    await rm(directory, { recursive: true, force: true });
  }
});

test("browser page connects to the server-sent events endpoint", async () => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );

  const directory = await mkdtemp(path.join(os.tmpdir(), "wowo-watch-"));
  const filePath = path.join(directory, "api.yaml");
  await writeFile(filePath, openApiYaml("UI API"));
  const instance = await run({
    argv: [filePath, "--watch", "--port", String(port)],
    output: createOutput().output,
    openBrowserFn: async () => {},
    watchFile: () => ({ close: async () => {} }),
    waitForShutdown: false,
  });
  try {
    const page = await (await fetch(instance.url)).text();
    assert.match(page, /new EventSource\("\/api\/events"\)/);
  } finally {
    await instance.close();
    await rm(directory, { recursive: true, force: true });
  }
});
