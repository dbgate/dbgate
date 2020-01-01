module.exports = {
  env: {
    browser: false,
    commonjs: true,
    es6: true,
  },
  extends: ['eslint:recommended', 'node'],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
  },
  parserOptions: {
    ecmaVersion: 2018,
  },
  rules: {
    'no-unused-vars': 'warn',
  },
};
