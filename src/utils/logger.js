export const logger = {
  info(message) {
    console.log(message);
  },
  success(message) {
    console.log(`\x1b[32m✓\x1b[0m ${message}`);
  },
  error(message) {
    console.error(`\x1b[31mError: ${message}\x1b[0m`);
  },
};
