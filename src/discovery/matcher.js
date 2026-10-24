import { readFile } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import { WowoError } from "../utils/errors.js";

const OPENAPI_3_VERSION = /^3\.(?:0|1)\.\d+(?:[-+].*)?$/;
const CONCURRENT_READS = 8;

export async function findOpenApiSpecifications(filePaths) {
  const specifications = [];
  let nextIndex = 0;

  async function processNext() {
    while (nextIndex < filePaths.length) {
      const filePath = filePaths[nextIndex];
      nextIndex += 1;
      const specification = await readSpecificationMetadata(filePath);
      if (specification) specifications.push(specification);
    }
  }

  const workerCount = Math.min(CONCURRENT_READS, filePaths.length);
  await Promise.all(Array.from({ length: workerCount }, () => processNext()));
  return specifications.sort((left, right) =>
    left.path.localeCompare(right.path),
  );
}

async function readSpecificationMetadata(filePath) {
  let content;
  try {
    content = await readFile(filePath, "utf8");
  } catch (error) {
    throw new WowoError(`Unable to read candidate file:\n  ${filePath}`, {
      code: "FILE_READ_ERROR",
      cause: error,
    });
  }

  let document;
  try {
    document =
      path.extname(filePath).toLowerCase() === ".json"
        ? JSON.parse(content)
        : YAML.parse(content);
  } catch {
    return null;
  }

  if (
    !document ||
    typeof document !== "object" ||
    !OPENAPI_3_VERSION.test(document.openapi) ||
    !document.info ||
    typeof document.info.title !== "string" ||
    document.info.title.trim().length === 0 ||
    !document.paths ||
    typeof document.paths !== "object"
  ) {
    return null;
  }

  return {
    path: filePath,
    title: document.info.title.trim(),
  };
}
