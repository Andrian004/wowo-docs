import { pathToFileURL } from "node:url";
import { parseArgs } from "./args.js";
import { HELP_TEXT } from "./help.js";
import { loadOpenApi, validateOpenApi } from "../openapi/index.js";
import { startServer } from "../server/server.js";
import { openBrowser } from "../browser/open.js";
import { logger } from "../utils/logger.js";
import { WowoError } from "../utils/errors.js";

export async function run({
  argv = process.argv.slice(2),
  openBrowserFn = openBrowser,
  output = logger,
  waitForShutdown = true,
} = {}) {
  const options = parseArgs(argv);
  if (options.help) {
    output.info(HELP_TEXT);
    return;
  }
  if (options.version) {
    output.info("wowo 0.1.0");
    return;
  }
  if (!options.file) {
    throw new WowoError("Missing required argument: <file>\n\nRun `wowo --help` for usage.", {
      code: "MISSING_FILE",
    });
  }

  const { document, filePath } = await loadOpenApi(options.file);
  await validateOpenApi(document);
  output.success("OpenAPI loaded");

  const instance = await startServer({ document, port: options.port });
  output.success("Server started");
  output.info(`\n  Spec\n    ${filePath}\n\n  Documentation\n    ${instance.url}`);

  try {
    await openBrowserFn(instance.url);
    output.success("Browser opened");
  } catch (error) {
    output.error(`Could not open the browser: ${error.message}\n  Open ${instance.url} manually.`);
  }

  if (!waitForShutdown) {
    return instance;
  }

  output.info("\n  Press Ctrl+C to stop.");
  await waitForSignals(instance, output);
}

function waitForSignals(instance, output) {
  return new Promise((resolve, reject) => {
    let stopping = false;
    const stop = async () => {
      if (stopping) return;
      stopping = true;
      process.off("SIGINT", onInterrupt);
      process.off("SIGTERM", onTerminate);
      output.info("\n  Stopping WOWO...");
      try {
        await instance.close();
        output.info("  Server stopped.");
        resolve();
      } catch (error) {
        reject(error);
      }
    };
    const onInterrupt = () => void stop();
    const onTerminate = () => void stop();
    process.once("SIGINT", onInterrupt);
    process.once("SIGTERM", onTerminate);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().catch((error) => {
    logger.error(error.message);
    process.exitCode = 1;
  });
}
