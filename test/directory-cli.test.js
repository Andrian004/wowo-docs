import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:net";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { run } from "../src/cli/index.js";

async function getAvailablePort() {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  return port;
}

const writeSpec = (filePath, title) =>
  writeFile(
    filePath,
    `openapi: 3.0.3\ninfo:\n  title: ${title}\n  version: 1.0.0\npaths: {}\n`,
  );

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

test("auto-starts when a directory contains exactly one OpenAPI specification", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "wowo-directory-"));
  try {
    await mkdir(path.join(directory, "nested"));
    await writeSpec(path.join(directory, "nested", "api.yaml"), "Nested API");
    const { messages, output } = createOutput();
    let promptCalled = false;
    const instance = await run({
      argv: [directory, "--port", String(await getAvailablePort())],
      output,
      selectSpec: async () => {
        promptCalled = true;
        throw new Error("A single match must not prompt");
      },
      openBrowserFn: async () => {},
      waitForShutdown: false,
    });
    try {
      assert.equal(promptCalled, false);
      assert.ok(messages.includes("Found 1 specification: Nested API"));
      assert.equal((await fetch(`${instance.url}/openapi.json`)).status, 200);
    } finally {
      await instance.close();
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("prompts for multiple specifications and starts the selected one", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "wowo-directory-"));
  try {
    const first = path.join(directory, "first.yaml");
    const second = path.join(directory, "second.yaml");
    await writeSpec(first, "First API");
    await writeSpec(second, "Second API");
    const { messages, output } = createOutput();
    let promptedSpecs;
    const instance = await run({
      argv: [directory, "--port", String(await getAvailablePort())],
      output,
      selectSpec: async (specifications) => {
        promptedSpecs = specifications;
        return second;
      },
      openBrowserFn: async () => {},
      waitForShutdown: false,
    });
    try {
      assert.deepEqual(promptedSpecs.map(({ title }) => title), ["First API", "Second API"]);
      assert.match(messages.join("\n"), /Found 2 specifications/);
      assert.equal((await (await fetch(`${instance.url}/openapi.json`)).json()).info.title, "Second API");
    } finally {
      await instance.close();
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("returns a helpful error when no OpenAPI specifications are found", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "wowo-directory-"));
  try {
    const { output } = createOutput();
    await assert.rejects(
      run({ argv: [directory], output, waitForShutdown: false }),
      { code: "NO_SPECS_FOUND" },
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
