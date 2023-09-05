module.exports = {
  env: {
    browser: true,
    es2021: true
  },
  extends: 'eslint:recommended',
  'globals': {
    'spatialObject': 'readonly',

    'realityEditor': 'writable',
    'createNameSpace': 'writable',
    'objects': 'writable'
  },
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module'
  },
  rules: {
    'no-prototype-builtins': 'off',
    'no-redeclare': [
      'error',
      {'builtinGlobals': false}
    ],
    'no-unused-vars': [
      'error',
      {
        'varsIgnorePattern': '^_',
        'argsIgnorePattern': '^_',
      },
    ],
  }
}
