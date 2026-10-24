import { pathToFileURL } from "node:url";
import { stat } from "node:fs/promises";
import path from "node:path";
import type { DiscoveredSpecification } from "../discovery/matcher.js";
import { parseArgs } from "./args.js";
import { HELP_TEXT } from "./help.js";
import { loadOpenApi, validateOpenApi } from "../openapi/index.js";
import {
  findOpenApiSpecifications,
  scanDirectory,
} from "../discovery/index.js";
import { promptUserSelection } from "./prompt.js";
import { startServer } from "../server/server.js";
import { openBrowser } from "../browser/open.js";
import { logger, type Logger } from "../utils/logger.js";
import { getErrorCode, getErrorMessage, WowoError } from "../utils/errors.js";
import {
  watchOpenApiFile,
  type OpenApiWatcher,
  type WatchOpenApiOptions,
} from "../watcher/watcher.js";
import type { ServerInstance } from "../server/server.js";

export interface RunOptions {
  argv?: string[];
  openBrowserFn?: (url: string) => Promise<void>;
  output?: Logger;
  selectSpec?: (
    specifications: DiscoveredSpecification[],
    directoryPath: string,
  ) => Promise<string>;
  watchFile?: (
    filePath: string,
    options: WatchOpenApiOptions,
  ) => OpenApiWatcher;
  waitForShutdown?: boolean;
}

export async function run({
  argv = process.argv.slice(2),
  openBrowserFn = openBrowser,
  output = logger,
  selectSpec = promptUserSelection,
  watchFile = watchOpenApiFile,
  waitForShutdown = true,
}: RunOptions = {}): Promise<ServerInstance | void> {
  const options = parseArgs(argv);
  if (options.help) {
    output.info(HELP_TEXT);
    return;
  }
  if (options.version) {
    output.info("wowo 0.3.0");
    return;
  }
  if (!options.file) {
    throw new WowoError(
      "Missing required argument: <file|directory>\n\nRun `wowo --help` for usage.",
      { code: "MISSING_FILE" },
    );
  }

  const targetPath = path.resolve(options.file);
  let targetStat;
  try {
    targetStat = await stat(targetPath);
  } catch (error) {
    if (getErrorCode(error) === "ENOENT" || getErrorCode(error) === "ENOTDIR") {
      throw new WowoError(`Path not found:\n  ${options.file}`, {
        code: "PATH_NOT_FOUND",
        cause: error,
      });
    }
    throw new WowoError(
      `Unable to access path:\n  ${options.file}\n\n  ${getErrorMessage(error)}`,
      {
      code: "PATH_ACCESS_ERROR",
      cause: error,
      },
    );
  }

  let selectedPath = targetPath;
  if (targetStat.isDirectory()) {
    output.info("Scanning for OpenAPI specifications...");
    const candidateFiles = await scanDirectory(targetPath);
    const specifications = await findOpenApiSpecifications(candidateFiles);
    if (specifications.length === 0) {
      throw new WowoError(
        `No OpenAPI specifications found in ${options.file}`,
        { code: "NO_SPECS_FOUND" },
      );
    }

    if (specifications.length === 1) {
      output.success(`Found 1 specification: ${specifications[0].title}`);
      selectedPath = specifications[0].path;
    } else {
      output.success(`Found ${specifications.length} specifications.`);
      selectedPath = await selectSpec(specifications, targetPath);
    }
  } else if (!targetStat.isFile()) {
    throw new WowoError(`Path is not a file or directory:\n  ${options.file}`, {
      code: "INVALID_TARGET",
    });
  }

  const { document, filePath } = await loadOpenApi(selectedPath);
  await validateOpenApi(document);
  output.success("OpenAPI loaded");

  const instance = await startServer({
    document,
    port: options.port,
    watch: options.watch,
  });
  output.success("Server started");
  output.info(
    `\nSpec: ${filePath}\n\nDocumentation: \x1b[36m${instance.url}\x1b[0m\n`,
  );

  if (options.watch) {
    const watcher = watchFile(filePath, {
      onChange: async () => {
        output.info(`\n↻ File changed: ${path.relative(process.cwd(), filePath)}`);
        try {
          const updated = await loadOpenApi(filePath);
          await validateOpenApi(updated.document);
          instance.updateDocument(updated.document);
          output.success("Reloaded documentation");
        } catch (error) {
          output.error(`Could not reload OpenAPI file: ${getErrorMessage(error)}`);
        }
      },
      onError: (error) => output.error(`File watcher error: ${getErrorMessage(error)}`),
    });
    const closeServer = instance.close.bind(instance);
    instance.close = async () => {
      try {
        await watcher.close();
      } finally {
        await closeServer();
      }
    };
    output.info("\n👀 Watching for file changes...");
  }

  try {
    await openBrowserFn(instance.url);
    output.success("Browser opened");
  } catch (error) {
    output.error(
      `Could not open the browser: ${getErrorMessage(error)}\n  Open ${instance.url} manually.`,
    );
  }

  if (!waitForShutdown) {
    return instance;
  }

  output.info("\nPress \x1b[35m\x1b[1mCtrl+C\x1b[0m to stop.");
  await waitForSignals(instance, output);
}

function waitForSignals(instance: ServerInstance, output: Logger): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let stopping = false;
    const stop = async () => {
      if (stopping) return;
      stopping = true;
      process.off("SIGINT", onInterrupt);
      process.off("SIGTERM", onTerminate);
      output.info("\nStopping WOWO...");
      output.info(
        "\nYou can:" +
          "\n • \x1b[36m\x1b[1mClose the browser\x1b[0m to shut down gracefully." +
          "\n • Or press \x1b[35m\x1b[1mCtrl+C\x1b[0m again to force close.",
      );
      try {
        await instance.close();
        output.info("\nServer stopped.");
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

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  run().catch((error) => {
    logger.error(getErrorMessage(error));
    process.exitCode = 1;
  });
}
