const express = require('express');
const router = express.Router();
const { OpenAIClient, AzureKeyCredential } = require("@azure/openai");
const { initClient } = require('../libraries/ai/apiClient');

// const { AIAgent, CoordinatorAgent, ChatbotAgent, ApiFunctionAgent } = require('../libraries/ai/AIAgent.js');

const CoordinatorAgent = require('../libraries/ai/CoordinatorAgent');

// const { AssistantsClient } = require("@azure/openai-assistants");
let client = null;
// let assistantsClient = null; // can do function calling
// let assistant = null;
// const deploymentId = "gpt-35-turbo-16k";
const deploymentId = "gpt-4";
// const deploymentId = "gpt-4o";

function parseCategory(result) {
    console.log('result in parseCategory(): ' + result);
    if (result.includes('summary')) {
        return 1;
    } else if (result.includes('debug')) {
        return 2;
    } else if (result.includes('tools')) {
        return 3;
    } else if (result.includes('pdf')) {
        return 4;
    } else if (result.includes('tool content')) {
        return 5;
    } else if (result.includes('other')) {
        return 6;
    } else {
        return 6;
    }
}

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
        
        initClient(endpoint, azureApiKey);

        // createAssistant(endpoint, azureApiKey);

        // assistantsClient = new AssistantsClient(endpoint, new AzureKeyCredential(azureApiKey));
        //
        // // assistant = await client.beta.assistants.create(
        // //     instructions="You are a 3D software assistant. Use the provided functions to answer questions or perform actions on the user's behalf.",
        // //     model=""
        // // )
        //
        // assistant = await assistantsClient.createAssistant({
        //     model: "gpt-4-1106-preview",
        //     name: "JS Math Tutor",
        //     instructions: "You are a personal math tutor. Write and run code to answer math questions.",
        //     tools: [{ type: "code_interpreter" }]
        // });

        let json = JSON.stringify({answer: 'success'});
        res.status(200).send(json);
    } else {
        let json = JSON.stringify({answer: 'error, invalid endpoint or api key'});
        res.status(400).send(json);
    }
});

// async function createAssistant(endpoint, azureApiKey) {
//     try {
//         const assistantsClient = new AssistantsClient(endpoint, new AzureKeyCredential(azureApiKey));
//
//         const assistant = await assistantsClient.createAssistant({
//             model: deploymentId, //"gpt-4-1106-preview", "gpt-4-turbo"
//             name: "JS Math Tutor",
//             instructions: "You are a personal math tutor. Write and run code to answer math questions.",
//             tools: [{ type: "code_interpreter" }]
//         });
//
//         console.log("Assistant created successfully:", assistant);
//     } catch (error) {
//         console.error("Failed to create assistant:", error);
//     }
// }

// router.post('/assistant', async function(req, res) {
//     const assistantThread = await assistantsClient.createThread();
//    
//     // const question = "I need to solve the equation '3x + 11 = 14'. Can you help me?";
//     const question = req.body.mostRecentMessage || "I need to solve the equation '3x + 11 = 14'. Can you help me?";
//
//     const messageResponse = await assistantsClient.createMessage(assistantThread.id, "user", question);
//
//     let json = JSON.stringify({ answer: messageResponse });
//     res.status(200).send(json);
//    
//     return;
//
//     let runResponse = await assistantsClient.createRun(assistantThread.id, {
//         assistantId: assistant.id,
//         instructions: "Please address the user as Jane Doe. The user has a premium account."
//     });
//
//     do {
//         await new Promise((resolve) => setTimeout(resolve, 800));
//         runResponse = await assistantsClient.getRun(assistantThread.id, runResponse.id);
//     } while (runResponse.status === "queued" || runResponse.status === "in_progress")
//
//     const runMessages = await assistantsClient.listMessages(assistantThread.id);
//    
//     let responseMessages = [];
//     for (const runMessageDatum of runMessages.data) {
//         for (const item of runMessageDatum.content) {
//             if (item.type === "text") {
//                 console.log(item.text.value);
//                 responseMessages.push(item.text.value);
//             }
//             // else if (item.type === "image_file") {
//             //     console.log(item.imageFile.fileId);
//             // }
//         }
//     }
//
//     let json2 = JSON.stringify({ answer: `${responseMessages.join('.\n')}`});
//     res.status(200).send(json2);
// });

