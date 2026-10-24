#!/usr/bin/env node

import { run } from "../src/cli/index.js";

run().catch((error) => {
  console.error(`\n\x1b[31m${error.message}\x1b[0m`);
  process.exitCode = 1;
});
