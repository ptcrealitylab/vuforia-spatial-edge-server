/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/* global test, beforeAll, afterAll, expect */
const {
    sleep,
    waitForObjects,
    localServer,
    fetchAgent,
} = require('./helpers.js');

const fetch = require('node-fetch');

let server;
beforeAll(async () => {
    server = require('../server.js');
});

afterAll(async () => {
    await server.exit();
    await sleep(1000);
});

test('patches', async () => {
    await waitForObjects();

    let res = await fetch(`${localServer}/history/patches`, {agent: fetchAgent});
    const patches = await res.json();
    expect(patches).toEqual([]);

    res = await fetch(`${localServer}/history/patches`, {
        headers: {
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            key: 'patch0',
            data: 'testData',
        }),
        method: 'POST',
        agent: fetchAgent
    });
    expect(res.ok).toBeTruthy();

    res = await fetch(`${localServer}/history/patches`, {
        headers: {
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            key: 'patch0',
            data: 'duplicate',
        }),
        method: 'POST',
        agent: fetchAgent
    });
    expect(res.ok).toBeTruthy();


    res = await fetch(`${localServer}/history/patches`, {agent: fetchAgent});
    const patchesCreated = await res.json();
    expect(patchesCreated.length).toEqual(1);
    let patch = patchesCreated[0];
    expect(patch.key).toEqual('patch0');
    expect(patch.data).toEqual('testData');

    res = await fetch(`${localServer}/history/patches/patch0`, {
        method: 'DELETE',
        agent: fetchAgent
    });
    expect(res.ok).toBeTruthy();

    res = await fetch(`${localServer}/history/patches`, {agent: fetchAgent});
    const patchesAfterDeletion = await res.json();
    expect(patchesAfterDeletion).toEqual([]);
});


test('logs', async () => {
    const recorder = require('../libraries/recorder.js');
    recorder.clearIntervals();

    await waitForObjects();

    // Create an object to make sure log has an interesting update
    const resNew = await fetch(`${localServer}/`, {
        headers: {
            'Content-type': 'application/x-www-form-urlencoded',
        },
        'body': 'action=new&name=historydummy&isWorld=null',
        'method': 'POST',
        'mode': 'cors',
        agent: fetchAgent
    });
    await resNew.text();

    recorder.saveState();

    let res = await fetch(`${localServer}/history/persist`, {
        method: 'POST',
        agent: fetchAgent
    });
    const persistResult = await res.json();
    expect(persistResult.logName).toBeTruthy();

    await fetch(`${localServer}/`, {
        headers: {
            'Content-type': 'application/x-www-form-urlencoded',
        },
        body: 'action=delete&name=historydummy&frame=',
        method: 'POST',
        agent: fetchAgent
    });

    res = await fetch(`${localServer}/history/logs`, {
        agent: fetchAgent
    });
    const logs = await res.json();
    expect(Array.isArray(logs)).toBeTruthy();
    expect(logs.length > 0).toBeTruthy();
    expect(logs.includes(persistResult.logName)).toBeTruthy();

    res = await fetch(`${localServer}/history/logs/${persistResult.logName}`, {
        agent: fetchAgent
    });
    const persistedLog = await res.json();
    expect(persistedLog).toBeTruthy();

    res = await fetch(`${localServer}/history/logs/${logs.at(-1)}`, {
        agent: fetchAgent
    });
    const latestLog = await res.json();
    expect(latestLog).toBeTruthy();

    res = await fetch(`${localServer}/history/logs/missing`, {
        agent: fetchAgent
    });
    expect(res.status).toBe(404);
});
