import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "dev-dist", "node_modules"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: { ecmaVersion: 2023, globals: globals.browser },
    plugins: { "react-hooks": reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Cores e fontes só via tokens do BSS: proíbe hex solto em componentes (ver src/theme).
      "no-restricted-syntax": ["error", {
        selector: "Literal[value=/#[0-9a-fA-F]{3,8}\\b/]",
        message: "Use os tokens do BSS (src/theme) em vez de cor hex solta.",
      }],
    },
  },
  // Os tokens são o único lugar onde cores em hex podem existir.
  { files: ["src/theme/**", "src/data/**", "scripts/**", "vite.config.ts", "src/**/*.test.ts"], rules: { "no-restricted-syntax": "off" } },
  { files: ["scripts/**/*.mjs", "vite.config.ts"], languageOptions: { globals: globals.node } },
);
