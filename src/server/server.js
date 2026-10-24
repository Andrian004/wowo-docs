import { createServer as createHttpServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { WowoError } from "../utils/errors.js";

const require = createRequire(import.meta.url);
const swaggerUiPath = path.dirname(
  require.resolve("swagger-ui-dist/swagger-ui.css"),
);
const indexPath = fileURLToPath(new URL("../../ui/index.html", import.meta.url));
const ASSET_TYPES = new Map([
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
]);

export async function startServer({ document, port = 3000, host = "127.0.0.1" }) {
  const html = await readFile(indexPath);
  const server = createHttpServer(async (request, response) => {
    const pathname = new URL(request.url, "http://localhost").pathname;

    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { Allow: "GET, HEAD" }).end();
      return;
    }

    if (pathname === "/") {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(request.method === "HEAD" ? undefined : html);
      return;
    }

    if (pathname === "/openapi.json") {
      response.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      });
      response.end(request.method === "HEAD" ? undefined : JSON.stringify(document));
      return;
    }

    if (pathname.startsWith("/assets/")) {
      await serveAsset(pathname.slice("/assets/".length), request.method, response);
      return;
    }

    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  });

  try {
    await new Promise((resolve, reject) => {
      const onError = (error) => {
        server.off("listening", onListening);
        reject(error);
      };
      const onListening = () => {
        server.off("error", onError);
        resolve();
      };
      server.once("error", onError);
      server.once("listening", onListening);
      server.listen(port, host);
    });
  } catch (error) {
    if (error.code === "EADDRINUSE") {
      throw new WowoError(
        `Port ${port} is already in use. Try another port with --port.`,
        { code: "PORT_IN_USE", cause: error },
      );
    }
    throw new WowoError(`Unable to start WOWO server: ${error.message}`, {
      code: "SERVER_ERROR",
      cause: error,
    });
  }

  const address = server.address();
  const actualPort = typeof address === "object" && address ? address.port : port;
  return {
    server,
    url: `http://${host}:${actualPort}`,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

async function serveAsset(assetName, method, response) {
  if (!/^[a-zA-Z0-9._-]+$/.test(assetName)) {
    response.writeHead(400).end();
    return;
  }

  const extension = path.extname(assetName).toLowerCase();
  const contentType = ASSET_TYPES.get(extension);
  if (!contentType) {
    response.writeHead(404).end();
    return;
  }

  try {
    const asset = await readFile(path.join(swaggerUiPath, assetName));
    response.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600",
    });
    response.end(method === "HEAD" ? undefined : asset);
  } catch (error) {
    if (error.code === "ENOENT") {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(500).end();
  }
}
