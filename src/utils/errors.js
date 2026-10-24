export class WowoError extends Error {
  constructor(message, { code, details, cause } = {}) {
    super(message, { cause });
    this.name = "WowoError";
    this.code = code;
    this.details = details;
  }
}
