const express = require('express');
const router = express.Router();
const { OpenAIClient, AzureKeyCredential } = require("@azure/openai");
let client = null;
// const deploymentId = "gpt-35-turbo-16k";
// const deploymentId = "gpt-4";
const deploymentId = 'gpt-4o-0513';

router.post('/init', async function(req, res) {
    console.log('ai init route triggered');
    if (client !== null) {
        let json = JSON.stringify({answer: 'success'});
        res.status(200).send(json);
        return;
    }
    let endpoint = req.body.endpoint;
    let azureApiKey = req.body.azureApiKey;
    if (endpoint !== '' && azureApiKey !== '') {
        client = new OpenAIClient(endpoint, new AzureKeyCredential(azureApiKey));

        let json = JSON.stringify({answer: 'success'});
        res.status(200).send(json);
    } else {
        let json = JSON.stringify({answer: 'error, invalid endpoint or api key'});
        res.status(400).send(json);
    }
});

function convertToolAPIRegistryToFunctions(toolAPIs) {
    let functionMap = {};
    for (let toolName in toolAPIs) {
        let toolsOfThisType = toolAPIs[toolName];
        for (let toolId in toolsOfThisType) {
            let apisForThisToolType = toolsOfThisType[toolId];
            for (let apiName in apisForThisToolType) {
                if (functionMap[apiName]) continue; // skip duplicates
                try {
                    let apiInfo = apisForThisToolType[apiName];
                    let functionInfo = {
                        name: apiName,
                        description: apiInfo.returnInfo.description,
                        parameters: {
                            type: 'object',
                            properties: {}
                        }
                    };
                    apiInfo.parameterInfo.forEach(parameterInfo => {
                        functionInfo.parameters.properties[parameterInfo.name] = {
                            type: parameterInfo.type.toLowerCase(),
                            description: parameterInfo.description
                        };
                        if (functionInfo.parameters.properties[parameterInfo.name].type === 'point') {
                            functionInfo.parameters.properties[parameterInfo.name].type = 'object';
                            functionInfo.parameters.properties[parameterInfo.name].properties = {
                                x: { type: "number" },
                                y: { type: "number" },
                                z: { type: "number" }
                            };
                            functionInfo.parameters.properties[parameterInfo.name].required = ['x', 'y', 'z'];
                        }
                        if (typeof functionInfo.parameters.required === 'undefined') {
                            functionInfo.parameters.required = [];
                        }
                        functionInfo.parameters.required.push(parameterInfo.name);
                    });
                    functionMap[apiName] = functionInfo;
                } catch (e) {
                    console.warn(`error converting API ${apiName} to function for chat-gpt`, e);
                }
            }
        }
    }
    return Object.values(functionMap);
}

let pendingFunctionCalls = {};

let toolRegex = new RegExp("\\b[a-zA-Z0-9]{5,6}\\b", 'g');

