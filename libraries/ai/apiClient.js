const { OpenAIClient, AzureKeyCredential } = require('@azure/openai');

let client;
const DEPLOYMENT_ID = 'gpt-35-turbo-16k';
// const deploymentId = "gpt-35-turbo-16k";

function initClient(endpoint, azureApiKey) {
    if (!client) {
        client = new OpenAIClient(endpoint, new AzureKeyCredential(azureApiKey));
    }
    return client;
}

function getClient() {
    if (!client) {
        throw new Error('Client has not been initialized. Call initClient first.');
    }
    return client;
}

module.exports = {
    initClient,
    getClient,
    DEPLOYMENT_ID
};
