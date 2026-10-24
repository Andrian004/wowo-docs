import { WowoError } from "../utils/errors.js";

export function parseArgs(argv) {
  const options = {
    file: undefined,
    port: 3000,
    help: false,
    version: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--help" || argument === "-h") {
      options.help = true;
    } else if (argument === "--version" || argument === "-v") {
      options.version = true;
    } else if (argument === "--port" || argument === "-p") {
      const value = argv[index + 1];
      if (!value || value.startsWith("-")) {
        throw new WowoError("Option --port requires a port number.", {
          code: "INVALID_PORT",
        });
      }
      options.port = parsePort(value);
      index += 1;
    } else if (argument.startsWith("--port=")) {
      options.port = parsePort(argument.slice("--port=".length));
    } else if (argument.startsWith("-")) {
      throw new WowoError(`Unknown option: ${argument}`, {
        code: "UNKNOWN_OPTION",
      });
    } else if (options.file) {
      throw new WowoError("Only one OpenAPI file can be specified.", {
        code: "TOO_MANY_FILES",
      });
    } else {
      options.file = argument;
    }
  }

  return options;
}

function parsePort(value) {
  if (!/^\d+$/.test(value)) {
    throw new WowoError(`Invalid port: ${value}`, { code: "INVALID_PORT" });
  }

  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new WowoError(`Invalid port: ${value}. Use a number from 1 to 65535.`, {
      code: "INVALID_PORT",
    });
  }

  return port;
}
