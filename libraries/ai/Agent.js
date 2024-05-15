class Agent {
    constructor(client) {
        this.client = client;
    }

    async process(userPrompt, previousMessages, agentResponses = null) {
        throw new Error('process() must be implemented by subclass');
    }
}

module.exports = Agent;