async function createAIAgents() {

    // let systemPrompt = `You are a helpful assistant whose job is to understand an log of interactions that one or
    // more users has performed within a 3D digital-twin software. Within the software, the users can add various spatial
    // applications into a scanned environment, to annotate, record, analyze, document, mark-up, and otherwise collaborate
    // in the space, synchronously or asynchronously. Some of these spatial applications also have functions that you can
    // activate, which will be provided to you in the form of an API registry. You are a helpful assistant who will answer
    // questions that the user has about the current and historical state of the space and the interactions that have taken
    // place within it, and sometimes make use of the API registry to perform actions within the software to fulfill the
    // user's requests. Here are some key things to know about the system: A "spatial tool" or a "spatial application"
    // represents a component that users can add to the space. Generally, spatial applications are represented by an icon
    // in 3D space, and when the user clicks on it the application is opened and can be interacted with. It can then be
    // closed with an X button or "minimized" (un-focused) with a minimize button. For example, the spatialDraw tool is a
    // spatial application that, when opened, displays UI that allows the user to annotate the 3D scene. Any number of each
    // application can be added to the space and coexist at the same time. A user's "focus" changes when they click on
    // another spatial application icon, allowing them to view and edit the contents of that tool. The term "avatar" in
    // this system is synonymous with a "connected user", and the list of connected users will be provided to you.`;
    //
    // const messages = [
    //     // first give it the "instruction manual" for what to do and how the system works
    //     { role: "system", content: systemPrompt },
    //     // // then give it the list of users connected to the session
    //     // { role: "system", content: connectedUsersMessage },
    //     // // then give it the log of actions taken by users (adding/removing/using tools)
    //     // { role: "system", content: interactionLogMessage },
    //     // // then give it the JSON-structured API registry with instructions on how to use it
    //     // { role: "system", content: toolAPIRegistryMessage },
    //     // // then give it the log of past messages (limited to some maximum history length number of messages)
    //     // ...Object.values(pastMessages),
    //     // // finally, give it the message that the user just typed in
    //     // mostRecentMessage
    // ]
    
    let coordinator = new AIAgent([
        { role: 'system', content: ''}
    ]);
    
    let apiAssistant = new AIAgent([
        { role: 'system', content: ''}
    ]);
    
    let chatbot = new AIAgent([
        { role: 'system', content: ''}
    ]);
    
    let pastMessages = [{}];
    let mostRecentMessage = {};
    let response = await coordinator.ask([
        ...Object.values(pastMessages),
        mostRecentMessage
    ]);
}

router.post('/questionAgents', async function (req, res) {
    console.log('agents ai question route triggered');

    let mostRecentMessage = req.body.mostRecentMessage;
    let pastMessages = req.body.pastMessages;
    let interactionLog = req.body.interactionLog;
    let toolAPIs = req.body.toolAPIs;
    let connectedUsers = req.body.connectedUsers;
    let extra = req.body.extra; // contains the worldId

    // const userPrompt = "Add a Hello World message to the chat using the addMessage API";
    // const previousMessages = [
    //     { role: 'system', content: 'You are a helpful assistant.' }
    // ];
    
    const coordinatorPrompt = {
        role: 'system', content: 'You are a coordinator agent that decides which other agents to spawn based on the user request.'
    };

    const coordinator = new CoordinatorAgent({
        systemInstruction: coordinatorPrompt
    });

    try {
        const response = await coordinator.process(mostRecentMessage, pastMessages);
        res.status(200).json({ answer: response });
    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).json({ error: 'An error occurred while processing your request.' });
    }
});

