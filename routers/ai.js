const express = require('express');
const router = express.Router();
const { OpenAIClient, AzureKeyCredential } = require("@azure/openai");
let client = null;
// const deploymentId = "gpt-35-turbo-16k";
// const deploymentId = "gpt-4";
const deploymentId = 'gpt-4o-0513';

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

    console.log('ben /ai/query route triggered');

    let mostRecentMessage = req.body.mostRecentMessage;
    
    // TODO: compress or summarize these messages, use a dynamic window based on the complexity of the conversation,
    //   or use relevance algorithms to filter down messages, to improve response times and decrease costs of using the API
    let pastMessages = req.body.pastMessages;
    
    let interactionLog = req.body.interactionLog;
    let toolAPIs = req.body.toolAPIs;
    let connectedUsers = req.body.connectedUsers;
    let myUser = req.body.myUser;
    let simplifiedDataModel = req.body.simplifiedDataModel;
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

    let systemPrompt = `As an AI assistant, your role is to support users interacting within a 3D digital-twin platform. Users can add, interact with, and manage spatial applications in a scanned environment for various tasks like annotation and collaboration. You'll answer questions about both current and historical interactions, and you can use the API registry to call functions within these spatial applications. Remember, spatial tools can be opened, interacted with, and closed or minimized in the 3D space, and each user's interaction shifts their focus among these tools. Don\'t format your responses with markdown, just use plain text in your responses.`;
    //
    // let systemPrompt = `As an AI assistant, you support users on a 3D digital-twin platform, managing spatial applications for tasks like annotation and collaboration. You'll handle queries about interactions, use an API registry to activate functions, and manage spatial tools which users can open, interact with, close, or minimize.`;


    // let connectedUsersMessage = `Here is a list of the names of the users who are currently connected to the
    // session, as well as their current cursor position in 3D space. The list of users may change over time, and their
    // cursor positions will move to where they are currently looking at. Users who haven't set their username or logged in
    // will appear as a "Anonymous User". It is possible that multiple users have the same name, or that multiple
    // "Anonymous Users" are connected at once, so please consider each entry in this list to be a unique person.
    // \n
    // ${JSON.stringify(connectedUsers)}`;

    let connectedUsersMessage = `Here is the current list of connected users with their cursor positions in 3D space. Users are uniquely identified, even if they have the same name or are listed as "Anonymous User".\n${JSON.stringify(connectedUsers)}`;

    let myUserMessage = '';
    if (myUser) {
        myUserMessage = `The current user is ${myUser.name}. When the user refers to "here," "this location," or similar indirect spatial terms, interpret these as referring to the spatial cursor position at ${myUser.spatialCursorPosition}. Use this position to accurately execute spatially related commands, such as drawing or placing objects in the 3D space around the cursor.`;
    } else {
        myUserMessage = `If the user mentions "here," "this location," or similar indirect spatial terms, and you do not have access to their current spatial cursor position or do not know who they are, ask them to clarify their position or identify themselves. For example, respond with "Could you please specify where you mean by 'here'?" or "Could you tell me your user name or describe the location you are referring to?"`;
    }

//     let sceneHierarchyMessage = `You have access to a data model representing the current scene hierarchy, which includes 'objects' and their 'child applications'. Each 'object' in the scene, which could be a physical or virtual representation, has associated spatial applications attached to it. Here's how to interpret the data model:
// - 'objectId' and 'objectType' indicate the unique identifier and type of the object respectively.
// - 'worldPosition' and 'worldMatrix' provide the object's position and orientation in the world space.
// - Each object may have 'child applications' attached, which are tools like drawing applications described earlier. These applications are identified by 'applicationId' and 'applicationType', with their respective positions and orientations also provided.
// Use this data model to understand where applications are located relative to objects in the scene and how they interact with each other. This information is crucial for responding to user queries about the spatial configuration and interactions within the digital twin environment.\n${simplifiedDataModel}`;

    let sceneHierarchyMessage = `The current scene hierarchy includes both 'objects' and their 'child applications'. Objects serve as anchors for the spatial applications that users interact with. Key data for each application includes:
- 'applicationType' describes the type of the application.
- 'worldPosition' provides the spatial position in the scene.
Use this information to understand the placement and configuration of applications relative to their parent objects in the scene, facilitating accurate responses to user queries about spatial interactions within the digital twin environment. Don't directly tell the user the IDs of any of these entities, as they are meaningless to the user. In your response, please preserve any exact text matching the applicationType (case sensitive), as these are linked to UUIDs and must not be changed. \n${JSON.stringify(simplifiedDataModel)}`;

