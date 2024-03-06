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
} = require('./helpers.js');

const fetch = require('node-fetch');
const https = require('https');

let httpsAgent = new https.Agent({rejectUnauthorized: false});

let server;
beforeAll(async () => {
    server = require('../server.js');
});

afterAll(async () => {
    await server.exit();
    await sleep(1000);
});

test('GET /availableFrames', async () => {
    await waitForObjects();
    const res = await fetch(`${localServer}/availableFrames`, {agent: httpsAgent});
    const frames = await res.json();
    // spot check one core frame
    expect(frames['switch']).toEqual({
        properties: {
            name: 'switch'
        },
        metadata: {
            enabled: true,
            addon: 'vuforia-spatial-core-addon'
        },
    });
});


test('GET /availableLogicBlocks', async () => {
    await waitForObjects();
    const res = await fetch(`${localServer}/availableLogicBlocks`, {agent: httpsAgent});
    const blocks = await res.json();
    // spot check one core block
    expect(blocks.add).toBeTruthy();
    expect(blocks.add.name).toEqual('add');
    expect(blocks.add.blockSize).toEqual(2);
    expect(blocks.add.category).toEqual(4);
    expect(blocks.add.data).toEqual([
        {value: 0, mode: 'f', unit: '', unitMin: 0, unitMax: 1},
        {value: 0, mode: 'f', unit: '', unitMin: 0, unitMax: 1},
        {value: 0, mode: 'f', unit: '', unitMin: 0, unitMax: 1},
        {value: 0, mode: 'f', unit: '', unitMin: 0, unitMax: 1},
    ]);
    expect(blocks.add.privateData).toEqual({});
    expect(blocks.add.publicData).toEqual({});
    expect(blocks.add.activeInputs).toEqual([true, true, false, false]);
    expect(blocks.add.activeOutputs).toEqual([true, false, false, false]);
    expect(blocks.add.nameInput).toEqual(['A', 'B', '', '']);
    expect(blocks.add.nameOutput).toEqual(['A + B', '', '', '']);
    expect(blocks.add.iconImage).toEqual('icon.png');
    expect(blocks.add.stress).toEqual(0);
    expect(blocks.add.type).toEqual('add');
});
