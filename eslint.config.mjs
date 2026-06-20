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
    // Custom ignores:
    ".wrangler/**",
    "**/dist/**",      // generated bundles: cli/dist, packages/*/dist, dist
    "scripts/**",
    "server/**",
  ]),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      // Mount-time init (window.location / localStorage reads, one-shot UI
      // banners) must run in an effect for SSR safety — these are intentional,
      // not cascading-render bugs. Keep as a warning, not a CI-blocking error.
      "react-hooks/set-state-in-effect": "warn"
    }
  },
  {
    // Test files legitimately use require() for mocking and @ts-nocheck/@ts-* to
    // exercise compile failures. Don't lint-block on those here.
    files: ["**/*.test.{ts,tsx,js,jsx}", "**/__tests__/**"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/ban-ts-comment": "off"
    }
  }
]);

export default eslintConfig;
