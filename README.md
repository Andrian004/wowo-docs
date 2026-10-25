# Wowo Docs

A lightweight local documentation server for OpenAPI 3.x specifications.

WOWO Docs makes exploring your API documentation easier. Open a single OpenAPI file or scan a directory to discover specifications, then view your API documentation in an interactive browser interface.

### Features

- **Auto Discovery** — Find OpenAPI specifications in files or directories.
- **Interactive Selection** — Choose a specification when multiple files are found.
- **Live Reload** — Refresh documentation when the specification changes.
- **Local Server** — Serve documentation on a configurable port.

### Table of Contents

- [Quick Start](#quick-start)
- [Directory Discovery](#point-wowo-at-a-directory)
- [Supported Files](#supported-files)
- [Watch Mode](#watch-mode)
- [Local Server](#local-server)
- [CLI Reference](#cli)
- [Rendering](#rendering)
- [Requirements](#requirements)
- [License](#license)

---

## Quick Start

### 1. Install

```bash
npm install -g wowo-docs
```

### 2. Open an OpenAPI file

```bash
wowo ./openapi.yaml
```

That's it.

WOWO starts a local documentation server and opens the browser automatically.

```text
✔ OpenAPI specification loaded

  Local: http://127.0.0.1:8787

  Press Ctrl+C to stop.
```

---

## Point WOWO at a Directory

You don't need to know the exact OpenAPI filename.

```bash
wowo ./docs
```

WOWO recursively scans the directory for supported OpenAPI files.

### Example Project Structure

```text
my-api/
├── docs/
│   ├── openapi.yaml
│   ├── admin/
│   │   └── openapi.yaml
│   └── services/
│       ├── payment.yaml
│       └── user.yaml
│
├── src/
├── package.json
└── README.md
```

Run:

```bash
wowo ./docs
```

WOWO discovers the specifications:

```text
Found 4 OpenAPI specifications

❯ openapi.yaml
  admin/openapi.yaml
  services/payment.yaml
  services/user.yaml

↑/↓ Navigate   Enter Select   Ctrl+C Cancel
```

If only **one valid specification** is found, WOWO opens it automatically.

If **multiple specifications** are found, WOWO lets you choose one from the terminal.

---

## How WOWO Works

```text
                    wowo ./docs
                         │
                         ▼
                ┌─────────────────┐
                │ Recursive Scan  │
                └────────┬────────┘
                         │
                         ▼
                ┌─────────────────┐
                │ OpenAPI Detect  │
                │ & Validation    │
                └────────┬────────┘
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
        One specification      Multiple specs
              │                     │
              │               Arrow Selector
              │                     │
              └──────────┬──────────┘
                         ▼
                ┌─────────────────┐
                │ Local Web Server │
                └────────┬────────┘
                         │
                         ▼
                 Interactive Docs
```

---

## Supported Files

WOWO looks for:

```text
.yaml
.yml
.json
```

A file is only considered a candidate when it contains a valid OpenAPI specification.

WOWO recursively scans directories while ignoring common project directories:

```text
node_modules/
.git/
.vscode/
dist/
build/
```

WOWO does **not** expose the scanned directory through the local web server.

---

## Watch Mode

Working on an API specification?

Use:

```bash
wowo ./openapi.yaml --watch
```

or:

```bash
wowo ./docs --watch
```

When the selected specification changes:

```text
 File changed
       │
       ▼
Validate OpenAPI
       │
 ┌─────┴─────┐
 ▼           ▼
Valid     Invalid
 │           │
 ▼           ▼
Reload    Keep last
Docs      valid docs
```

Valid changes automatically reload the documentation.

If a change makes the specification invalid, WOWO reports the error in the terminal while keeping the last valid documentation available.

---

## Local Server

WOWO runs locally by default:

```text
http://127.0.0.1:8787
```

The default port is:

```text
8787
```

You can specify another port:

```bash
wowo ./openapi.yaml --port 8080
```

### Server Behavior

```text
Browser
   │
   ▼
127.0.0.1:8787
   │
   ▼
WOWO Server
   │
   ├── Documentation UI
   └── /openapi.json
```

The server only serves the documentation UI and the loaded OpenAPI specification.

It does **not** expose arbitrary project files.

If the default port is already in use, WOWO can use an available fallback port.

---

## CLI

```text
wowo <file|directory> [options]

Options:
  -p, --port <port>    Port for the local documentation server
  -w, --watch          Reload documentation when the specification changes
  -h, --help           Show help
  -v, --version        Show version
```

### Examples

```bash
# Open one specification
wowo ./openapi.yaml

# Scan a documentation directory
wowo ./docs

# Scan the current directory
wowo .

# Use a custom port
wowo ./openapi.yaml --port 8080

# Enable watch mode
wowo ./openapi.yaml --watch

# Scan a directory and watch the selected specification
wowo ./docs --watch
```

---

## Rendering

WOWO currently uses **Swagger UI** as its underlying OpenAPI documentation renderer.

This provides the familiar Swagger experience for:

- Endpoint documentation
- Parameters
- Request bodies
- Responses
- Schemas
- Authentication
- Interactive API testing

---

## Requirements

- Node.js **18 or newer**

---

## License

MIT
