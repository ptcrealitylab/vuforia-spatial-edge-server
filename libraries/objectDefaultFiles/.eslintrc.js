module.exports = {
    'extends': '../../.eslintrc-web.js',
    'overrides': [
        {
            'files': ["ThreejsInterface.js", "ThreejsWorker.js", "glState.js", "glCommandBuffer.js"],
            'parserOptions':
            {
                'sourceType': 'module'
            }
        }
    ],
};
