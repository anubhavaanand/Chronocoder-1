import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Local-only artifacts that must never be linted:
    "venv/**",
    "avatars/**",
    ".streamlit/**",
    "logs/**",
    "__pycache__/**",
    "session-*.md",
    // Stale test suite (own package.json, disabled in CI until modernized;
    // also excluded from the build in tsconfig.json)
    "tests/**",
  ]),
]);

export default eslintConfig;
