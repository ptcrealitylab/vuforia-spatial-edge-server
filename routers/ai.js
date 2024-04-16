const express = require('express');
const router = express.Router();
const { OpenAIClient, AzureKeyCredential } = require("@azure/openai");
let client = null;
const deploymentId = "gpt-35-turbo-16k";

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
    client = new OpenAIClient(endpoint, new AzureKeyCredential(azureApiKey));

    let json = JSON.stringify({answer: 'success'});
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
