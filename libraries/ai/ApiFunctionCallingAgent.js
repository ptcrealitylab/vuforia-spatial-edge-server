const Agent = require('./Agent');
const {AGENT_TYPES} = require('./AgentFactory');

class ApiFunctionCallingAgent extends Agent {
    constructor(client) {
        super(client);
        this.name = 'ApiFunctionCallingAgent'; //AGENT_TYPES.ApiFunctionCallingAgent;
    }
    
    async process(userPrompt, previousMessages, agentResponses) {
        // Use this.client to interact with OpenAI API
        return 'API function response';
    }
}

module.exports = ApiFunctionCallingAgent;
