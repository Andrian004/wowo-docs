import prompts from "prompts";
import path from "node:path";
import { WowoError } from "../utils/errors.js";

export async function promptUserSelection(specifications, directoryPath) {
  const choices = specifications.map((specification) => ({
    title: `${specification.title}  (${formatRelativePath(specification.path, directoryPath)})`,
    value: specification.path,
  }));
  const response = await prompts(
    {
      type: "select",
      name: "filePath",
      message: "Select an API to view:",
      choices,
      initial: 0,
    },
    {
      onCancel: () => false,
    },
  );

  if (!response.filePath) {
    throw new WowoError("API selection was cancelled.", {
      code: "SELECTION_CANCELLED",
    });
  }

  return response.filePath;
}

function formatRelativePath(filePath, directoryPath) {
  return path.relative(directoryPath, filePath).split(path.sep).join("/");
}