// These prompts should be appended to the messages, with the relevant context appended to the end of each string
const PROMPTS = Object.freeze({
    systemInstructions: `As an AI assistant, your role is to support users interacting within a 3D digital-twin platform. Users can add, interact with, and manage spatial applications in a scanned environment for various tasks like annotation and collaboration. You'll answer questions about both current and historical interactions, and you can use the API registry to call functions within these spatial applications. Remember, spatial tools can be opened, interacted with, and closed or minimized in the 3D space, and each user's interaction shifts their focus among these tools. Don\'t format your responses with markdown, just use plain text in your responses.`,
    connectedUsers: `Here is the current list of connected users with their cursor positions in 3D space. Users are uniquely identified, even if they have the same name or are listed as "Anonymous User".`,
    sceneHierarchy: `The current scene hierarchy includes both 'objects' and their 'child applications' (otherwise known as tools). Objects serve as anchors for the spatial applications that users interact with. Child applications often have a summary of their state, and a list of spatial references within the application that are included in the scene hierarchy. Use this information to understand the placement and configuration of applications relative to their parent objects in the scene, facilitating accurate responses to user queries about spatial interactions within the digital twin environment. Whenever possible, respond with the exact UUIDs of the applications, objects, or spatial references that you are referring to. These UUIDs are keys (satisfying the regular expression ${toolRegex}) in the scene hierarchy and will be used to link your response to additional information. When summarizing the scene hierarchy, you do not need to tell users the exact [X,Y,Z] coordinates of anything, unless specifically asked to.`,
    interactionLog: `Below is the cumulative log of interactions within the space for the current session, detailing tool additions and removals. Remember, each logged addition indicates the presence of that tool in the space. If the user asks for a summary of the session, or how the system changed over time, the interaction log is a good source of this information. Please include the ID of the user and the ID of the tool in your responses involving the interaction log.`,
    spatialLogic: `Resolve spatial location queries, like "the position of the spatial cursor of User A", from descriptions to [X,Y,Z] coordinates using a right-handed millimeter coordinate system. Users generally don't understand coordinates presented as numbers, so only respond with coordinates in [X,Y,Z] format if a user specifically asks for the coordinates, or if their request involves function-calling.`,
    functionGuidelines: `The user may make a request that requires one or more function calls to fulfill it. Function calls are expensive. Before performing a function call, please prepare a plan of the sequence of function calls that you will need to perform to fulfill the request, and ask the user to verify the plan and give you explicit permission to call them. Upon receiving permission, please perform the sequence of function calls sequentially until all of them have been completed, then tell the user the results when all have been completed.`,
    // functionGuidelines: `Function calls are triggered by explicit user requests or commands implying a series of actions, like "draw a blue square of size 1000". Interpret such commands as complete tasks to be executed in sequence, seeking clarification only if the user's intent or actions are unclear.`,
});

// This gets triggered when the user submits a new message to the chat
router.post('/v2/query/', async (req, res) => {
    const userInput = req.body.userInput;
    const context = req.body.context;
    const apiRegistry = req.body.apiRegistry;

    let messages = [];

    // First add some general instructions on how the system operates. These are an active area of experimentation.
    messages.push({
        role: 'system',
        content: PROMPTS.systemInstructions
    });

    messages.push({
        role: 'system',
        content: PROMPTS.spatialLogic
    });

    messages.push({
        role: 'system',
        content: PROMPTS.functionGuidelines
    });

    // Then create a message for each piece of context, using the relevant prompt to optimize how to understand that context.
    if (typeof context.ObjectDataModel !== 'undefined') {
        messages.push({
            role: 'system',
            content: `${PROMPTS.sceneHierarchy} \n Scene hierarchy: \n ${JSON.stringify(context.ObjectDataModel)}`
        });
    }
    if (typeof context.UserList !== 'undefined') {
        messages.push({
            role: 'system',
            content: `${PROMPTS.connectedUsers} \n Connected users: \n ${JSON.stringify(context.UserList.allConnectedUsers)}`
        });
        messages.push({
            role: 'system',
            content: `Current user: ${context.UserList.myUser.name}, cursor at: ${context.UserList.myUser.spatialCursorPosition}`
        });
    }
    if (typeof context.InteractionLog !== 'undefined') {
        messages.push({
            role: 'system',
            content: `${PROMPTS.interactionLog} \n Recent interactions: ${context.InteractionLog}`
        });
    }
    if (typeof context.ChatHistory !== 'undefined') {
        context.ChatHistory.forEach(message => {
            messages.push(message);
        });
    }

    // finally add the text that the user typed into the chat input
    messages.push({ role: 'user', content: userInput });

    let functions = convertToolAPIRegistryToFunctions(apiRegistry);

    try {

        console.log(`waiting for chatCompletion for /query`);

        let result = null;
        if (functions && functions.length && functions.length > 0) {
            result = await client.getChatCompletions(deploymentId, messages, {
                functions: functions,
                function_call: 'auto'
            });
        } else {
            result = await client.getChatCompletions(deploymentId, messages);
        }

        console.log(`chatCompletion done for /query`);

        let choice = result.choices[0];
        if (choice.finishReason === 'function_call') {
            let functionCall = choice.message.functionCall;
            let fnArgs = JSON.parse(functionCall.arguments);
            let fnName = functionCall.name;
            console.log(fnName, fnArgs);

            // Send the function call to the client
            const functionCallId = `${Date.now()}-${Math.random()}`;
            pendingFunctionCalls[functionCallId] = { messages, functions, fnName, fnArgs };

            res.status(200).send({ functionCallId, fnName, fnArgs });
            return;
        }

        let actualResult = choice.message.content;
        res.status(200).send({ answer: actualResult });

    } catch (e) {
        console.warn(e);
        res.status(500).send({ error: e.message || 'An error occurred' });
    }
});