//     let sceneHierarchyMessage = `The scene includes 'objects' and their 'child applications'. Objects anchor user-interactive spatial applications. Key data: 
// - 'applicationId' and 'applicationType' for application identification.
// - 'worldPosition' and 'worldMatrix' for spatial data.
// This data helps manage and respond to queries about spatial interactions. Don't directly tell the user the IDs of any of these entities, as they are meaningless to the user. \n${JSON.stringify(simplifiedDataModel)}`;

    // let interactionLogMessage = `Here is the interaction log of what has happened in the space so far during the
    // current session. Please note that this is only a log of changes performed in the space, and they are cumulative. So,
    // for example, if you see two messages that a user added a certain tool to the space, that means that there are now two
    // tools in the space. If tools are deleted, their functions are removed from the API registry. When new tools are added,
    // their functions are added to the API registry.
    // \n
    // ${interactionLog}`;

    let interactionLogMessage = `Below is the cumulative log of interactions within the space for the current session, detailing tool additions and removals. Remember, each logged addition indicates the presence of that tool in the space. If the user asks for a summary, they most likely mean a summary of the interaction log.\n${interactionLog}`;

    // const spatialLogicMessage = `Some interactions that you will be asked about might deal with 3D space and coordinates.
    // If a location is asked about, for example "the position of the spatial cursor of User A", you should attempt to resolve that
    // from a semantic location into [X,Y,Z] coordinates. Use any information use as the connected users and the interaction log
    // to attempt to convert abstract spatial references into numerical coordinates. The coordinate system of this space uses millimeters for
    // units, has its [0,0,0] origin at the center of the floor of the scene, and uses a right-handed coordinate system. So, for example,
    // if a user asks you about "1 meter above the origin" they would be referring to location [0,1000,0].`;

    // let spatialLogicMessage = `When resolving questions about spatial locations, such as "the position of the spatial cursor of User A", convert semantic descriptions into [X,Y,Z] coordinates based on a right-handed millimeter coordinate system originating at the center of the floor scene.`;

    let spatialLogicMessage = `Resolve spatial location queries, like "the position of the spatial cursor of User A", from descriptions to [X,Y,Z] coordinates using a right-handed millimeter coordinate system centered at the scene's floor.`;

    // let functionGuidelinesMessage = `Note: Function calls should be triggered by explicit user requests or when a user command clearly implies a series of related actions. When a command such as "draw a blue square of size 1000" is received, interpret this as authorization to execute all necessary sub-actions in sequence to fully complete the task, without requiring further user confirmation unless there is ambiguity. Continuously evaluate user commands against the functions in the API registry and execute them sequentially to fulfill the complete intention of the user's request. If the intent or the sequence of actions is unclear, then request further clarification before proceeding.`;

    let functionGuidelinesMessage = `Function calls are triggered by explicit user requests or commands implying a series of actions, like "draw a blue square of size 1000". Interpret such commands as complete tasks to be executed in sequence, seeking clarification only if the user's intent or actions are unclear.`;

    let messages = [
        // first give it the "instruction manual" for what to do and how the system works
        { role: "system", content: systemPrompt },
        // then give it the list of users connected to the session
        { role: "system", content: connectedUsersMessage },
        // then give it the current object data structure (simplified to remove irrelevant properties and including additional sceneGraph information)
        { role: "system", content: sceneHierarchyMessage },
        // then give it the log of actions taken by users (adding/removing/using tools)
        { role: "system", content: interactionLogMessage },
        // then give it the JSON-structured API registry with instructions on how to use it
        // { role: "system", content: toolAPIRegistryMessage },
        // then give it information on how to think about space in the system
        { role: "system", content: spatialLogicMessage },
        // tell the system which user you are and how to deal with terms like "here"
        { role: "system", content: myUserMessage },
        // give it some extra instructions on how to call functions, to reduce false positives and allow chains of functions to be called from a single query
        { role: "system", content: functionGuidelinesMessage },
        // then give it the log of past messages (limited to some maximum history length number of messages)
        ...Object.values(pastMessages),
        // finally, give it the message that the user just typed in
        mostRecentMessage
    ];

    try {

        console.log(`waiting for chatCompletion for /query`);

        let result = await client.getChatCompletions(deploymentId, messages, {
            functions: functions,
            function_call: 'auto'
        });

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
            { role: 'function', name: fnName, content: JSON.stringify(fnArgs) },
            { role: 'assistant', content: JSON.stringify(functionResult) },
            { role: 'system', content: 'Please respond to the user\'s last input, based on the result of the function call.'}
        ];

        try {
            console.log(`waiting for chatCompletion in /continue-query for ${fnName} (${fnArgs})`);

            // let fastDeploymentId = "gpt-35-turbo-16k";
            let result = await client.getChatCompletions(deploymentId, messages, {
                functions: functions,
                function_call: 'auto'
            });

            // let result = await client.getChatCompletions(fastDeploymentId, messages);

            console.log(`chatCompletion done for /continue-query for ${fnName} (${fnArgs})`);

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
