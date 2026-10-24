# WOWO Docs — v0.1
## Product Requirements Document (PRD) & Implementation Specification

> **Status:** Draft / Implementation Blueprint  
> **Version:** v0.1.0  
> **Package:** `wowo-docs`  
> **CLI:** `wowo`  
> **Primary goal:** Open an OpenAPI specification as local interactive documentation with a single command.

---

# 1. Product Overview

**WOWO Docs** is a developer-focused CLI tool for viewing OpenAPI documentation locally without requiring users to manually configure a documentation server.

The core experience should be:

```bash
wowo ./openapi.yaml
```

WOWO will:

1. Receive an OpenAPI file path.
2. Validate that the target exists and is supported.
3. Parse the OpenAPI document.
4. Start a local HTTP server.
5. Serve an interactive documentation UI.
6. Automatically open the documentation in the user's default browser.
7. Stop cleanly when the CLI process is terminated.

The v0.1 release intentionally focuses on **one OpenAPI file at a time**.

Directory discovery, multiple-spec switching, live reload, plugins, and advanced configuration are explicitly postponed to later versions.

---

# 2. Product Vision

The long-term vision is:

> **WOWO — Point it at your OpenAPI. We handle the rest.**

Example future experience:

```text
wowo .
       │
       ▼
  Find OpenAPI files
       │
       ▼
 ┌───────────────────┐
 │ User API          │
 │ Payment API       │
 │ Admin API         │
 └───────────────────┘
       │
       ▼
 Interactive API Docs
```

For v0.1, only the first part of this experience is implemented:

```text
wowo ./openapi.yaml
       │
       ▼
   Validate
       │
       ▼
 Start local server
       │
       ▼
 Open browser
       │
       ▼
 OpenAPI documentation
```

---

# 3. Problem Statement

Developers frequently have OpenAPI specifications but need additional setup to view them.

A typical workflow may involve:

- installing or configuring Swagger UI,
- configuring Redoc,
- running a separate documentation server,
- manually opening an HTML file,
- remembering the correct command,
- configuring the path to the specification.

WOWO should reduce this friction to one command:

```bash
wowo ./openapi.yaml
```

The user should not need to understand how the documentation UI is hosted internally.

---

# 4. Goals

## 4.1 Primary Goals

v0.1 MUST:

- Provide a global executable named `wowo`.
- Accept a local `.yaml` or `.yml` OpenAPI file.
- Validate the target path.
- Read the specification.
- Parse YAML.
- Detect whether the document is an OpenAPI specification.
- Support OpenAPI 3.x.
- Start a local HTTP server.
- Render the specification as interactive API documentation.
- Automatically open the browser.
- Display useful CLI feedback.
- Handle common errors gracefully.
- Shut down cleanly.

## 4.2 Secondary Goals

v0.1 SHOULD:

- Support JSON OpenAPI files if implementation is simple.
- Allow a custom port.
- Avoid port conflicts when possible.
- Provide a `--help` command.
- Provide a `--version` command.
- Make the internal architecture ready for future multiple-spec support.

---

# 5. Non-Goals

The following are intentionally OUT OF SCOPE for v0.1:

- Recursive directory scanning.
- Multiple OpenAPI specification switching.
- File selection UI.
- Live reload.
- Watch mode.
- Plugin/tool system.
- Remote URL specifications.
- OpenAPI bundling.
- OpenAPI linting.
- OpenAPI editing.
- Authentication handling.
- API mocking.
- API request proxying.
- API testing workflows.
- Custom themes.
- Persistent configuration files.
- Cloud deployment.
- Building a custom OpenAPI renderer from scratch.

These features may be considered for future releases.

---

# 6. Target User

Primary users:

- Backend developers.
- Full-stack developers.
- API developers.
- DevOps engineers.
- Developers maintaining OpenAPI specifications.
- Teams that frequently inspect local API documentation.

Typical scenario:

```text
Developer writes API
        │
        ▼
Updates openapi.yaml
        │
        ▼
$ wowo ./openapi.yaml
        │
        ▼
Browser opens
        │
        ▼
API documentation
```

