import { createServer as createHttpServer } from "node:http";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import type { OpenAPI } from "openapi-types";
import { getErrorCode, getErrorMessage, WowoError } from "../utils/errors.js";

const require = createRequire(import.meta.url);
const swaggerUiPath = path.dirname(
  require.resolve("swagger-ui-dist/swagger-ui.css"),
);
const indexPath = fileURLToPath(
  new URL("../../ui/index.html", import.meta.url),
);
const ASSET_TYPES = new Map([
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
]);

export interface ServerInstance {
  server: Server;
  url: string;
  updateDocument(document: OpenAPI.Document): void;
  close(): Promise<void>;
}

export interface StartServerOptions {
  document: OpenAPI.Document;
  port?: number;
  host?: string;
  watch?: boolean;
}

export async function startServer({
  document,
  port = 8787,
  host = "127.0.0.1",
  watch = false,
}: StartServerOptions): Promise<ServerInstance> {
  let html: string;
  try {
    html = await readFile(indexPath, "utf8");
  } catch (error) {
    throw new WowoError(
      `Unable to load the documentation UI: ${getErrorMessage(error)}`,
      { code: "UI_READ_ERROR", cause: error },
    );
  }
  if (watch) {
    html = html.replace(
      "</body>",
      `<script>
        const events = new EventSource("/api/events");
        events.onmessage = (event) => {
          if (event.data === "reload") window.location.reload();
        };
      </script>
      </body>`,
    );
  }
  const eventClients = new Set<ServerResponse>();
  let activeDocument = document;
  const server = createHttpServer(
    async (request: IncomingMessage, response: ServerResponse) => {
      const pathname = new URL(request.url ?? "/", "http://localhost").pathname;

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
        response.end(
          request.method === "HEAD"
            ? undefined
            : JSON.stringify(activeDocument),
        );
        return;
      }

      if (pathname === "/api/events") {
        if (request.method !== "GET") {
          response.writeHead(405, { Allow: "GET" }).end();
          return;
        }

        response.writeHead(200, {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        });
        response.write(": connected\n\n");
        eventClients.add(response);
        response.on("close", () => eventClients.delete(response));
        return;
      }

      if (pathname.startsWith("/assets/")) {
        await serveAsset(
          pathname.slice("/assets/".length),
          request.method,
          response,
        );
        return;
      }

      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
    },
  );

  try {
    await new Promise<void>((resolve, reject) => {
      const onError = (error: Error) => {
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
    if (getErrorCode(error) === "EADDRINUSE") {
      throw new WowoError(
        `Port ${port} is already in use. Try another port with --port.`,
        { code: "PORT_IN_USE", cause: error },
      );
    }
    throw new WowoError(
      `Unable to start WOWO server: ${getErrorMessage(error)}`,
      {
        code: "SERVER_ERROR",
        cause: error,
      },
    );
  }

  const address = server.address();
  const actualPort =
    typeof address === "object" && address ? address.port : port;
  return {
    server,
    url: `http://${host}:${actualPort}`,
    updateDocument(nextDocument) {
      activeDocument = nextDocument;
      for (const client of eventClients) {
        if (!client.destroyed) {
          client.write("data: reload\n\n");
        } else {
          eventClients.delete(client);
        }
      }
    },
    close: () =>
      new Promise((resolve, reject) => {
        for (const client of eventClients) client.end();
        eventClients.clear();
        server.close((error?: Error) => (error ? reject(error) : resolve()));
      }),
  };
}

async function serveAsset(
  assetName: string,
  method: string,
  response: ServerResponse,
): Promise<void> {
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
    if (getErrorCode(error) === "ENOENT") {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(500).end(getErrorMessage(error));
  }
}
