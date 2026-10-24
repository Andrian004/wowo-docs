import { watch } from "chokidar";

export function watchOpenApiFile(
  filePath,
  { onChange, onError, debounceMs = 200 } = {},
) {
  let debounceTimer;
  let closed = false;
  let processing = Promise.resolve();
  const watcher = watch(filePath, {
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 25,
    },
  });

  const scheduleChange = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      processing = processing
        .then(async () => {
          if (!closed) await onChange();
        })
        .catch((error) => {
          onError(error);
        });
    }, debounceMs);
  };

  watcher.on("change", scheduleChange);
  watcher.on("add", scheduleChange);
  watcher.on("error", onError);

  return {
    async close() {
      closed = true;
      clearTimeout(debounceTimer);
      await watcher.close();
      await processing;
    },
  };
}
