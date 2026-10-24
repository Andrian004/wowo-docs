export const HELP_TEXT = `WOWO — Local OpenAPI Documentation

Usage:
  wowo <file|directory> [options]

Arguments:
  <file|directory>     OpenAPI specification or directory to scan

Options:
  -p, --port <port>    Port to run the documentation server (default: 3000)
  -w, --watch          Reload documentation when the specification changes
  -h, --help           Show help
  -v, --version        Show version

Examples:
  wowo ./openapi.yaml
  wowo ./docs/api.yaml
  wowo .
  wowo ./openapi.yaml --watch
  wowo ./openapi.yaml --port 8080`;
