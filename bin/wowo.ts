#!/usr/bin/env node

import { run } from "../src/cli/index.js";
import { getErrorMessage } from "../src/utils/errors.js";

run().catch((error) => {
  console.error(`\n\x1b[31m${getErrorMessage(error)}\x1b[0m`);
  process.exitCode = 1;
});