---

# 7. User Stories

## US-01 — Open OpenAPI Documentation

> As a developer, I want to run `wowo ./openapi.yaml` so that I can immediately view my API documentation in a browser.

Acceptance criteria:

- The file is found.
- The specification is parsed.
- A local server starts.
- The browser opens automatically.
- The API documentation is visible.

---

## US-02 — Invalid File

> As a developer, I want a clear error when the specified file does not exist.

Example:

```text
$ wowo ./missing.yaml

✖ File not found:
  ./missing.yaml
```

The process exits with a non-zero exit code.

---

## US-03 — Invalid Specification

> As a developer, I want a clear error when the YAML file is not a valid OpenAPI document.

Example:

```text
$ wowo ./config.yaml

✖ Invalid OpenAPI specification.

  Missing required field:
  openapi
```

---

## US-04 — Custom Port

> As a developer, I want to specify a port when the default port is unavailable.

Example:

```bash
wowo ./openapi.yaml --port 8080
```

---

## US-05 — Help

> As a developer, I want to understand how to use WOWO from the CLI.

Example:

```bash
wowo --help
```

---

# 8. CLI Specification

## 8.1 Basic Command

```bash
wowo <file>
```

Example:

```bash
wowo ./openapi.yaml
```

---

## 8.2 Supported File Extensions

Required:

```text
.yaml
.yml
```

Optional:

```text
.json
```

JSON support is recommended if it does not significantly complicate v0.1.

---

## 8.3 CLI Options

### `--help`

```bash
wowo --help
```

Expected output:

```text
WOWO — Local OpenAPI Documentation

Usage:
  wowo <file> [options]

Arguments:
  <file>               Path to an OpenAPI specification

Options:
  -p, --port <port>    Port to run the documentation server
  -h, --help           Show help
  -v, --version        Show version

Examples:
  wowo ./openapi.yaml
  wowo ./docs/api.yaml
  wowo ./openapi.yaml --port 8080
```

---

### `--version`

```bash
wowo --version
```

Expected:

```text
wowo 0.1.0
```

---

### `--port`

```bash
wowo ./openapi.yaml --port 8080
```

Default:

```text
3000
```

The default port may be changed during implementation if a better convention is selected.

---

# 9. CLI Output

The CLI should have a clean developer-oriented output.

Successful startup:

```text
WOWO

  OpenAPI documentation is ready.

  Spec
    ./openapi.yaml

  Server
    http://localhost:3000

  Press Ctrl+C to stop.
```

A slightly more expressive implementation may use symbols:

```text
  ✓ OpenAPI loaded
  ✓ Server started
  ✓ Browser opened

  Docs:
  http://localhost:3000
```

Avoid excessive output.

WOWO should feel like a small developer utility, not a build system.

---

# 10. High-Level Architecture

```text
┌─────────────────────────────┐
│            CLI              │
│        wowo <file>          │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│       Argument Parser       │
│                             │
│ file / port / help / version│
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│      File Resolver          │
│                             │
│ exists? readable? extension?│
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│      OpenAPI Loader         │
│                             │
│ YAML / JSON → JS Object     │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│      OpenAPI Validator      │
│                             │
│ OpenAPI 3.x?                │
│ required fields?            │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│       Local Server          │
│                             │
│ GET /                       │
│ GET /openapi.json           │
│ GET /assets/*               │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│       Documentation UI      │
│                             │
│ Swagger UI / Redoc          │
└──────────────┬──────────────┘
               │
               ▼
          Web Browser
```

---

# 11. Recommended Technology Stack

## Runtime

Use:

```text
Node.js
```

Recommended baseline:

```text
Node.js >= 18
```

The exact minimum version should be finalized based on the dependency requirements.

---

## Language

Recommended:

```text
JavaScript
```

TypeScript may be introduced later.

For v0.1, JavaScript keeps the package simple and reduces build complexity.

---

## CLI Framework

A small argument parser should be used.

Possible choices:

