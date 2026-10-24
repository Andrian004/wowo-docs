import SwaggerParser from "@apidevtools/swagger-parser";
import { WowoError } from "../utils/errors.js";

export async function validateOpenApi(document) {
  const version = document?.openapi;
  if (typeof version !== "string" || !/^3\.(0|1)\.\d+(?:[-+].*)?$/.test(version)) {
    if (typeof version === "string" && /^2(?:\.|$)/.test(version)) {
      throw new WowoError(
        `Unsupported OpenAPI version: ${version}\n\n  WOWO v0.1 supports OpenAPI 3.x.`,
        { code: "UNSUPPORTED_OPENAPI_VERSION" },
      );
    }
    throw new WowoError(
      "Not an OpenAPI specification.\n\n  The file does not contain a supported `openapi` version.",
      { code: "INVALID_OPENAPI" },
    );
  }

  try {
    await SwaggerParser.validate(document, {
      resolve: { external: false },
    });
  } catch (error) {
    throw new WowoError(
      `Invalid OpenAPI specification.\n\n  ${error.message}`,
      { code: "INVALID_OPENAPI", cause: error },
    );
  }

  return document;
}
