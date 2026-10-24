# WOWO Docs — v0.2
## Product Requirements Document (PRD) & Implementation Specification

> **Status:** Draft / Implementation Blueprint  
> **Version:** v0.2.0  
> **Package:** `wowo-docs`  
> **CLI:** `wowo`  
> **Primary goal:** Introduce directory scanning, recursive OpenAPI discovery, and an interactive CLI file selector.

---

# 1. Product Overview

In version 0.1, WOWO successfully established the baseline functionality: taking a specific OpenAPI file path, validating it, starting a local server, and opening the browser. 

**WOWO Docs v0.2** expands this capability by allowing developers to point WOWO at a directory instead of a specific file. WOWO will act as an intelligent scanner, recursively finding all potential OpenAPI specifications within the workspace. 

If multiple specifications are found, WOWO will present an interactive CLI prompt for the user to select which API they want to view.

---

# 2. Problem Statement

In modern microservices or modular monolithic architectures, API specifications are rarely kept in a single `openapi.yaml` file at the root. They are often scattered across the repository:

```text
my-project/
├── docs/
│   ├── public.yaml
│   └── internal.yaml
└── services/
    ├── user/
    │   └── openapi.yaml
    └── payment/
        └── openapi.yaml
```

Previously, developers had to know the exact path to run `$ wowo ./services/user/openapi.yaml`. 

With v0.2, developers should only need to type:
`$ wowo .`

WOWO should automatically find all specifications and ask the user which one to launch.

---

# 3. Goals

## 3.1 Primary Goals

v0.2 MUST:
- Accept directory paths as an argument (e.g., `wowo .`, `wowo ./docs`).
- Recursively scan the specified directory for `.yaml`, `.yml`, and `.json` files.
- Efficiently ignore heavy, non-relevant directories (e.g., `node_modules`, `.git`).
- Parse and validate discovered files to confirm they are actual OpenAPI specifications.
- Extract the `info.title` from valid specifications to display user-friendly names.
- If exactly **one** valid file is found, bypass the prompt and start the server immediately (graceful fallback to v0.1 behavior).
- If **multiple** valid files are found, present an interactive CLI menu (File Selector) to let the user choose one.
- Pass the selected file to the existing v0.1 server/loader logic.

## 3.2 Secondary Goals

v0.2 SHOULD:
- Handle empty directories gracefully (show a clear error that no specifications were found).
- Process files asynchronously/concurrently for faster discovery in large codebases.

---

# 4. Non-Goals

The following remain OUT OF SCOPE for v0.2:
- **UI-based switching:** Switching APIs via a web dashboard is reserved for v0.3. v0.2 relies purely on CLI-level selection.
- **Watch mode / Live Reload:** Reserved for v0.4.
- **File bundling/merging:** WOWO will not resolve `$ref` pointers that point to external files across the filesystem in this release.
- **`.gitignore` parsing:** While ideal, fully parsing and respecting `.gitignore` can be complex. For v0.2, hardcoding ignores for `node_modules` and `.git` is sufficient.

---

# 5. User Stories

## US-01 — Scan Current Directory
> As a developer working in a microservices repository, I want to run `wowo .` so that the tool automatically finds all my scattered OpenAPI files.

## US-02 — Interactive Selection
> As a developer running WOWO in a directory with multiple APIs, I want to see a list of discovered APIs and select one using my arrow keys, so I don't have to type the exact path.

## US-03 — Auto-start on Single File
> As a developer running WOWO in a directory that only contains one API specification, I want WOWO to start the server immediately without prompting me, saving me an extra keystroke.

## US-04 — No APIs Found
> As a developer running WOWO in a directory without APIs, I want a clear, friendly error message telling me nothing was found, so I know I am in the wrong directory.

---

# 6. CLI Experience & Output

### Scenario A: Multiple Files Found

```bash
$ wowo .

🔍 Scanning for OpenAPI specifications...
✓ Found 3 specifications.

? Select an API to view:
❯ User API          (services/user/openapi.yaml)
  Payment API       (services/payment/openapi.yaml)
  Admin API         (docs/admin.yaml)

[User presses Enter on "User API"]

✓ OpenAPI loaded
✓ Server started
✓ Browser opened

→ http://localhost:3000
```

### Scenario B: Single File Found

```bash
$ wowo ./services/payment

🔍 Scanning for OpenAPI specifications...
✓ Found 1 specification: Payment API

✓ OpenAPI loaded
✓ Server started
✓ Browser opened

→ http://localhost:3000
```

### Scenario C: No Files Found

```bash
$ wowo ./src

🔍 Scanning for OpenAPI specifications...
✖ No OpenAPI specifications found in ./src
```

---

# 7. High-Level Architecture (Updated)

