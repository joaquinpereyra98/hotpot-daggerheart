import globals from "globals";
import js from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";
import json from "@eslint/json";
import markdown from "@eslint/markdown";
import css from "@eslint/css";
import html from "@html-eslint/eslint-plugin";
import htmlParser, { TEMPLATE_ENGINE_SYNTAX } from "@html-eslint/parser";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: {
      js,
      stylistic, 
    },
    languageOptions: { globals: globals.browser },
    extends: ["js/recommended"],
    rules: {
      "no-undef": "off",
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "stylistic/quotes": ["warn", "double"],
      "stylistic/indent": ["warn", 2],
      "stylistic/semi": ["warn", "always"], 
      "stylistic/space-before-function-paren": ["warn", "never"], 
      "stylistic/object-curly-newline": ["warn", { "multiline": true }],
      "stylistic/object-property-newline": ["warn", { "allowAllPropertiesOnSameLine": false }],
      "stylistic/object-curly-spacing": ["warn", "always"],
      "stylistic/comma-dangle": ["warn", {
        "arrays": "always-multiline",
        "objects": "always-multiline",
        "imports": "always-multiline",
        "exports": "always-multiline",
        "functions": "always-multiline",
      }],
    }, 
  },
  {
    files: ["**/*.json"],
    plugins: { json },
    language: "json/json", 
    extends: ["json/recommended"],
  },
  {
    files: ["**/*.md"],
    plugins: { markdown },
    language: "markdown/gfm",
    extends: ["markdown/recommended"],
  },
  {
    files: ["**/*.css"],
    plugins: { css },
    language: "css/css",
    extends: ["css/recommended"],
    rules: { "css/use-baseline": "off" }, 
  },
  {
    files: ["**/*.{html,hbs}"],
    plugins: { html },
    extends: ["html/recommended"],
    language: "html/html",
    languageOptions: {
      parser: htmlParser,
      templateEngineSyntax: TEMPLATE_ENGINE_SYNTAX.HANDLEBAR,
    },
    rules: { "html/use-baseline": "off" },
  },
]);