// This gets called when an AI-initiated function call finishes, to process the result and continue the response
router.post('/continue-query', async (req, res) => {
    const { functionCallId, result } = req.body;
    const pendingCall = pendingFunctionCalls[functionCallId];

    if (pendingCall) {
        let { messages, functions, fnName, fnArgs } = pendingCall;
        let functionResult = result;

        console.log(`received /continue-query for ${fnName} (${fnArgs})`);

        // Create a new message with the function result
        messages = [
            ...messages,
            { role: 'function', name: fnName, content: `${JSON.stringify(fnArgs)}` },
            // Telling it to "Please call the next function" afterward seems to help with sequences of functions without detrimental effect if all functions are done.
            { role: 'user', content: `The function ${fnName} returned: ${JSON.stringify(functionResult)}. Please call the next function.` },
            // { role: 'system', content: 'Please respond to the user\'s last input, based on the result of any function calls since the user\'s last input. It is sometimes possible that you may need to call another function in order to fulfill the request. Do not stop calling functions until you have completely fulfilled the request. For example, if the user asks you to draw a square and you only have a function to draw a line, you should call the function four times in a row before responding with text to the user.'}
            // { role: 'system'}
        ];

        try {
            console.log(`waiting for chatCompletion in /continue-query for ${fnName} (${fnArgs})`);

            // let fastDeploymentId = "gpt-35-turbo-16k";
            let result = await client.getChatCompletions(deploymentId, messages, {
                functions: functions,
                function_call: 'auto'
            });

            let choice = result.choices[0];
            console.log(`chatCompletion done for /continue-query for ${fnName} (${fnArgs})`);
            console.log(choice);

            if (choice.finishReason === 'function_call') {
                let functionCall = choice.message.functionCall;
                let fnArgs = JSON.parse(functionCall.arguments);
                let fnName = functionCall.name;

                // Send the function call to the client
                const newFunctionCallId = `${Date.now()}-${Math.random()}`;
                // pendingFunctionCalls[newFunctionCallId] = { messages, fnName, fnArgs };
                pendingFunctionCalls[newFunctionCallId] = { messages, functions, fnName, fnArgs };

                res.status(200).send({ functionCallId: newFunctionCallId, fnName, fnArgs });
            } else {
                let actualResult = choice.message.content;
                res.status(200).send({ answer: actualResult });
            }
        } catch (e) {
            console.warn(e);
            res.status(500).send({ error: e.message || 'An error occurred' });
        }

        delete pendingFunctionCalls[functionCallId];
    } else {
        res.status(400).send({ error: 'Invalid function call ID' });
    }
});

router.post('/process-state-with-prompts', async (req, res) => {
    try {
        const { applicationId, state, prompts } = req.body;

        console.log(`received /process-state-with-prompts for ${applicationId} (${prompts.length} prompts)`);
        if (!prompts || !prompts.length) {
            res.status(400).send({ error: 'No prompts provided' });
            return;
        }

        let promptInput = JSON.stringify(state);
        for (let i = 0; i < prompts.length; i++) {
            let thisPrompt = prompts[i];

            // Create a new message with the function result
            let messages = [
                { role: 'system', content: 'You are a helpful assistant.' },
                { role: 'user', content: `${thisPrompt}\n${JSON.stringify(state)}`}
            ];

            console.log(`waiting for chatCompletion in /process-state-with-prompts for ${applicationId}`);

            // let fastDeploymentId = "gpt-35-turbo-16k";
            let result = await client.getChatCompletions(deploymentId, messages);

            console.log(`chatCompletion done for /process-state-with-prompts for ${applicationId}`);

            let choice = result.choices[0];
            promptInput = choice.message.content;
        }
        res.status(200).send({ answer: promptInput });

    } catch (e) {
        console.warn(e);
        res.status(500).send({ error: e.message || 'An error occurred' });
    }
});

const setup = function() {
};

module.exports = {
    router: router,
    setup: setup
};
