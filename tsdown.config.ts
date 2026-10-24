import { defineConfig, type UserConfig } from "tsdown";

const config: UserConfig = defineConfig({
  entry: {
    "bin/wowo": "bin/wowo.ts",
    "src/index": "src/index.ts",
    "src/cli/index": "src/cli/index.ts",
    "src/openapi/index": "src/openapi/index.ts",
    "src/server/server": "src/server/server.ts",
  },
  format: "esm",
  outDir: "dist",
  clean: true,
  unbundle: true,
  dts: true,
  deps: { dts: { neverBundle: true } },
  copy: [{ from: "ui", to: "dist", flatten: false }],
});

export default config;
