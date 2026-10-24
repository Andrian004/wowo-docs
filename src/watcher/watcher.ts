import { watch } from "chokidar";

export interface WatchOpenApiOptions {
  onChange(): Promise<void> | void;
  onError(error: unknown): void;
  debounceMs?: number;
}

export interface OpenApiWatcher {
  close(): Promise<void>;
}

export function watchOpenApiFile(
  filePath: string,
  { onChange, onError, debounceMs = 200 }: WatchOpenApiOptions,
): OpenApiWatcher {
  let debounceTimer: NodeJS.Timeout | undefined;
  let closed = false;
  let processing = Promise.resolve();
  const watcher = watch(filePath, {
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 25,
    },
  });

  const scheduleChange = (): void => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      processing = processing
        .then(async () => {
          if (!closed) await onChange();
        })
        .catch((error) => {
          onError(error instanceof Error ? error : new Error(String(error)));
        });
    }, debounceMs);
  };

  watcher.on("change", scheduleChange);
  watcher.on("add", scheduleChange);
  watcher.on("error", (error) => onError(error));

  return {
    async close() {
      closed = true;
      clearTimeout(debounceTimer);
      await watcher.close();
      await processing;
    },
  };
}
