const ChatbotAgent = require('./ChatbotAgent');
const ApiFunctionCallingAgent = require('./ApiFunctionCallingAgent');
const { getClient } = require('./apiClient');

const AGENT_TYPES = Object.freeze({
    ChatbotAgent: 'ChatbotAgent',
    ApiFunctionCallingAgent: 'ApiFunctionCallingAgent',
    None: 'None'
});

class AgentFactory {
    static createAgent(type) {
        const client = getClient();
        switch (type) {
            case AGENT_TYPES.ChatbotAgent:
                return new ChatbotAgent(client);
            case AGENT_TYPES.ApiFunctionCallingAgent:
                return new ApiFunctionCallingAgent(client);
            default:
                throw new Error(`Unknown agent type: ${type}`);
        }
    }
}

module.exports = {
    AgentFactory,
    AGENT_TYPES
}
