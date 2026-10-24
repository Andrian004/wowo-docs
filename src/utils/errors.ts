export interface WowoErrorOptions {
  code?: string;
  details?: unknown;
  cause?: unknown;
}

export class WowoError extends Error {
  readonly code?: string;
  readonly details?: unknown;

  constructor(message: string, { code, details, cause }: WowoErrorOptions = {}) {
    super(message, { cause });
    this.name = "WowoError";
    this.code = code;
    this.details = details;
  }
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function getErrorCode(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = error.code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}
