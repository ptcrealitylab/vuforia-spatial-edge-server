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
            'warn',
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
            'warn',
            'always'
        ],
        'comma-spacing': [
          'warn', {before: false, after: true}
        ],
        'key-spacing': 'warn',
        'keyword-spacing': 'warn',
        'no-trailing-spaces': 'warn',
        'brace-style': 'warn',
        'space-before-blocks': 'warn',
        'space-infix-ops': 'warn',
        'no-prototype-builtins': 'off',
        'no-unused-vars': ['warn', {argsIgnorePattern: '^_', varsIgnorePattern: '^_'}],
        'no-redeclare': 'warn',
        'no-inner-declarations': 'warn',
        'no-extra-semi': 'warn',
    }
};
