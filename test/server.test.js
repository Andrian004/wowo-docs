import test from "node:test";
import assert from "node:assert/strict";
import { startServer } from "../src/server/server.js";

const document = {
  openapi: "3.0.3",
  info: { title: "Test API", version: "1.0.0" },
  paths: {},
};

test("serves documentation, the spec, and Swagger UI assets on loopback", async () => {
  const instance = await startServer({ document, port: 0 });
  try {
    const root = await fetch(instance.url);
    assert.equal(root.status, 200);
    assert.match(await root.text(), /swagger-ui-bundle\.js/);

    const spec = await fetch(`${instance.url}/openapi.json`);
    assert.equal(spec.status, 200);
    assert.deepEqual(await spec.json(), document);

    const asset = await fetch(`${instance.url}/assets/swagger-ui.css`);
    assert.equal(asset.status, 200);
    assert.match(asset.headers.get("content-type"), /text\/css/);

    assert.equal((await fetch(`${instance.url}/package.json`)).status, 404);
  } finally {
    await instance.close();
  }
});
