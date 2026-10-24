# WOWO Docs

Open a local, interactive Swagger UI for an OpenAPI 3.x specification.
Point WOWO at a directory to discover and select specifications recursively.

## Requirements

- Node.js 18 or newer

## Install and use

```bash
npm install -g wowo-docs
wowo ./openapi.yaml
```

WOWO accepts `.yaml`, `.yml`, and `.json` files. The local documentation server
binds to `127.0.0.1:8787` by default and opens your browser after it is ready.
You can also scan a directory; one matching specification starts automatically,
and multiple matches are presented in an arrow-key selector:

```bash
wowo ./docs/api.yaml --port 8080
wowo ./docs
wowo .
wowo ./openapi.yaml --watch
```

Directory discovery recursively checks supported file extensions and ignores
`node_modules`, `.git`, `.vscode`, `dist`, and `build`.
Use `--watch` (or `-w`) to monitor the selected specification; valid saves
update the browser automatically, while invalid saves are reported in the
terminal and leave the last valid documentation available.

Press **Ctrl+C** to stop the server.

## CLI

```text
wowo <file|directory> [options]

Options:
  -p, --port <port>    Port for the local documentation server (default: 8787)
  -w, --watch          Reload documentation when the specification changes
  -h, --help           Show help
  -v, --version        Show version
```

The server only serves its documentation UI assets and the loaded
specification at `/openapi.json`; it does not expose project files.

## Development

```bash
npm install
npm run build
npm run typecheck
npm test
npm run dev
```

The TypeScript sources are bundled to `dist/` with tsdown. `npm pack` builds
the package before creating the tarball.

## License

MIT
