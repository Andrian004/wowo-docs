import test from "node:test";
import assert from "node:assert/strict";
import { parseArgs } from "../src/cli/args.js";

test("parses file and default port", () => {
  assert.deepEqual(parseArgs(["./openapi.yaml"]), {
    file: "./openapi.yaml",
    port: 3000,
    help: false,
    version: false,
    watch: false,
  });
});

test("parses a custom port in either form", () => {
  assert.equal(parseArgs(["./openapi.yaml", "--port", "8080"]).port, 8080);
  assert.equal(parseArgs(["--port=9000", "./openapi.yaml"]).port, 9000);
  assert.equal(parseArgs(["./openapi.yaml", "--watch"]).watch, true);
  assert.equal(parseArgs(["./openapi.yaml", "-w"]).watch, true);
});

test("rejects invalid ports and extra files", () => {
  assert.throws(() => parseArgs(["api.yaml", "--port", "70000"]), {
    code: "INVALID_PORT",
  });
  assert.throws(() => parseArgs(["one.yaml", "two.yaml"]), {
    code: "TOO_MANY_FILES",
  });
});
