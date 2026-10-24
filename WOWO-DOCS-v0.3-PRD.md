# WOWO Docs — v0.3
## Product Requirements Document (PRD) & Implementation Specification

> **Status:** Draft / Implementation Blueprint  
> **Version:** v0.3.0  
> **Package:** `wowo-docs`  
> **CLI:** `wowo`  
> **Primary goal:** Introduce the `--watch` flag to monitor file changes and automatically reload the documentation in the browser.

---

# 1. Product Overview

In v0.1 and v0.2, WOWO successfully served static OpenAPI files and scanned directories. However, API design is an iterative process. Developers frequently edit their `openapi.yaml` files and need to see the changes immediately to verify paths, parameters, and descriptions.

**WOWO Docs v0.3** introduces the `--watch` (or `-w`) flag. When this flag is passed, WOWO will keep an eye on the loaded OpenAPI file(s). If the developer saves a change in their editor, the browser will automatically refresh the documentation UI without requiring a manual page reload or CLI restart.

---

# 2. Problem Statement

Without a watch mode, the developer workflow looks like this:
1. Edit `openapi.yaml`.
2. Save file.
3. Switch to browser.
4. Hit `F5` or `Cmd+R` to refresh the page.
5. Repeat.

This manual refresh creates friction. The ideal workflow should be seamless: the developer edits the YAML file on one side of their screen, and the documentation updates automatically on the other side.

---

# 3. Goals

## 3.1 Primary Goals

v0.3 MUST:
- Introduce the `--watch` (and `-w` alias) CLI flag.
- Monitor the currently loaded OpenAPI file for filesystem changes (save/modify events).
- Establish a one-way communication channel from the WOWO local server to the browser (e.g., using Server-Sent Events / SSE).
- Automatically trigger a UI re-render or page reload in the browser when a file change is detected.
- Re-parse and re-validate the YAML file upon change, displaying errors in the CLI if the new YAML is invalid, while keeping the server alive.

## 3.2 Secondary Goals

v0.3 SHOULD:
- Implement "Hot Reloading" where possible: update the Swagger UI/Redoc instance without a full browser page refresh, preserving the scroll position and open/closed states of endpoints.
- Debounce file system events (e.g., wait 100ms before reloading) to prevent multiple triggers from a single "Save" action.

---

# 4. Non-Goals

The following remain OUT OF SCOPE for v0.3:
- **UI API Switcher / Dashboard:** Reserved for v0.4.
- **Watching resolved `$ref` files:** If an OpenAPI file references external files (e.g., `$ref: './models/user.yaml'`), watching all dynamically resolved references is complex and out of scope for v0.3. Only the directly selected file(s) will be watched initially.

---

# 5. User Stories

## US-01 — Enable Watch Mode
> As an API developer, I want to run `wowo ./openapi.yaml --watch` so that the CLI actively monitors my file for changes.

## US-02 — Live Browser Update
> As an API developer, when I have WOWO running in watch mode and I save a change in my editor, I want the browser to update immediately without me having to manually refresh the page.

## US-03 — Handle Syntax Errors Gracefully
> As an API developer making a typo in my YAML file, I want the CLI to log the parse error without crashing the server, so that when I fix the typo, the server continues to work and reloads the browser.

---

# 6. CLI Experience & Output

```bash
$ wowo ./openapi.yaml --watch

WOWO

  ✓ OpenAPI loaded
  ✓ Server started
  ✓ Browser opened

  Docs:
  http://localhost:3000

  👀 Watching for file changes...

[User saves openapi.yaml in VS Code]

  ↻ File changed: ./openapi.yaml
  ✓ Reloaded documentation

[User makes a typo in YAML and saves]

  ↻ File changed: ./openapi.yaml
  ✖ Parse error: Invalid YAML at line 14. Fix to resume updates.
```

---

# 7. High-Level Architecture (Watch Flow)

