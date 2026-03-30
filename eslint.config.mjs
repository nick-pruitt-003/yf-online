import { createRequire } from "module";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import eslintReact from "@eslint-react/eslint-plugin";
import importX from "eslint-plugin-import-x";

// eslint-config-next's package.json doesn't export its nested node_modules,
// so we use createRequire to load the bundled CJS plugin directly.
const require = createRequire(import.meta.url);
const legacyPluginReact = require("./node_modules/eslint-config-next/node_modules/eslint-plugin-react/index.js");

// Turn off every react/* rule from the bundled eslint-plugin-react.
// That plugin uses context.getFilename() which was removed in ESLint 10.
// @eslint-react/eslint-plugin provides the modern replacements below.
const disableAllLegacyReactRules = {
  rules: Object.fromEntries(
    Object.keys(legacyPluginReact.rules).map((name) => [`react/${name}`, "off"])
  ),
};

// Replace eslint-config-next's bundled eslint-plugin-import with eslint-plugin-import-x.
// import-x is a drop-in fork that properly declares ESLint 10 support.
// ESLint 10 forbids re-declaring plugins, so we swap the instance in-place on the
// configs that already register it before passing them to defineConfig.
const swapImportPlugin = (configs) =>
  configs.map((cfg) =>
    cfg.plugins?.import ? { ...cfg, plugins: { ...cfg.plugins, import: importX } } : cfg
  );

const eslintConfig = defineConfig([
  ...swapImportPlugin(nextVitals),
  ...swapImportPlugin(nextTs),
  disableAllLegacyReactRules,
  // Disable react-hooks/* rules from eslint-config-next's bundled eslint-plugin-react-hooks
  // that conflict with @eslint-react's equivalents (exhaustive-deps, rules-of-hooks, refs, etc.)
  eslintReact.configs["disable-conflict-eslint-plugin-react-hooks"],
  // Enable the modern replacements for TypeScript+React.
  {
    files: ["**/*.{ts,tsx}"],
    ...eslintReact.configs["recommended-typescript"],
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
