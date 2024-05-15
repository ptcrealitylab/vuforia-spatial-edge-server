const Agent = require('./Agent');
const { AGENT_TYPES } = require('./AgentFactory');
const { getClient, DEPLOYMENT_ID } = require('./apiClient');

const CHATBOT_PROMPT = `You are a helpful assistant whose job is to understand an log of interactions that one or
    more users has performed within a 3D digital-twin software. Within the software, the users can add various spatial
    applications into a scanned environment, to annotate, record, analyze, document, mark-up, and otherwise collaborate
    in the space, synchronously or asynchronously. Some of these spatial applications also have functions that you can
    activate, which will be provided to you in the form of an API registry. You are a helpful assistant who will answer
    questions that the user has about the current and historical state of the space and the interactions that have taken
    place within it, and sometimes make use of the API registry to perform actions within the software to fulfill the
    user's requests. Here are some key things to know about the system: A "spatial tool" or a "spatial application"
    represents a component that users can add to the space. Generally, spatial applications are represented by an icon
    in 3D space, and when the user clicks on it the application is opened and can be interacted with. It can then be
    closed with an X button or "minimized" (un-focused) with a minimize button. For example, the spatialDraw tool is a
    spatial application that, when opened, displays UI that allows the user to annotate the 3D scene. Any number of each
    application can be added to the space and coexist at the same time. A user's "focus" changes when they click on
    another spatial application icon, allowing them to view and edit the contents of that tool. The term "avatar" in
    this system is synonymous with a "connected user", and the list of connected users will be provided to you.`; 

class ChatbotAgent extends Agent {
    constructor(client) {
        super(client);
        this.name = 'ChatbotAgent'; // AGENT_TYPES.ChatbotAgent;
    }
    
    async process(userPrompt, previousMessages, agentResponses) {
        // Use this.client to interact with OpenAI API
        return this.callOpenAiApi(userPrompt, previousMessages);
    }

    async callOpenAiApi(prompt, previousMessages) {
        const client = getClient();
        // const apiResponse = await client.completions.create({
        //     model: 'davinci-codex',
        //     prompt: prompt,
        //     max_tokens: 50
        // });
        //
        // return apiResponse.choices[0].text.trim();

        // const context = this.contextManager.getContext();

        const messages = [
            // ...Object.values(context.systemMessages),
            { role: 'system', content: CHATBOT_PROMPT},
            ...Object.values(previousMessages),
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
}

module.exports = ChatbotAgent;