```text
┌─────────────────────────────┐
│            CLI              │
│          wowo <path>        │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│       Argument Parser       │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│      Path Resolver          │
│ Is it a file or directory?  │
└──────────────┬──────────────┘
         │             │
   (Is File)      (Is Directory)
         │             │
         │             ▼
         │   ┌─────────────────────┐
         │   │ Directory Scanner   │
         │   │ (Find .yaml, .json) │
         │   └─────────┬───────────┘
         │             │
         │             ▼
         │   ┌─────────────────────┐
         │   │ Discovery Validator │
         │   │ (Filter valid Open- │
         │   │ API specs in bulk)  │
         │   └─────────┬───────────┘
         │             │
         │             ▼
         │   ┌─────────────────────┐
         │   │  CLI Prompt         │
         │   │ (Select 1 if > 1)   │
         │   └─────────┬───────────┘
         │             │
         ▼             ▼
┌─────────────────────────────┐
│      OpenAPI Loader         │  <-- Merges back to v0.1 flow
│    (Parse & Full Validate)  │
└──────────────┬──────────────┘
               │
               ▼
        (Server & Browser)
```

---

# 8. New Module Responsibilities

### `src/discovery/scanner.js`
Responsibilities:
- Recursively traverse a given directory path.
- Identify all files ending in `.yaml`, `.yml`, `.json`.
- Ignore predefined heavy directories (`node_modules`, `.git`, `dist`, `build`).
- Return an array of absolute file paths.

### `src/discovery/matcher.js` (or inline with scanner)
Responsibilities:
- Quickly read the first few lines or shallow-parse discovered files.
- Verify if they contain `openapi: 3.x.x` (or valid 2.0 if supported).
- Extract `info.title` for display purposes.
- *Performance note:* Do not run full, deep OpenAPI validation here, as validating 50 massive YAML files on startup will cause lag. Just check for the `openapi` key and `info.title`.

### `src/cli/prompt.js`
Responsibilities:
- Render an interactive selection menu in the terminal.
- Return the absolute path of the selected specification.
- Dependency recommendation: `prompts` or `inquirer` (lightweight version preferred).

---

# 9. Internal Data Flow

```js
async function main() {
  const options = parseArgs(process.argv);
  
  const targetPath = resolve(options.target); // file or directory
  
  let selectedFile = targetPath;

  if (isDirectory(targetPath)) {
    console.log("🔍 Scanning for OpenAPI specifications...");
    const discoveredFiles = await scanDirectory(targetPath);
    const validSpecs = await filterOpenApiSpecs(discoveredFiles);
    
    if (validSpecs.length === 0) {
      throw new WowoError("NO_SPECS_FOUND", { dir: targetPath });
    }
    
    if (validSpecs.length === 1) {
      console.log(`✓ Found 1 specification: ${validSpecs[0].title}`);
      selectedFile = validSpecs[0].path;
    } else {
      console.log(`✓ Found ${validSpecs.length} specifications.\n`);
      selectedFile = await promptUserSelection(validSpecs);
    }
  }

  // Fallback to v0.1 standard flow
  const document = await loadOpenApi(selectedFile);
  validateOpenApi(document);
  const server = await startServer({ document, port: options.port });
  await openBrowser(server.url);
  await waitForShutdown(server);
}
```

---

# 10. Performance Considerations

Recursive directory scanning can be dangerous if run on the root of a machine (`wowo /`) or massive mono-repos. 

To mitigate:
1. **Hardcoded Ignores:** Must ignore `node_modules`, `.git`, `.vscode`, `dist`, `build`.
2. **Max Depth (Optional):** Consider implementing a max scan depth (e.g., 5 levels deep) to prevent infinite loops or excessively long scan times.
3. **Lazy Parsing:** When identifying if a YAML file is an OpenAPI spec, try to read only the metadata/headers instead of fully unmarshaling a 10MB YAML file, or use a lightweight YAML parser just for discovery.

---

# 11. Implementation Order

## Step 1 — Add CLI Dependency
Install a prompt library:
```bash
npm install prompts
```
*(or equivalent lightweight CLI prompter).*

## Step 2 — Directory Scanner
Implement `src/discovery/scanner.js` using `fs.promises.readdir` or a lightweight glob library. Ensure it filters for correct extensions and ignores `node_modules`.

## Step 3 — Discovery Validator
Implement a fast check that takes the list of paths from the scanner, reads them, and checks for the `openapi` keyword. Return an array of objects: `{ path, title }`.

## Step 4 — CLI Prompt UI
Create `src/cli/prompt.js`. Hook it up to the CLI entry point so that passing a directory triggers the scan -> prompt -> return path flow.

## Step 5 — Integration & Testing
Integrate the directory flow with the existing v0.1 file loader.
Test scenarios:
- Run on a file (should bypass scan).
- Run on a dir with 0 specs.
- Run on a dir with 1 spec.
- Run on a dir with 3 specs (ensure keyboard navigation works).

---

# 12. Definition of Done

v0.2 is DONE when:
- [ ] `wowo .` scans the current directory.
- [ ] Scanning ignores `node_modules` and `.git`.
- [ ] Discovered specs show their API Title (`info.title`) and relative path in the CLI prompt.
- [ ] User can use arrow keys to select an API from the prompt.
- [ ] Selecting an API successfully launches the browser as it did in v0.1.
- [ ] `wowo ./specific-file.yaml` still works perfectly without prompting.
- [ ] Directories with exactly 1 spec auto-launch without prompting.
- [ ] Directories with 0 specs exit cleanly with a helpful error message.
- [ ] Unit and Integration tests cover scanning and empty states.