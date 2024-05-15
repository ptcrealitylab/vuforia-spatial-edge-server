const { AGENT_TYPES, AgentFactory } = require('./AgentFactory');
const ContextManager = require('./ContextManager');
const { getClient, DEPLOYMENT_ID } = require('./apiClient');

class CoordinatorAgent {
    constructor(systemMessages) {
        this.systemMessages = systemMessages;
        this.MAX_AGENT_CHAIN_LENGTH = 10;
    }

    async decideFirstAgent(_context) {
        // Logic to decide the first agent based on initial context
        return AGENT_TYPES.ChatbotAgent; // Example initial agent type
    }

    async decideNextAgent(context) {
        const response = context.agentResponses[context.agentResponses.length - 1];
        
        let relevantContext = {
            previousMessages: context.previousMessages,
            userPrompt: context.userPrompt
        };
        const prompt = `
            Given the current context and the last agent's response, decide the next agent to process the request.
            Context: ${JSON.stringify(relevantContext)}
            Last Response: ${response}

            Choose one of the following options:
            - ${AGENT_TYPES.ChatbotAgent}
            - ${AGENT_TYPES.ApiFunctionCallingAgent}
            - ${AGENT_TYPES.None} (if no further agent is needed)
            
            Response:
        `;

        const openAiResponse = await this.callOpenAiApi({
            role: "user", content: prompt
        });
        return this.parseDecision(context.agentChain, openAiResponse);
    }

    async callOpenAiApi(prompt) {
        const client = getClient();
        // const apiResponse = await client.completions.create({
        //     model: 'davinci-codex',
        //     prompt: prompt,
        //     max_tokens: 50
        // });
        //
        // return apiResponse.choices[0].text.trim();

        const context = this.contextManager.getContext();

        const messages = [
            ...Object.values(context.systemMessages),
            ...Object.values(context.previousMessages),
            prompt
        ];

        // if (agentResponses) {
        //     messages.push(...Object.values(agentResponses));
        // }

        let result = await client.getChatCompletions(DEPLOYMENT_ID, messages);
        let actualResult = result.choices[0].message.content;
        console.log(actualResult);
        return actualResult;
    }

    parseDecision(agentChain, apiResponse) {
        let lastAgent = agentChain.length > 0 ? agentChain[agentChain.length - 1] : null;

        // make sure this regex matches the AGENT_TYPES enum 
        const decisionMatch = apiResponse.match(/(ChatbotAgent|ApiFunctionCallingAgent|None)/);
        let decidedAgentName = decisionMatch ? decisionMatch[1] : AGENT_TYPES.None;
        
        // prevent infinite loops of adding more chatbot agents
        if (lastAgent === AGENT_TYPES.ChatbotAgent && decidedAgentName !== AGENT_TYPES.ApiFunctionCallingAgent) {
            return AGENT_TYPES.None;
        }
        
        return decidedAgentName;
    }

    async process(userPrompt, previousMessages) {
        console.log('CoordinatorAgent.process');

        this.contextManager = new ContextManager(this.systemMessages, userPrompt, previousMessages);
        const context = this.contextManager.getContext();

        let agentChain = [];
        let firstAgentType = await this.decideFirstAgent(context);
        let firstAgent = AgentFactory.createAgent(firstAgentType);
        agentChain.push(firstAgent);

        let firstResponse = await firstAgent.process(userPrompt, previousMessages);
        this.contextManager.updateContext(firstAgent.name, firstResponse);

        let nextAgentType = await this.decideNextAgent(this.contextManager.getContext());
        while (nextAgentType !== AGENT_TYPES.None && agentChain.length < this.MAX_AGENT_CHAIN_LENGTH) {
            let nextAgent = AgentFactory.createAgent(nextAgentType);
            agentChain.push(nextAgent);

            let nextResponse = await nextAgent.process(userPrompt, previousMessages, this.contextManager.getContext().agentResponses);
            this.contextManager.updateContext(nextAgent.name, nextResponse);

            nextAgentType = await this.decideNextAgent(this.contextManager.getContext());
        }

        return this.generateFinalResponse(this.contextManager.getContext().agentResponses);
    }

    generateFinalResponse(agentResponses) {
        return agentResponses.join('\n');
    }
}

module.exports = CoordinatorAgent;
