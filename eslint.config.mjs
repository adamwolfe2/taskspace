import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-empty-object-type": "off",
    },
  },
  // Jest setup file config
  {
    files: ["jest.setup.js", "__tests__/**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },
  // Service worker config
  {
    files: ["public/sw.js"],
    languageOptions: {
      globals: {
        ...globals.serviceworker,
      },
    },
  },
  {
    ignores: [".next/**", "node_modules/**", "*.config.*"],
  },
];