router.post('/questionChain', async function(req, res) {
    console.log('chain ai question route triggered');

    let mostRecentMessage = req.body.mostRecentMessage;
    let pastMessages = req.body.pastMessages;
    let interactionLog = req.body.interactionLog;
    let toolAPIs = req.body.toolAPIs;
    let connectedUsers = req.body.connectedUsers;
    let extra = req.body.extra; // contains the worldId
    
    const coordinatorPrompt = 'You are a coordinator AI agent, part of a toolkit of AI agents that can work together to fulfill complex user requests. Your job is to determine which other AI agents to spawn and delegate work to. Agents must be spawned one at a time in a chain. When you spawn an agent, it will receive your instructions and the user request, and it will respond to you with its response to that request, possibly executing some task in the background. When you receive a response from an agent, you must decide whether the original user request has been fulfilled, or whether to spawn another AI agent in the chain to continue working on the request. When you eventually decide that the task has been completed, you should respond to the user.';

    let toolAPIRegistryMessage = `Here are the available tool APIs, in JSON format. You are working together with
    another AI assistant, whose job is to actually invoke the appropriate APIs (if any) to fulfill the user's response).
    However, that AI assistant has no way to display messages to the end user. If you are asked to perform any APIs,
    please respond to the user as if you have the power to actually call these functions, as there is another agent
    working behind the scenes to make this possible, despite the fact that you are just a chat bot. Therefore, if there is a
    relevant API, and the user asks you to perform an action, don't apologize saying "as a text-based AI assistant,
    I don't have the capability to do [requested action]" – just respond that you will do it with the API.
    ${JSON.stringify(toolAPIs)}`;
    
    const chatbotPrompt = `You are a helpful assistant whose job is to understand an log of interactions that one or
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
    
    const apiFunctionPrompt = `You are an AI assistant used to determine which, if any, APIs from an API registry
    should be called to fulfill the user's request. You are working in the context of an interactive 3D software, which
    contains a variety of "spatial tools" (aka "spatial applications") that one or more users can add to a 3D scene, to
    annotate, record, analyze, document, mark-up, and otherwise collaborate in a 3D scan of a physical environment.
    You are paired up with a helpful AI assistant who will receive the same user input as you. The helpful assistant
    will respond with messages that will be displayed to the user. You, however, are not speaking to the user; the user
    will never see your responses. Instead, your responses will be parsed by a regex to determine which APIs to call.
    
    Note that sometimes users refer to tools by an imprecise name. For example, a "spatialDraw" tool might just be
    referred to as a "drawing", and a "communication" tool might be called a "chat". When in doubt, try to find a name
    in the available tool APIs that might possibly match what the user is referring to.
    
    You should format your response in a JSON format similar to this template:
     [{
        applicationId: 'testApplication123',
        apiName: 'drawLine',
        arguments: [
            startPoint: (1, 2, 3),
            endPoint: (4, 5, 6),
            color: 'blue'
        ]
     }]
     
     Your response should be an empty array if no APIs are needed to fulfill the request. If multiple are needed, include
     multiple entries in the array. Please ensure that the applicationId and apiName exactly matches the ones defined in
     the list of available APIs, which are provided to you. You will also be provided with the list of users connected
     to the session, and a log of interactions taken in the space, in case these help you resolve which APIs to respond with.`;
    
    const coordinator = new CoordinatorAgent(client,
        [
            // first give it the "instruction manual" for what to do and how the system works
            { role: "system", content: coordinatorPrompt },
            // give it the tool API registry
            { role: "system", content: toolAPIRegistryMessage },
        ],
        {
            chatbot: new ChatbotAgent(client, [
                { role: "system", content: chatbotPrompt },
            ]),
            apiFunction: new ApiFunctionAgent(client, [
                { role: "system", content: apiFunctionPrompt },
            ])
        }
    );
    
    const finalResponse = await coordinator.process(mostRecentMessage, pastMessages);
    console.log('finalResponse = ', finalResponse);

    // let result = await client.getChatCompletions(deploymentId, messages);
    // console.log(result);
    // let actualResult = result.choices[0].message.content;
    // console.log(actualResult);

    let json = JSON.stringify({
        answer: finalResponse,
        // apiAnswer: actualApiResult,
    });
    res.status(200).send(json);
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

async function getFunctionResult(functionName, functionArgs) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (functionName === 'addLine') {
                let start = functionArgs.startPoint;
                let end = functionArgs.endPoint;
                let color = functionArgs.color;
                resolve(`${color} line drawn from (${start.x},${start.y},${start.z}) to (${end.x},${end.y},${end.z})`);
            } else {
                resolve(`Success: ${true}`);
            }
        }, 100);
    });
}

let pendingFunctionCalls = {};

function waitForFunctionResult(functionCallId) {
    return new Promise((resolve, reject) => {
        const checkResult = () => {
            if (pendingFunctionCalls[functionCallId] && pendingFunctionCalls[functionCallId].result) {
                const result = pendingFunctionCalls[functionCallId].result;
                delete pendingFunctionCalls[functionCallId];
                resolve(result);
            } else {
                setTimeout(checkResult, 100);
            }
        };
        checkResult();
    });
}

router.post('/function-result', async function(req, res) {
    const { functionCallId, functionResult } = req.body;
    if (pendingFunctionCalls[functionCallId]) {
        pendingFunctionCalls[functionCallId].result = functionResult;
        res.status(200).send({ status: 'ok' });
    } else {
        res.status(400).send({ error: 'Invalid function call ID' });
    }
});

router.get('/query-status', (req, res) => {
    const { functionCallId } = req.query;
    if (pendingFunctionCalls[functionCallId]) {
        const functionCall = pendingFunctionCalls[functionCallId];
        if (functionCall.result) {
            res.status(200).send({ answer: functionCall.result });
        } else {
            res.status(200).send({ status: 'pending' });
        }
    } else {
        res.status(400).send({ error: 'Invalid function call ID' });
    }
});

router.post('/query', async function(req, res) {

    console.log('ben ai question route triggered');

    let mostRecentMessage = req.body.mostRecentMessage;
    let pastMessages = req.body.pastMessages;
    let interactionLog = req.body.interactionLog;
    let toolAPIs = req.body.toolAPIs;
    let connectedUsers = req.body.connectedUsers;
    let extra = req.body.extra; // contains the worldId

    const functions = convertToolAPIRegistryToFunctions(toolAPIs);
    // console.log(functions);

    // let systemPrompt = `You are a helpful assistant whose job is to understand an log of interactions that one or
    // more users has performed within a 3D digital-twin software, answer their questions, and call any available functions
    // needed to fulfill their request. Within the software, the users can add various spatial
    // applications into a scanned environment, to annotate, record, analyze, document, mark-up, and otherwise collaborate
    // in the space, synchronously or asynchronously. Some of these spatial applications also have functions that you can
    // activate, which will be provided to you in the form of an API registry. You are a helpful assistant who will answer
    // questions that the user has about the current and historical state of the space and the interactions that have taken
    // place within it, and sometimes make use of the API registry to perform actions within the software to fulfill the
    // user's requests. Here are some key things to know about the system: A "spatial tool" or a "spatial application"
    // represents a component that users can add to the space. Generally, spatial applications are represented by an icon
    // in 3D space, and when the user clicks on it the application is opened and can be interacted with. It can then be
    // closed with an X button or "minimized" (un-focused) with a minimize button. For example, the spatialDraw tool is a
    // spatial application that, when opened, displays UI that allows the user to annotate the 3D scene. Any number of each
    // application can be added to the space and coexist at the same time. A user's "focus" changes when they click on
    // another spatial application icon, allowing them to view and edit the contents of that tool. The term "avatar" in
    // this system is synonymous with a "connected user", and the list of connected users will be provided to you.`;

    let systemPrompt = `As an AI assistant, your role is to support users interacting within a 3D digital-twin platform. Users can add, interact with, and manage spatial applications in a scanned environment for various tasks like annotation and collaboration. You'll answer questions about both current and historical interactions, and you can use the API registry to call functions within these spatial applications. Remember, spatial tools can be opened, interacted with, and closed or minimized in the 3D space, and each user's interaction shifts their focus among these tools.`;

    // TODO: provide the spatial cursor position as an additional piece of information

    // let connectedUsersMessage = `Here is a list of the names of the users who are currently connected to the
    // session, as well as their current cursor position in 3D space. The list of users may change over time, and their
    // cursor positions will move to where they are currently looking at. Users who haven't set their username or logged in
    // will appear as a "Anonymous User". It is possible that multiple users have the same name, or that multiple
    // "Anonymous Users" are connected at once, so please consider each entry in this list to be a unique person.
    // \n
    // ${JSON.stringify(connectedUsers)}`;

    let connectedUsersMessage = `Here is the current list of connected users with their cursor positions in 3D space. Users are uniquely identified, even if they have the same name or are listed as "Anonymous User".\n${JSON.stringify(connectedUsers)}`;

    // let interactionLogMessage = `Here is the interaction log of what has happened in the space so far during the
    // current session. Please note that this is only a log of changes performed in the space, and they are cumulative. So,
    // for example, if you see two messages that a user added a certain tool to the space, that means that there are now two
    // tools in the space. If tools are deleted, their functions are removed from the API registry. When new tools are added,
    // their functions are added to the API registry.
    // \n
    // ${interactionLog}`;

    let interactionLogMessage = `Below is the cumulative log of interactions within the space for the current session, detailing tool additions and removals. Remember, each logged addition indicates the presence of that tool in the space.\n${interactionLog}`;

    // const spatialLogicMessage = `Some interactions that you will be asked about might deal with 3D space and coordinates.
    // If a location is asked about, for example "the position of the spatial cursor of User A", you should attempt to resolve that
    // from a semantic location into [X,Y,Z] coordinates. Use any information use as the connected users and the interaction log
    // to attempt to convert abstract spatial references into numerical coordinates. The coordinate system of this space uses millimeters for
    // units, has its [0,0,0] origin at the center of the floor of the scene, and uses a right-handed coordinate system. So, for example,
    // if a user asks you about "1 meter above the origin" they would be referring to location [0,1000,0].`;

    let spatialLogicMessage = `When resolving questions about spatial locations, such as "the position of the spatial cursor of User A", convert semantic descriptions into [X,Y,Z] coordinates based on a right-handed millimeter coordinate system originating at the center of the floor scene.`;

    // let toolAPIRegistryMessage = `Here are the available tool APIs, in JSON format. Please remember that you can
    // only use APIs that belong to spatial applications that are still currently in the space. If an application is deleted,
    // that tool's ID is removed from the registry.
    // \n
    // If you determine that one of these APIs should be called to fulfill the user's request, please format your response
    // to include the application ID and the API name surrounded by double square brackets. For example: [[spatialDraw123][clearCanvas]] or
    // [[spatialDraw123][addLine(startPoint, endPoint, usePathfinding)]].
    // ${JSON.stringify(toolAPIs)}`;

    // let toolAPIRegistryMessage = `Here are the available tool APIs, in JSON format. You are working together with
    // another AI assistant, whose job is to actually invoke the appropriate APIs (if any) to fulfill the user's response).
    // However, that AI assistant has no way to display messages to the end user. If you are asked to perform any APIs,
    // please respond to the user as if you have the power to actually call these functions, as there is another agent
    // working behind the scenes to make this possible, despite the fact that you are just a chat bot. Therefore, if there is a
    // relevant API, and the user asks you to perform an action, don't apologize saying "as a text-based AI assistant,
    // I don't have the capability to do [requested action]" – just respond that you will do it with the API.
    // ${JSON.stringify(toolAPIs)}`;

    // let functionGuidelinesMessage = `Note: Function calls should only be triggered by explicit user requests. If a user's message includes direct command phrases, evaluate if these correspond to specific functions in the API registry. In cases of ambiguity, prioritize responding with information or asking for clarification. Don't say that you've performed a function unless you have done so after the user's most recent message.`;

    let functionGuidelinesMessage = `Note: Function calls should be triggered by explicit user requests or when a single command clearly implies a series of related actions. When a user's message describes a complex action that involves multiple steps (like "draw a blue square of size 1000"), interpret this as a directive to perform all necessary sub-actions in sequence to complete the described task. Evaluate user commands for specific or implied functions in the API registry, and execute them sequentially if they collectively fulfill the user's request. In cases of ambiguity about the user's intent or how to proceed with multiple function calls, prioritize asking for clarification before proceeding.`;

    let messages = [
        // first give it the "instruction manual" for what to do and how the system works
        { role: "system", content: systemPrompt },
        // then give it the list of users connected to the session
        { role: "system", content: connectedUsersMessage },
        // then give it the log of actions taken by users (adding/removing/using tools)
        { role: "system", content: interactionLogMessage },
        // then give it the JSON-structured API registry with instructions on how to use it
        // { role: "system", content: toolAPIRegistryMessage },
        // then give it information on how to think about space in the system
        { role: "system", content: spatialLogicMessage },
        { role: "system", content: functionGuidelinesMessage },
        // then give it the log of past messages (limited to some maximum history length number of messages)
        ...Object.values(pastMessages),
        // finally, give it the message that the user just typed in
        mostRecentMessage
    ];

    try {
        let result = await client.getChatCompletions(deploymentId, messages, {
            functions: functions,
            function_call: 'auto'
        });
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

router.post('/continue-query', async (req, res) => {
    const { functionCallId, result } = req.body;
    const pendingCall = pendingFunctionCalls[functionCallId];

    if (pendingCall) {
        let { messages, functions, fnName, fnArgs } = pendingCall;
        let functionResult = result;

        // Create a new message with the function result
        messages = [
            ...messages,
            { role: 'function', name: fnName, content: JSON.stringify(fnArgs) },
            { role: 'assistant', content: JSON.stringify(functionResult) }
        ];

        try {
            let result = await client.getChatCompletions(deploymentId, messages, {
                functions: functions,
                function_call: 'auto'
            });

            let choice = result.choices[0];

            if (choice.finishReason === 'function_call') {
                let functionCall = choice.message.functionCall;
                let fnArgs = JSON.parse(functionCall.arguments);
                let fnName = functionCall.name;

                // Send the function call to the client
                const newFunctionCallId = `${Date.now()}-${Math.random()}`;
                pendingFunctionCalls[newFunctionCallId] = { messages, fnName, fnArgs };

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

router.post('/questionComplex', async function(req, res) {

    console.log('ben ai question route triggered');

    let mostRecentMessage = req.body.mostRecentMessage;
    let pastMessages = req.body.pastMessages;
    let interactionLog = req.body.interactionLog;
    let toolAPIs = req.body.toolAPIs;
    let connectedUsers = req.body.connectedUsers;
    let extra = req.body.extra; // contains the worldId

    let systemPrompt = `You are a helpful assistant whose job is to understand an log of interactions that one or
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
    
    // TODO: provide the spatial cursor position as an additional piece of information

    let connectedUsersMessage = `Here is a list of the names of the users who are currently connected to the
    session, as well as their current cursor position in 3D space. The list of users may change over time, and their
    cursor positions will move to where they are currently looking at. Users who haven't set their username or logged in
    will appear as a "Anonymous User". It is possible that multiple users have the same name, or that multiple
    "Anonymous Users" are connected at once, so please consider each entry in this list to be a unique person.
    \n
    ${JSON.stringify(connectedUsers)}`;

    let interactionLogMessage = `Here is the interaction log of what has happened in the space so far during the
    current session. Please note that this is only a log of changes performed in the space, and they are cumulative. So,
    for example, if you see two messages that a user added a certain tool to the space, that means that there are now two
    tools in the space. If tools are deleted, their functions are removed from the API registry. When new tools are added,
    their functions are added to the API registry.
    \n
    ${interactionLog}`;

    // let toolAPIRegistryMessage = `Here are the available tool APIs, in JSON format. Please remember that you can
    // only use APIs that belong to spatial applications that are still currently in the space. If an application is deleted,
    // that tool's ID is removed from the registry.
    // \n
    // If you determine that one of these APIs should be called to fulfill the user's request, please format your response
    // to include the application ID and the API name surrounded by double square brackets. For example: [[spatialDraw123][clearCanvas]] or
    // [[spatialDraw123][addLine(startPoint, endPoint, usePathfinding)]].
    // ${JSON.stringify(toolAPIs)}`;

    let toolAPIRegistryMessage = `Here are the available tool APIs, in JSON format. You are working together with
    another AI assistant, whose job is to actually invoke the appropriate APIs (if any) to fulfill the user's response).
    However, that AI assistant has no way to display messages to the end user. If you are asked to perform any APIs,
    please respond to the user as if you have the power to actually call these functions, as there is another agent
    working behind the scenes to make this possible, despite the fact that you are just a chat bot. Therefore, if there is a
    relevant API, and the user asks you to perform an action, don't apologize saying "as a text-based AI assistant,
    I don't have the capability to do [requested action]" – just respond that you will do it with the API.
    ${JSON.stringify(toolAPIs)}`;

    const messages = [
        // first give it the "instruction manual" for what to do and how the system works
        { role: "system", content: systemPrompt },
        // then give it the list of users connected to the session
        { role: "system", content: connectedUsersMessage },
        // then give it the log of actions taken by users (adding/removing/using tools)
        { role: "system", content: interactionLogMessage },
        // then give it the JSON-structured API registry with instructions on how to use it
        { role: "system", content: toolAPIRegistryMessage },
        // then give it the log of past messages (limited to some maximum history length number of messages)
        ...Object.values(pastMessages),
        // finally, give it the message that the user just typed in
        mostRecentMessage
    ];

    let result = await client.getChatCompletions(deploymentId, messages);
    console.log(result);
    let actualResult = result.choices[0].message.content;
    console.log(actualResult);
    
    const apiSystemPrompt = `You are an AI assistant used to determine which, if any, APIs from an API registry
    should be called to fulfill the user's request. You are working in the context of an interactive 3D software, which
    contains a variety of "spatial tools" (aka "spatial applications") that one or more users can add to a 3D scene, to
    annotate, record, analyze, document, mark-up, and otherwise collaborate in a 3D scan of a physical environment.
    You are paired up with a helpful AI assistant who will receive the same user input as you. The helpful assistant
    will respond with messages that will be displayed to the user. You, however, are not speaking to the user; the user
    will never see your responses. Instead, your responses will be parsed by a regex to determine which APIs to call.
    
    Note that sometimes users refer to tools by an imprecise name. For example, a "spatialDraw" tool might just be
    referred to as a "drawing", and a "communication" tool might be called a "chat". When in doubt, try to find a name
    in the available tool APIs that might possibly match what the user is referring to.
    
    You should format your response in a JSON format similar to this template:
     [{
        applicationId: 'testApplication123',
        apiName: 'drawLine',
        arguments: [
            startPoint: (1, 2, 3),
            endPoint: (4, 5, 6),
            color: 'blue'
        ]
     }]
     
     Your response should be an empty array if no APIs are needed to fulfill the request. If multiple are needed, include
     multiple entries in the array. Please ensure that the applicationId and apiName exactly matches the ones defined in
     the list of available APIs, which are provided to you. You will also be provided with the list of users connected
     to the session, and a log of interactions taken in the space, in case these help you resolve which APIs to respond with.`;
    
    const spatialLogicMessage = `Some interactions that you will be asked about might deal with 3D space and coordinates.
    If a location is asked about, for example "the position of the spatial cursor of User A", you should attempt to resolve that
    from a semantic location into [X,Y,Z] coordinates. Use any information use as the connected users and the interaction log
    to attempt to convert abstract spatial references into numerical coordinates. The coordinate system of this space uses millimeters for
    units, has its [0,0,0] origin at the center of the floor of the scene, and uses a right-handed coordinate system. So, for example,
    if a user asks you about "1 meter above the origin" they would be referring to location [0,1000,0].`;

    const enhancedToolApiRegistryMessage = `Here are the available tool APIs, in JSON format. Please remember that you can
    only use APIs that belong to spatial applications that are still currently in the space. If an application is deleted,
    that tool's ID is removed from the registry.
    \n
    If you determine that one of these APIs should be called to fulfill the user's request, please format your response
    according to the JSON format specified by the above system message, as a regex needs it in that format to parse it.
    
    I repeat, please only respond with a JSON format similar to this array of { applicationId, apiName, arguments } values:
     [{
        applicationId: '',
        apiName: '',
        arguments: [
            {"parameterName": "argumentValue"}
        ]
     }]
     
     The response should be valid JSON. The "arguments" field should be an array with one object in it per parameter
     defined in the registry. The key should be the name of the parameter, and the value should be the value of the parameter.
     
    ${JSON.stringify(toolAPIs)}`;

    const apiMessages = [
        // first give it the "instruction manual" for what to do and how the system works
        { role: "system", content: apiSystemPrompt },
        // then give it the JSON-structured API registry with instructions on how to use it
        { role: "system", content: enhancedToolApiRegistryMessage },
        // then give it the list of users connected to the session
        { role: "system", content: connectedUsersMessage },
        // then give it the log of actions taken by users (adding/removing/using tools)
        { role: "system", content: interactionLogMessage },
        // then give it a message telling it how to think about space and coordinates
        { role: "system", content: spatialLogicMessage },

        // then give it the log of past messages (limited to some maximum history length number of messages)
        // ...Object.values(pastMessages),
        // finally, give it the message that the user just typed in
        mostRecentMessage
    ];
    let apiResult = await client.getChatCompletions(deploymentId, apiMessages);
    console.log(apiResult);
    let actualApiResult = apiResult.choices[0].message.content;
    console.log(actualApiResult);

    let json = JSON.stringify({
        answer: `${actualResult}`,
        apiAnswer: actualApiResult,
    });
    res.status(200).send(json);
});

router.post('/question', async function(req, res) {
    console.log('ai question route triggered');
    let conversation = req.body.conversation;
    let conversation_length = Object.keys(conversation).length;
    let last_dialogue = Object.values(conversation)[conversation_length - 1];
    let last_dialogue_original_content = last_dialogue.content;
    last_dialogue.content += '\n' + last_dialogue.extra;
    delete last_dialogue.extra;
    let authorAll = last_dialogue.communicationToolInfo.authorAll;
    let chatAll = last_dialogue.communicationToolInfo.chatAll;
    delete last_dialogue.communicationToolInfo;


    const category_messages = [
        { role: "system", content: "You are a helpful assistant." },
        ...Object.values(conversation)
    ];
    const messages = [
        { role: "system", content: "You are a helpful assistant." },
        ...Object.values(conversation)
    ];


    let result = await client.getChatCompletions(deploymentId, category_messages);
    let actualResult = result.choices[0].message.content;
    let actualCategory = parseCategory(actualResult);
    let json = null;


    switch (actualCategory) {
    case 6: {
        last_dialogue.content = last_dialogue_original_content;

        result = await client.getChatCompletions(deploymentId, messages);
        actualResult = result.choices[0].message.content;
        json = JSON.stringify({category: `${actualCategory}`, answer: `${actualResult}`});
        res.status(200).send(json);
        break;
    }
    case 1: {
        last_dialogue.content = last_dialogue_original_content;

        let toolRegex = new RegExp("\\b[a-zA-Z0-9]{6}\\b", 'g');
        let avatarRegex = new RegExp("\\b[a-zA-Z0-9]{6}\\b", 'g');
        // todo Steve: use regex to regulate the prompt
        //  Don't change the names starting with '_WORLD_' or '_AVATAR_' in your response
        //  Don't change the names with the regular expression ${}, ${}

        let enhancedPrompt = [...messages, {
            role: "user",
            content: `Here's a log of events. In your response, give me a detailed report in three paragraphs at most. In the report, don't change the IDs satisfying the regular expressions ${toolRegex} and ${avatarRegex}. These IDs are linked to real objects and therefore you must keep these UUIDs unchanged.`
        }];
        // { role: "user", content: `Here's a log of events. In your response, give me a detailed report in three paragraphs at most. In the report, don't change the IDs satisfying the regular expressions ${toolRegex} and ${avatarRegex}. Always respond with the Name and ID pair in the format Name:ID. It is paramount that you do not change the ID's as they are needed to identify the names.` }
        result = await client.getChatCompletions(deploymentId, enhancedPrompt);
        actualResult = result.choices[0].message.content;

        // todo Steve: if there is communication info, then let ai make a summary of the chat history, and populate it to the actualResult
        actualResult += '\n\n';
        for (let i = 1; i <= authorAll.length; i++) {
            let chatQuestion = [
                {role: "system", content: "You are a helpful assistant."},
                {
                    role: "user",
                    content: `${chatAll[i - 1]} Give me a summary of this conversation. Use at most 3 sentences.`
                },
            ];
            let chatSummaryResult = await client.getChatCompletions(deploymentId, chatQuestion);
            let chatSummary = chatSummaryResult.choices[0].message.content;
            let idx = '';
            if (i === 1) {
                idx = '1st';
            } else if (i === 2) {
                idx = '2nd';
            } else if (i === 3) {
                idx = '3rd';
            } else {
                idx = `${i}th`;
            }
            actualResult += `In the ${idx} communication tool chat history, ${authorAll[i - 1]} discussed about: ${chatSummary}`;
            actualResult += '\n\n';
        }

        json = JSON.stringify({category: `${actualCategory}`, answer: `${actualResult}`});
        res.status(200).send(json);
        break;
    }
    case 2:
    case 4: {
        last_dialogue.content = last_dialogue_original_content;

        result = await client.getChatCompletions(deploymentId, messages);
        actualResult = result.choices[0].message.content;
        json = JSON.stringify({
            category: `${actualCategory}`,
            answer: `${actualResult}. Need to further refer to files in the database.`
        });
        res.status(200).send(json);
        break;
    }
    case 3:
    case 5: {
        last_dialogue.content = last_dialogue_original_content + 'What tools are mentioned? You answer can only include the following words, separated by newline character: "spatialDraw", "communication", "spatialVideo", "spatialAnalytics", "spatialMeasure", "onshapeTool". ';

        result = await client.getChatCompletions(deploymentId, messages);
        actualResult = result.choices[0].message.content;
        // todo Steve: to make it more generalized, add support to ignore upper/lower letters & correct spelling
        let toolList = ["spatialDraw", "communication", "spatialVideo", "spatialAnalytics", "spatialMeasure", "onshapeTool"];
        let resultList = [];
        for (let toolName of toolList) {
            if (actualResult.includes(toolName)) resultList.push(toolName);
        }
        let resultTools = '';
        for (let i = 0; i < resultList.length; i++) {
            if (i === resultList.length - 1) {
                resultTools += `${resultList[i]}`;
                continue;
            }
            resultTools += `${resultList[i]}\n`;
        }
        json = JSON.stringify({category: `${actualCategory}`, tools: `${resultTools}`});
        res.status(200).send(json);
        break;
    }
    default: {
        break;
    }
    }
});

const setup = function() {
};

module.exports = {
    router: router,
    setup: setup
};
