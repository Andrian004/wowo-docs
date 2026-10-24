import { readdir } from "node:fs/promises";
import path from "node:path";
import { WowoError } from "../utils/errors.js";

const IGNORED_DIRECTORIES = new Set([
  "node_modules",
  ".git",
  ".vscode",
  "dist",
  "build",
]);
const SPEC_EXTENSIONS = new Set([".yaml", ".yml", ".json"]);

export async function scanDirectory(directoryPath) {
  const absoluteRoot = path.resolve(directoryPath);
  const files = [];
  const pendingDirectories = [absoluteRoot];

  while (pendingDirectories.length > 0) {
    const currentDirectory = pendingDirectories.pop();
    let entries;
    try {
      entries = await readdir(currentDirectory, { withFileTypes: true });
    } catch (error) {
      throw new WowoError(
        `Unable to scan directory:\n  ${currentDirectory}\n\n  ${error.message}`,
        { code: "DIRECTORY_READ_ERROR", cause: error },
      );
    }

    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const entryPath = path.join(currentDirectory, entry.name);
      if (entry.isDirectory()) {
        if (!IGNORED_DIRECTORIES.has(entry.name)) {
          pendingDirectories.push(entryPath);
        }
      } else if (
        entry.isFile() &&
        SPEC_EXTENSIONS.has(path.extname(entry.name).toLowerCase())
      ) {
        files.push(entryPath);
      }
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
}
