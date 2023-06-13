module.exports = {
    'extends': '../../.eslintrc-web.js',
    'overrides': [
        {
            'files': ["ThreejsInterface.js", "ThreejsWorker.js", "glState.js", "glCommandBuffer.js", "WorkerFactory.js", "BabylonjsInterface.js", "BabylonjsWorker.js"],
            'parserOptions':
            {
                'sourceType': 'module'
            }
        }
    ],
};
