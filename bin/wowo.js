#!/usr/bin/env node

import { run } from "../src/cli/index.js";

run().catch((error) => {
  console.error(`✖ ${error.message}`);
  process.exitCode = 1;
});