- `commander`
- `yargs`
- Node.js native argument parsing

Recommendation:

```text
commander
```

Reason:

- mature,
- simple,
- good help output,
- easy option handling,
- appropriate for a small CLI.

---

## YAML Parser

Use:

```text
yaml
```

Responsibilities:

```text
YAML string
    ↓
JavaScript object
```

---

## OpenAPI Validation

Use an OpenAPI-aware validation library rather than implementing the OpenAPI schema manually.

The validator should at minimum verify:

```text
openapi
info
paths
```

and identify the specification version.

The exact validation library can be selected during implementation based on compatibility and maintenance status.

---

## Documentation Renderer

Do NOT implement an OpenAPI renderer from scratch in v0.1.

Recommended choices:

```text
Swagger UI
```

or:

```text
Redoc
```

The renderer should be treated as an internal presentation engine.

WOWO's core value is the developer experience around discovering, serving, and opening the documentation.

---

# 12. Internal Data Flow

The main execution flow should be:

```text
argv
 │
 ▼
parseArgs()
 │
 ▼
resolveFile()
 │
 ▼
readFile()
 │
 ▼
parseSpecification()
 │
 ▼
validateSpecification()
 │
 ▼
createServer()
 │
 ▼
openBrowser()
 │
 ▼
waitForShutdown()
```

Pseudo-code:

```js
async function main() {
  const options = parseArgs(process.argv);

  if (options.help) {
    showHelp();
    return;
  }

  if (options.version) {
    showVersion();
    return;
  }

  const file = await resolveFile(options.file);

  const document = await loadOpenApi(file);

  validateOpenApi(document);

  const server = await startServer({
    document,
    port: options.port,
  });

  await openBrowser(server.url);

  await waitForShutdown(server);
}
```

---

# 13. Project Structure

Recommended initial structure:

```text
wowo-docs/
│
├── bin/
│   └── wowo.js
│
├── src/
│   ├── cli/
│   │   ├── args.js
│   │   └── help.js
│   │
│   ├── openapi/
│   │   ├── loader.js
│   │   └── validator.js
│   │
│   ├── server/
│   │   ├── server.js
│   │   └── routes.js
│   │
│   ├── browser/
│   │   └── open.js
│   │
│   └── utils/
│       ├── errors.js
│       └── logger.js
│
├── ui/
│   ├── index.html
│   └── ...
│
├── test/
│   ├── cli.test.js
│   ├── loader.test.js
│   ├── validator.test.js
│   └── server.test.js
│
├── examples/
│   └── openapi.yaml
│
├── package.json
├── README.md
├── LICENSE
└── .gitignore
```

---

# 14. Module Responsibilities

## `bin/wowo.js`

Entry point for the executable.

Responsibilities:

- execute the CLI,
- forward arguments,
- handle fatal errors.

Example:

```js
#!/usr/bin/env node

import { run } from "../src/cli/index.js";

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

Keep the executable thin.

Business logic should NOT live in `bin/wowo.js`.

---

# 15. CLI Argument Parser

`src/cli/args.js`

Responsibilities:

- parse command-line arguments,
- validate basic option syntax,
- return normalized options.

Expected output:

```js
{
  file: "./openapi.yaml",
  port: 3000,
  help: false,
  version: false
}
```

The parser should not read files or start servers.

Separation of concerns:

```text
args.js
  ↓
only arguments

loader.js
  ↓
only file loading

validator.js
  ↓
only validation

server.js
  ↓
only HTTP server
```

---

# 16. File Resolution

`src/openapi/loader.js`

Responsibilities:

1. Check that a path was provided.
2. Resolve relative paths.
3. Verify existence.
4. Verify it is a file.
5. Verify supported extension.
6. Read the file.
7. Parse the content.

Example:

```js
const path = resolve(inputPath);
```

Then:

```text
Does file exist?
       │
   ┌───┴───┐
   │       │
  yes      no
   │       │
   ▼       ▼
