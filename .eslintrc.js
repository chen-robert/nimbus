module.exports = {
  parser: "@typescript-eslint/parser", 
  extends: [
    "plugin:@typescript-eslint/recommended",
    "prettier/@typescript-eslint",
    "plugin:prettier/recommended" 
  ],
  parserOptions: {
    ecmaVersion: 2019, 
    sourceType: "module" 
  },
  rules: {
    "quotes": ["warn", "double"],
    "prefer-template": 2
  }
};