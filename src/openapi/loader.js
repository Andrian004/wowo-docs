import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import { WowoError } from "../utils/errors.js";

const SUPPORTED_EXTENSIONS = new Set([".yaml", ".yml", ".json"]);

export async function loadOpenApi(inputPath) {
  if (!inputPath) {
    throw new WowoError("Please provide a path to an OpenAPI file.", {
      code: "MISSING_FILE",
    });
  }

  const filePath = path.resolve(inputPath);
  const extension = path.extname(filePath).toLowerCase();
  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    throw new WowoError(
      `Unsupported file extension: ${extension || "(none)"}. Use .yaml, .yml, or .json.`,
      { code: "INVALID_EXTENSION" },
    );
  }

  let fileStat;
  try {
    fileStat = await stat(filePath);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") {
      throw new WowoError(`File not found:\n  ${inputPath}`, {
        code: "FILE_NOT_FOUND",
        cause: error,
      });
    }
    throw new WowoError(`Unable to access file:\n  ${inputPath}`, {
      code: "FILE_READ_ERROR",
      cause: error,
    });
  }

  if (!fileStat.isFile()) {
    throw new WowoError(`Path is not a file:\n  ${inputPath}`, {
      code: "NOT_A_FILE",
    });
  }

  let content;
  try {
    content = await readFile(filePath, "utf8");
  } catch (error) {
    throw new WowoError(`Unable to read file:\n  ${inputPath}`, {
      code: "FILE_READ_ERROR",
      cause: error,
    });
  }

  try {
    const document =
      extension === ".json" ? JSON.parse(content) : YAML.parse(content);
    if (!document || typeof document !== "object" || Array.isArray(document)) {
      throw new TypeError("The document must contain a YAML or JSON object.");
    }
    return { document, filePath };
  } catch (error) {
    throw new WowoError(
      `Failed to parse OpenAPI file:\n  ${inputPath}\n\n  ${error.message}`,
      { code: "PARSE_ERROR", cause: error },
    );
  }
}
