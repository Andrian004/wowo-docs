# WOWO Docs

Open a local, interactive Swagger UI for an OpenAPI 3.x specification.

## Requirements

- Node.js 18 or newer

## Install and use

```bash
npm install -g wowo-docs
wowo ./openapi.yaml
```

WOWO accepts `.yaml`, `.yml`, and `.json` files. The local documentation server
binds to `127.0.0.1:3000` by default and opens your browser after it is ready.

```bash
wowo ./docs/api.yaml --port 8080
```

Press **Ctrl+C** to stop the server.

## CLI

```text
wowo <file> [options]

Options:
  -p, --port <port>    Port for the local documentation server (default: 3000)
  -h, --help           Show help
  -v, --version        Show version
```

The server only serves its documentation UI assets and the loaded
specification at `/openapi.json`; it does not expose project files.

## Development

```bash
npm install
npm test
npm run dev
```

## License

MIT