```text
       Developer
           │
           │ edits & saves
           ▼
     openapi.yaml
           │
           ▼
┌─────────────────────────┐
│   Filesystem Watcher    │ (e.g., `fs.watch` or `chokidar`)
│   src/watcher/index.js  │
└──────────┬──────────────┘
           │
           │ triggers 'change' event
           ▼
┌─────────────────────────┐
│     OpenAPI Loader      │
│   (Re-parse YAML)       │
└──────────┬──────────────┘
           │
           │ if valid, send message
           ▼
┌─────────────────────────┐
│       WOWO Server       │
│  (SSE Endpoint /reload) │
└──────────┬──────────────┘
           │
           │ push SSE message over HTTP
           ▼
┌─────────────────────────┐
│      Browser UI         │
│  (Listens to EventSource)
│  Calls swaggerUi.render()
└─────────────────────────┘
```

---

# 8. Technical Implementation Details

## 8.1 Watcher Module (`src/watcher/watcher.js`)
- **Dependency:** While Node's native `fs.watch` is available, it is famously inconsistent across OS (macOS/Windows/Linux). It is highly recommended to use **`chokidar`** for stable, cross-platform file watching.
- **Debouncing:** Wrap the reload trigger in a debounce function (e.g., 200ms) to ensure that multiple OS-level file events for a single save only trigger one reload.

## 8.2 Server-Sent Events (SSE)
To push updates to the browser without full WebSockets (which are heavier), use Server-Sent Events.

**Server-side (`src/server/server.js`):**
Add an endpoint `GET /api/events`.
```javascript
app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  
  // Store the connection to send messages later
  clients.push(res);
  
  req.on('close', () => {
    clients = clients.filter(client => client !== res);
  });
});

// Expose a function to trigger reloads
function notifyClients() {
  clients.forEach(client => client.write(`data: reload\n\n`));
}
```

**Client-side (`ui/index.html` or `ui/app.js`):**
Inject a small script into the HTML served to the browser.
```javascript
const evtSource = new EventSource("/api/events");
evtSource.onmessage = function(event) {
  if (event.data === "reload") {
    // Re-fetch the spec and re-render Swagger/Redoc
    // OR simply window.location.reload(); for v0.3 MVP
    reloadDocumentation();
  }
}
```

## 8.3 Error Handling During Watch
If the user saves an invalid YAML file:
1. The watcher detects the change.
2. The loader attempts to parse the file.
3. Parsing fails.
4. **Action:** Log the error to the CLI console (e.g., "YAML syntax error"). Do **not** exit the `node` process. Do **not** send a reload event to the browser (let the browser display the last known good state).
5. When the user fixes the error and saves, the watcher triggers again, parses successfully, and sends the reload event.

---

# 9. Implementation Steps

### Step 1 — Update CLI Arguments
Update `src/cli/options.js` to parse `--watch` and `-w` flags.

### Step 2 — Add File Watcher
Install `chokidar` (optional but recommended) or build a wrapper around `fs.watch`. Implement the debounce logic. Connect it so that `wowo ./openapi.yaml --watch` starts monitoring that file.

### Step 3 — Implement SSE Server Endpoint
Modify `src/server/routes.js` to add the `/api/events` endpoint that holds connections open.

### Step 4 — Connect Watcher to Server
When the watcher fires a validated "change" event, call the server's broadcast function to send the "reload" message to all connected SSE clients.

### Step 5 — Update Frontend
Update `ui/index.html` to instantiate `EventSource` and listen for messages. On message, trigger a UI update. (A simple `window.location.reload()` is acceptable for the first iteration, but calling Swagger UI's re-render method fetching the new JSON is preferred for a smoother experience).

---

# 10. Definition of Done

v0.3 is DONE when:
- [ ] `wowo <file> --watch` starts the server and watches the target file.
- [ ] Saving modifications to the YAML file automatically updates the browser UI.
- [ ] Saving an invalid YAML file logs a readable error in the CLI but keeps the process running.
- [ ] Fixing the invalid YAML file and saving successfully updates the browser again.
- [ ] Running without `--watch` behaves normally as in v0.2 (no file watching overhead).