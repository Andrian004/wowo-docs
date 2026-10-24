export const HELP_TEXT = `WOWO — Local OpenAPI Documentation

Usage:
  wowo <file> [options]

Arguments:
  <file>               Path to an OpenAPI specification

Options:
  -p, --port <port>    Port to run the documentation server (default: 3000)
  -h, --help           Show help
  -v, --version        Show version

Examples:
  wowo ./openapi.yaml
  wowo ./docs/api.yaml
  wowo ./openapi.yaml --port 8080`;
