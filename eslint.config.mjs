import { defineConfig } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript.map((config) => ({ ...config, files: ["**/*.{ts,tsx}"] })),
  {
    files: ["src/**/*.mjs", "web/js/**/*.mjs", "tests/**/*.mjs"],
    rules: {
      "no-undef": "error",
      "no-unused-vars": ["error", { args: "none", caughtErrors: "none" }],
      "no-unreachable": "error",
      "no-constant-condition": "error",
      "no-dupe-args": "error",
      "no-dupe-keys": "error",
      "valid-typeof": "error",
      "no-unexpected-multiline": "error",
      "no-unsafe-finally": "error",
      "no-async-promise-executor": "error",
      "no-loss-of-precision": "error",
      "no-sparse-arrays": "error",
      "no-prototype-builtins": "error",
      "use-isnan": "error",
      eqeqeq: "error",
    },
  },
]);
