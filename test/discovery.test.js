import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { findOpenApiSpecifications, scanDirectory } from "../src/discovery/index.js";

const openApiYaml = (title) =>
  `openapi: 3.0.3\ninfo:\n  title: ${title}\n  version: 1.0.0\npaths: {}\n`;

test("recursively scans supported files and ignores configured directories", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "wowo-discovery-"));
  try {
    await mkdir(path.join(directory, "services", "users"), { recursive: true });
    await mkdir(path.join(directory, "node_modules", "nested"), { recursive: true });
    await mkdir(path.join(directory, ".git", "nested"), { recursive: true });
    await writeFile(path.join(directory, "services", "users", "openapi.yaml"), openApiYaml("Users"));
    await writeFile(path.join(directory, "node_modules", "nested", "ignored.yaml"), openApiYaml("Ignored"));
    await writeFile(path.join(directory, ".git", "nested", "ignored.json"), "{}");
    await writeFile(path.join(directory, "notes.txt"), "not a specification");

    const files = await scanDirectory(directory);
    assert.deepEqual(files, [
      path.join(directory, "services", "users", "openapi.yaml"),
    ]);
    assert.deepEqual(await findOpenApiSpecifications(files), [
      {
        path: path.join(directory, "services", "users", "openapi.yaml"),
        title: "Users",
      },
    ]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("filters malformed YAML, non-OpenAPI files, and unsupported versions", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "wowo-discovery-"));
  try {
    const validPath = path.join(directory, "api.yaml");
    const invalidPath = path.join(directory, "config.yaml");
    const versionPath = path.join(directory, "old.json");
    const malformedPath = path.join(directory, "broken.yml");
    await writeFile(validPath, openApiYaml("Valid API"));
    await writeFile(invalidPath, "name: config\n");
    await writeFile(versionPath, JSON.stringify({
      openapi: "2.0",
      info: { title: "Old API", version: "1.0.0" },
      paths: {},
    }));
    await writeFile(malformedPath, "openapi: [");

    const found = await findOpenApiSpecifications([
      invalidPath,
      malformedPath,
      versionPath,
      validPath,
    ]);
    assert.deepEqual(found, [{ path: validPath, title: "Valid API" }]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
