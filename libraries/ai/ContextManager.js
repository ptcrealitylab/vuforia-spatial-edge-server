class ContextManager {
    constructor(systemMessages, userPrompt, previousMessages) {
        this.systemMessages = systemMessages;
        this.userPrompt = userPrompt;
        this.previousMessages = previousMessages;
        this.agentResponses = [];
        this.agentChain = [];
    }

    updateContext(agentName, agentResponse) {
        this.agentChain.push(agentName);
        this.agentResponses.push(agentResponse);
    }

    getContext() {
        return {
            systemMessages: this.systemMessages,
            userPrompt: this.userPrompt,
            previousMessages: this.previousMessages,
            agentResponses: this.agentResponses,
            agentChain: this.agentChain
        };
    }
}

module.exports = ContextManager;
