export interface Logger {
  info(message: string): void;
  success(message: string): void;
  error(message: string): void;
}

export const logger: Logger = {
  info(message: string) {
    console.log(message);
  },
  success(message: string) {
    console.log(`\x1b[32m✓\x1b[0m ${message}`);
  },
  error(message: string) {
    console.error(`\x1b[31mError: ${message}\x1b[0m`);
  },
};