continue  error
```

---

# 17. YAML / JSON Loading

The loader should support:

```text
.yaml
.yml
.json
```

Example:

```js
async function loadOpenApi(filePath) {
  const content = await fs.readFile(filePath, "utf8");

  if (isJson(filePath)) {
    return JSON.parse(content);
  }

  return YAML.parse(content);
}
```

Parsing errors must be converted into a user-friendly WOWO error.

Bad:

```text
YAMLParseError: Implicit keys need to be on a single line...
```

Better:

```text
✖ Failed to parse OpenAPI file.

  File:
    ./openapi.yaml

  The YAML document contains invalid syntax.
```

The original parser error may be included in debug-oriented output later.

---

# 18. OpenAPI Validation

The validator should determine whether the parsed document is actually an OpenAPI specification.

Minimum detection:

```js
document.openapi
```

Example:

```yaml
openapi: 3.0.3
```

or:

```yaml
openapi: 3.1.0
```

The validator should reject unrelated YAML files.

Example:

```yaml
name: my-config
database:
  host: localhost
```

Expected:

```text
✖ Not an OpenAPI specification.

  The file does not contain a valid `openapi` version.
```

---

# 19. OpenAPI Version Support

v0.1 target:

```text
OpenAPI 3.0.x
OpenAPI 3.1.x
```

Swagger/OpenAPI 2.0 support is optional.

If Swagger 2.0 is not supported, the error should be explicit:

```text
✖ Unsupported OpenAPI version: 2.0

  WOWO v0.1 supports OpenAPI 3.x.
```

Do not silently treat unsupported versions as valid.

---

# 20. Local HTTP Server

The server should expose a local documentation website.

Example:

```text
http://localhost:3000
```

Basic route architecture:

```text
GET /
    │
    ▼
Documentation UI

GET /openapi.json
    │
    ▼
Normalized OpenAPI document

