module.exports = {
  "root": true,
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "extends": [
      "eslint:recommended",
      "plugin:@typescript-eslint/eslint-recommended",
      "plugin:@typescript-eslint/recommended"
  ],
  "rules": {
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-require-imports": "error",
    '@typescript-eslint/no-unused-expressions': 'error',
    "@typescript-eslint/naming-convention": [ 
      "error",
      {
          "selector": "default",
          "format": ["camelCase"]
      },
      {
          "selector": ["class", "interface", "enum", "enumMember"],
          "format": ["PascalCase"]
      },
      {
          "selector": ["variable", "property", "method"],
          "format": ["UPPER_CASE", "camelCase"],
          "leadingUnderscore": "allow"
      },
      {
        "selector": ["typeParameter", "typeAlias"],
        "format": ["PascalCase"],
      }
    ],
    "@typescript-eslint/semi": ["error", "always"],
    "@typescript-eslint/quotes": [
      "error",
      "single",
      {
          "allowTemplateLiterals": true,
          "avoidEscape": true
      }
    ],
    "@typescript-eslint/no-shadow": "error",
    "@typescript-eslint/no-redeclare": "error",
    "curly": 'error',
    "semi": 'off',
    "quotes": "off",
    "no-shadow": "off",
    "no-redeclare": "off",
    "no-duplicate-case": "error",
    "eqeqeq": ["error", "always"],
    'no-debugger': 'error',
    'no-empty': 'error',
    'no-unsafe-finally': 'error',
    'new-parens': 'error',
    'no-throw-literal': 'error'
  },
};
