import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  { 
    files: ["**/*.{js,mjs,cjs}"], 
    plugins: { js }, 
    extends: ["js/recommended"], 
    languageOptions: { globals: globals.node } 
  },
  { 
    files: ["**/*.js"], 
    languageOptions: { sourceType: "commonjs" } 
  },
  // Add Jest globals for test files
  {
    files: ["**/*.test.js", "**/*.spec.js", "**/setupTests.js"],
    languageOptions: {
      globals: {
        ...globals.jest,
        ...globals.node
      }
    }
  }
]);