GET /assets/*
    │
    ▼
UI assets
```

---

# 21. Why Serve OpenAPI Through HTTP?

Do not rely on opening:

```text
file:///path/to/index.html
```

because browser security policies can cause issues with:

- fetch requests,
- local resources,
- CORS,
- relative assets,
- loading the OpenAPI document.

Instead:

```text
Browser
   │
   ▼
http://localhost:3000
   │
   ├── /
   ├── /openapi.json
   └── /assets/*
```

This gives the documentation UI a predictable web environment.

---

# 22. OpenAPI Endpoint

Expose the loaded specification through:

```text
GET /openapi.json
```

Response:

```http
Content-Type: application/json
```

Body:

```json
{
  "openapi": "3.0.3",
  "info": {
    "title": "Example API",
    "version": "1.0.0"
  },
  "paths": {}
}
```

Even if the original file was YAML, the server can normalize it to JSON for the UI.

---

# 23. Documentation UI

The UI should consume:

```text
/openapi.json
```

Architecture:

```text
                 Local Server
                     │
          ┌──────────┴──────────┐
          │                     │
          ▼                     ▼
      index.html          /openapi.json
          │                     │
          └──────────┬──────────┘
                     ▼
               Swagger UI
                     │
                     ▼
              Render API Docs
```

The renderer should be configured to load the local specification endpoint.

---

# 24. Browser Opening

After the server is ready:

```text
start server
     │
     ▼
http://localhost:3000
     │
     ▼
open default browser
```

Important:

**Do not open the browser before the server is listening.**

Correct:

```js
const server = await startServer();

await openBrowser(server.url);
```

Incorrect:

```js
openBrowser("http://localhost:3000");
startServer();
```

The second approach can race against server startup.

---

# 25. Browser Module

Create:

```text
src/browser/open.js
```

API:

```js
openBrowser(url)
```

The module should abstract platform-specific browser opening.

Conceptually:

```text
Linux   → open command
macOS   → open command
Windows → start command
```

Do not scatter operating-system checks throughout the application.

---

# 26. Port Handling

Default:

```text
3000
```

Example:

```bash
wowo ./openapi.yaml
```

→

```text
http://localhost:3000
```

Custom:

```bash
wowo ./openapi.yaml --port 8080
```

→

```text
http://localhost:8080
```

If the port is already occupied:

```text
✖ Unable to start WOWO server.

  Port 3000 is already in use.

  Try:
    wowo ./openapi.yaml --port 3001
```

An automatic fallback port may be implemented later.

---

# 27. Server Lifecycle

The server should remain alive until the user terminates the process.

Expected:

```text
$ wowo ./openapi.yaml

WOWO

✓ Documentation ready
→ http://localhost:3000

Press Ctrl+C to stop.
```

Then:

```text
Ctrl+C
```

should trigger:

```text
SIGINT
  │
  ▼
close server
  │
  ▼
exit 0
```

Also consider:

```text
SIGTERM
```

for process managers and automated environments.

---

# 28. Error Handling

Errors should be categorized.

## Input Errors

Examples:

```text
File not found
Unsupported extension
Missing argument
```

Exit code:

```text
1
```

---

## Parse Errors

Examples:

```text
Invalid YAML
Invalid JSON
```

Exit code:

```text
1
```

---

## Validation Errors

Examples:

```text
Not an OpenAPI document
Unsupported OpenAPI version
Invalid required fields
```

Exit code:

```text
1
```

---

## Server Errors

Examples:

```text
Port already in use
Unable to bind server
```

Exit code:

```text
1
```

---

# 29. Error Object Design

Internally, use a recognizable error type.

Example:

```js
class WowoError extends Error {
  constructor(message, options = {}) {
    super(message);

    this.name = "WowoError";
    this.code = options.code;
    this.details = options.details;
  }
}
```

Possible codes:

```text
FILE_NOT_FOUND
INVALID_EXTENSION
FILE_READ_ERROR
PARSE_ERROR
INVALID_OPENAPI
UNSUPPORTED_OPENAPI_VERSION
SERVER_ERROR
PORT_IN_USE
```

This makes error handling easier to test and extend.

---

# 30. Logging

Create a small logger abstraction.

Example:

```js
logger.info("Documentation ready");
logger.success("Server started");
logger.warn("...");
logger.error("...");
```

Avoid making the rest of the application depend directly on `console.log`.

This gives the project flexibility for future:

- quiet mode,
- verbose mode,
- colored output,
- structured logs.

---

# 31. Security Considerations

Although WOWO is primarily a local developer tool, it should not unnecessarily expose the documentation server to the network.

Default binding:

```text
127.0.0.1
```

Prefer:

```text
http://127.0.0.1:3000
```

rather than:

```text
0.0.0.0
```

unless the user explicitly requests network access.

The v0.1 server should therefore be local-only by default.

---

# 32. File Access Considerations

WOWO should only read the file explicitly provided by the user.

Example:

```bash
wowo ./docs/openapi.yaml
```

The server should not automatically expose the entire project directory.

Avoid:

```text
GET /../../package.json
GET /../../.env
```

The HTTP server should serve only:

- documentation UI assets,
- the normalized OpenAPI specification.

The original filesystem should not become a static file server.

---

# 33. Example OpenAPI Specification

Create:

```text
examples/openapi.yaml
```

Example:

```yaml
openapi: 3.0.3

info:
  title: Example API
  description: Example API used for WOWO development.
  version: 1.0.0

servers:
  - url: https://api.example.com

paths:
  /users:
    get:
      summary: Get users
      responses:
        "200":
          description: Successful response
          content:
            application/json:
              schema:
                type: array
                items:
                  type: object
                  properties:
                    id:
                      type: integer
                    name:
                      type: string
```

This file should be used for manual development and smoke testing.

---

# 34. Package Configuration

Recommended initial `package.json` shape:

```json
{
  "name": "wowo-docs",
  "version": "0.1.0",
  "description": "Local OpenAPI documentation launcher",
  "type": "module",
  "bin": {
    "wowo": "./bin/wowo.js"
  },
  "engines": {
    "node": ">=18"
  },
  "scripts": {
    "test": "node --test",
    "dev": "node ./bin/wowo.js ./examples/openapi.yaml"
  }
}
```

The exact dependency list should be finalized during implementation.

---

# 35. Suggested Dependencies

Initial dependency categories:

```text
CLI
├── commander

OpenAPI
├── yaml
└── OpenAPI validator

Documentation UI
└── swagger-ui-dist

Browser
└── open
```

Possible development dependencies:

```text
Testing
└── Node.js built-in test runner

Linting
└── ESLint

Formatting
└── Prettier
```

Keep dependencies minimal.

---

# 36. Why `swagger-ui-dist`?

The package provides the static Swagger UI distribution that can be served by the local server.

This allows WOWO to control:

```text
server
routing
OpenAPI loading
browser lifecycle
CLI experience
```

while Swagger UI handles:

```text
API documentation rendering
endpoint display
schema display
request interaction
```

This separation is desirable for v0.1.

---

# 37. UI Architecture

The first version does not need a complex custom interface.

Recommended:

```text
┌────────────────────────────────────────────┐
│                 Swagger UI                 │
│                                            │
│  Example API                               │
│  v1.0.0                                    │
│                                            │
│  GET /users                                │
│  ──────────────────────────────────────    │
│                                            │
│  POST /users                               │
│  ──────────────────────────────────────    │
│                                            │
└────────────────────────────────────────────┘
```

WOWO branding should remain minimal in v0.1.

The custom WOWO dashboard and multi-spec switcher should come later.

---

# 38. Request Flow

When the browser loads:

```text
GET /
```

the server returns:

```text
ui/index.html
```

The UI loads:

```text
/openapi.json
```

Then the renderer receives:

```text
OpenAPI JSON
```

and displays:

```text
API Documentation
```

Full flow:

```text
Browser
   │
   │ GET /
   ▼
WOWO Server
   │
   │ index.html
   ▼
Documentation UI
   │
   │ GET /openapi.json
   ▼
WOWO Server
   │
   │ JSON
   ▼
Documentation UI
   │
   ▼
Rendered API
```

---

# 39. Testing Strategy

Testing should cover the core behavior rather than implementation details.

## Unit Tests

### Argument Parser

Test:

```text
wowo ./openapi.yaml
```

Expected:

```js
{
  file: "./openapi.yaml",
  port: 3000
}
```

Test:

```text
wowo ./openapi.yaml --port 8080
```

Expected:

```js
{
  file: "./openapi.yaml",
  port: 8080
}
```

---

## Loader Tests

Test:

- valid YAML,
- valid JSON,
- invalid YAML,
- missing file,
- unsupported extension.

---

## Validator Tests

Test:

- valid OpenAPI 3.0,
- valid OpenAPI 3.1,
- invalid OpenAPI,
- non-OpenAPI YAML,
- unsupported version.

---

## Server Tests

Test:

```text
GET /
```

Expected:

```text
200
```

Test:

```text
GET /openapi.json
```

Expected:

```text
200
Content-Type: application/json
```

Test that the returned document matches the loaded specification.

---

## Integration Test

The most important smoke test:

```text
wowo examples/openapi.yaml
```

Verify:

```text
file loaded
server started
HTTP endpoint available
browser URL generated
process terminates cleanly
```

---

# 40. Acceptance Criteria

v0.1 is considered complete when all of the following work:

### Installation

```bash
npm install -g wowo-docs
```

### Basic usage

```bash
wowo ./openapi.yaml
```

### Result

```text
✓ OpenAPI loaded
✓ Server started
✓ Browser opened

→ http://localhost:3000
```

### Browser

The browser displays the OpenAPI documentation.

### Invalid file

```bash
wowo ./missing.yaml
```

returns a useful error and exits with code `1`.

### Invalid YAML

The CLI returns a readable parse error.

### Invalid OpenAPI

The CLI rejects a YAML file that is not an OpenAPI document.

### Custom port

```bash
wowo ./openapi.yaml --port 8080
```

works.

### Shutdown

```text
Ctrl+C
```

cleanly stops the server.

### Local-only

The default server is not publicly exposed.

---

# 41. Implementation Order

Implement in this order.

## Step 1 — Project Initialization

Create:

```text
package.json
bin/
src/
test/
examples/
```

Configure:

```json
"type": "module"
```

and the `wowo` executable.

---

## Step 2 — CLI

Implement:

```text
wowo <file>
wowo --help
wowo --version
wowo <file> --port <port>
```

Do not implement server logic yet.

---

## Step 3 — File Loader

Implement:

```text
resolve path
      ↓
check existence
      ↓
read file
      ↓
parse YAML/JSON
```

Add tests.

---

## Step 4 — OpenAPI Validator

Implement:

```text
parsed document
      ↓
OpenAPI validation
      ↓
validated document
```

Add tests.

---

## Step 5 — Local Server

Implement:

```text
GET /
GET /openapi.json
```

Verify manually with:

```bash
curl http://localhost:3000
```

and:

```bash
curl http://localhost:3000/openapi.json
```

---

## Step 6 — Swagger UI / Documentation Renderer

Connect the validated specification to the documentation UI.

Verify:

```text
Browser
   ↓
Swagger UI
   ↓
/openapi.json
```

---

## Step 7 — Browser Opening

Only after the server is confirmed ready:

```text
server.listen()
      ↓
openBrowser(url)
```

---

## Step 8 — Error Handling

Improve all error messages.

Ensure:

```text
expected user errors
```

do not produce:

```text
unhandled stack traces
```

by default.

---

## Step 9 — Graceful Shutdown

Implement:

```text
SIGINT
SIGTERM
```

and verify that the HTTP server closes correctly.

---

## Step 10 — Integration Test

Run:

```bash
npm install
npm test
npm run dev
```

Then:

```bash
npm pack
```

Install the generated package globally in a clean environment and verify:

```bash
wowo ./examples/openapi.yaml
```

---

# 42. Definition of Done

v0.1 is DONE when:

```text
[ ] npm package can be installed
[ ] `wowo` executable works
[ ] CLI arguments work
[ ] YAML can be loaded
[ ] JSON can optionally be loaded
[ ] OpenAPI 3.x is detected
[ ] invalid specs are rejected
[ ] local server starts
[ ] / endpoint works
[ ] /openapi.json works
[ ] documentation UI renders
[ ] browser opens automatically
[ ] custom port works
[ ] errors are user-friendly
[ ] SIGINT shuts server down
[ ] tests pass
[ ] README contains installation instructions
[ ] package can be packed and installed
```

---

# 43. Future Roadmap

v0.1 should deliberately leave room for the following.

## v0.2 — Discovery

```bash
wowo .
```

Recursive OpenAPI discovery:

```text
project/
├── openapi.yaml
├── docs/
│   ├── admin.yaml
│   └── public.yaml
└── services/
    └── payment/
        └── openapi.yaml
```

WOWO finds all specifications.

---

## v0.3 — Multiple Specs

Introduce a dashboard:

```text
WOWO DOCS

┌─────────────────────┐
│ User API            │
│ Admin API           │
│ Payment API         │
│ Public API          │
└─────────────────────┘
```

Users can switch between specifications without restarting WOWO.

---

## v0.4 — Watch Mode

```bash
wowo ./openapi.yaml --watch
```

Changes to:

```text
openapi.yaml
```

automatically refresh the documentation.

---

## v0.5 — Custom UI

Create a WOWO-specific interface:

```text
┌───────────────────────────────────────────┐
│ WOWO                 [ User API ▼ ]       │
├───────────────┬───────────────────────────┤
│ Endpoints     │ GET /users                │
│               │                           │
│ GET /users    │ Description               │
│ POST /users   │                           │
│ GET /users/id │ Parameters                │
│               │                           │
│               │ Responses                 │
└───────────────┴───────────────────────────┘
```

Swagger UI/Redoc can remain an underlying renderer or be replaced depending on the product direction.

---

# 44. Potential Future Architecture

The long-term architecture can evolve toward:

```text
                         WOWO CLI
                            │
                            ▼
                    ┌───────────────┐
                    │   Discovery   │
                    └───────┬───────┘
                            │
             ┌──────────────┼──────────────┐
             ▼              ▼              ▼
        OpenAPI A       OpenAPI B      OpenAPI C
             │              │              │
             └──────────────┼──────────────┘
                            ▼
                    ┌───────────────┐
                    │  WOWO Server  │
                    └───────┬───────┘
                            ▼
                    ┌───────────────┐
                    │  WOWO UI      │
                    │               │
                    │ API Switcher  │
                    │ Search        │
                    │ Documentation │
                    └───────────────┘
```

This is why v0.1 should keep the modules separated even though the initial feature set is small.

---

# 45. Design Principles

## 45.1 Zero Configuration

The ideal command:

```bash
wowo ./openapi.yaml
```

should be enough.

---

## 45.2 Fast Feedback

WOWO should feel immediate.

```text
command
  ↓
load
  ↓
server
  ↓
browser
```

Avoid unnecessary setup screens.

---

## 45.3 Useful Errors

Errors should tell the user:

1. What happened.
2. Which file caused it.
3. What they can do next.

---

## 45.4 Minimal Dependencies

Every dependency should have a clear purpose.

Do not build a large framework around a small CLI.

---

## 45.5 Modular Architecture

Even though v0.1 is small, keep these concerns separated:

```text
CLI
│
├── Input
├── OpenAPI
├── Server
├── Browser
└── Errors
```

This makes future features such as directory discovery and watch mode easier to add.

---

# 46. Important Implementation Constraints

The following constraints should be treated as requirements.

### Constraint 1

Do not expose the entire working directory through the HTTP server.

### Constraint 2

Do not open the browser before the HTTP server is ready.

### Constraint 3

Do not implement an OpenAPI renderer from scratch in v0.1.

### Constraint 4

Do not couple OpenAPI parsing to the HTTP server.

### Constraint 5

Do not put business logic inside `bin/wowo.js`.

### Constraint 6

Do not make directory scanning part of v0.1.

### Constraint 7

Do not introduce a custom configuration system unless required by the implementation.

---

# 47. Example Final User Experience

The complete v0.1 experience should look approximately like this:

```text
$ npm install -g wowo-docs

added packages...

$ wowo ./openapi.yaml

  WOWO

  ✓ OpenAPI loaded
  ✓ Server started
  ✓ Browser opened

  Documentation
  http://localhost:3000

  Press Ctrl+C to stop.
```

Browser:

```text
┌────────────────────────────────────────────────────────────┐
│                      Swagger UI                            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Example API                                               │
│  v1.0.0                                                    │
│                                                            │
│  GET    /users                                             │
│                                                            │
│  Returns a list of users                                   │
│                                                            │
│  [ Try it out ]                                            │
│                                                            │
│  POST   /users                                             │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

When the user presses:

```text
Ctrl+C
```

the terminal returns:

```text
  Stopping WOWO...
  Server stopped.
```

---

# 48. Final v0.1 Scope

The entire v0.1 product can be summarized as:

```text
                 ┌───────────────────┐
                 │  openapi.yaml     │
                 └─────────┬─────────┘
                           │
                           ▼
                 ┌───────────────────┐
                 │      wowo         │
                 │       CLI         │
                 └─────────┬─────────┘
                           │
                           ▼
                 ┌───────────────────┐
                 │ Parse + Validate  │
                 └─────────┬─────────┘
                           │
                           ▼
                 ┌───────────────────┐
                 │ Local HTTP Server │
                 │   localhost:3000  │
                 └─────────┬─────────┘
                           │
                           ▼
                 ┌───────────────────┐
                 │   Swagger UI      │
                 │   /openapi.json   │
                 └─────────┬─────────┘
                           │
                           ▼
                    🌐 Browser
```

The key success metric is simple:

> **A developer with an OpenAPI file should be able to go from file → interactive documentation with one command and zero manual configuration.**

That is the complete product promise of **WOWO Docs v0.1**.
