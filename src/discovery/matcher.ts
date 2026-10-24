import { readFile } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";
import { getErrorMessage, WowoError } from "../utils/errors.js";

export interface DiscoveredSpecification {
  path: string;
  title: string;
}

const OPENAPI_3_VERSION = /^3\.(?:0|1)\.\d+(?:[-+].*)?$/;
const CONCURRENT_READS = 8;

export async function findOpenApiSpecifications(
  filePaths: string[],
): Promise<DiscoveredSpecification[]> {
  const specifications: DiscoveredSpecification[] = [];
  let nextIndex = 0;

  async function processNext() {
    while (nextIndex < filePaths.length) {
      const filePath = filePaths[nextIndex]!;
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

async function readSpecificationMetadata(
  filePath: string,
): Promise<DiscoveredSpecification | null> {
  let content: string;
  try {
    content = await readFile(filePath, "utf8");
  } catch (error) {
    throw new WowoError(
      `Unable to read candidate file:\n  ${filePath}\n\n  ${getErrorMessage(error)}`,
      {
        code: "FILE_READ_ERROR",
        cause: error,
      },
    );
  }

  let document: unknown;
  try {
    document =
      path.extname(filePath).toLowerCase() === ".json"
        ? JSON.parse(content)
        : YAML.parse(content);
  } catch {
    return null;
  }

  if (!isRecord(document) || typeof document.openapi !== "string") {
    return null;
  }

  const info = document.info;
  if (
    !OPENAPI_3_VERSION.test(document.openapi) ||
    !isRecord(info) ||
    typeof info.title !== "string" ||
    info.title.trim().length === 0 ||
    !isRecord(document.paths)
  ) return null;

  return {
    path: filePath,
    title: info.title.trim(),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
