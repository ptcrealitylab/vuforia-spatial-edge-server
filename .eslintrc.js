module.exports = {
    'env': {
        'commonjs': true,
        'es6': true,
        'node': true,
    },
    'extends': 'eslint:recommended',
    'globals': {
        'Atomics': 'readonly',
        'SharedArrayBuffer': 'readonly'
    },
    'parserOptions': {
        'ecmaVersion': 2018
    },
    'rules': {
        'indent': [
            'error',
            4
        ],
        'linebreak-style': [
            'error',
            'unix'
        ],
        'quotes': [
            'warn',
            'single'
        ],
        'semi': [
            'error',
            'always'
        ],
        'comma-spacing': [
          'error', {before: false, after: true}
        ],
        'key-spacing': 'error',
        'keyword-spacing': 'error',
        'no-trailing-spaces': 'error',
        'brace-style': 'error',
        'space-before-blocks': 'error',
        'space-infix-ops': 'error',
        'no-prototype-builtins': 'off',
        'no-unused-vars': ['error', {argsIgnorePattern: '^_', varsIgnorePattern: '^_'}],
    }
};
