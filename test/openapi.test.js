import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { loadOpenApi } from "../src/openapi/loader.js";
import { validateOpenApi } from "../src/openapi/validator.js";

const validDocument = {
  openapi: "3.0.3",
  info: { title: "Test API", version: "1.0.0" },
  paths: {},
};

test("loads YAML and JSON OpenAPI documents", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "wowo-"));
  try {
    const yamlPath = path.join(directory, "api.yaml");
    const jsonPath = path.join(directory, "api.json");
    await writeFile(yamlPath, "openapi: 3.0.3\ninfo:\n  title: Test API\n  version: 1.0.0\npaths: {}\n");
    await writeFile(jsonPath, JSON.stringify(validDocument));

    assert.deepEqual((await loadOpenApi(yamlPath)).document, validDocument);
    assert.deepEqual((await loadOpenApi(jsonPath)).document, validDocument);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("reports missing, unsupported, and malformed files", async () => {
  await assert.rejects(loadOpenApi("missing-wowo.yaml"), { code: "FILE_NOT_FOUND" });
  await assert.rejects(loadOpenApi("not-openapi.txt"), { code: "INVALID_EXTENSION" });

  const directory = await mkdtemp(path.join(os.tmpdir(), "wowo-"));
  try {
    const malformedPath = path.join(directory, "bad.yaml");
    await writeFile(malformedPath, "openapi: [");
    await assert.rejects(loadOpenApi(malformedPath), { code: "PARSE_ERROR" });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("validates OpenAPI 3.x and rejects unsupported versions", async () => {
  assert.equal(await validateOpenApi(validDocument), validDocument);
  await assert.rejects(
    validateOpenApi({ ...validDocument, openapi: "2.0" }),
    { code: "UNSUPPORTED_OPENAPI_VERSION" },
  );
  await assert.rejects(
    validateOpenApi({ info: validDocument.info, paths: {} }),
    { code: "INVALID_OPENAPI" },
  );
  await assert.rejects(
    validateOpenApi({ openapi: "3.0.3", info: {}, paths: {} }),
    { code: "INVALID_OPENAPI" },
  );
});
