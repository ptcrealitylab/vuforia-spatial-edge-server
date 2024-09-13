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

test('spatial get scene graph', async () => {
    await waitForObjects();

    let res = await fetch(`${localServer}/spatial/sceneGraph`, {agent: fetchAgent});
    const sceneGraph = await res.json();

    const rootNode = sceneGraph.ROOT;
    expect(rootNode).toBeTruthy();
    expect(rootNode.localMatrix).toEqual([
        1, 0, 0, 0, 0, 1,
        0, 0, 0, 0, 1, 0,
        0, 0, 0, 1
    ]);
    expect(rootNode.worldMatrix).toEqual([
        1, 0, 0, 0, 0, 1,
        0, 0, 0, 0, 1, 0,
        0, 0, 0, 1
    ]);
    expect(rootNode.children).toEqual(['_WORLD_instantScanPJ1cgyrm_T6ijgnpsk1c']);
    expect(rootNode.id).toBe('ROOT');
    expect(rootNode.parent).toBeFalsy();
    expect(rootNode.transformMatrix).toEqual([
        1, 0, 0, 0, 0, 1,
        0, 0, 0, 0, 1, 0,
        0, 0, 0, 1
    ]);
    expect(rootNode.vehicleInfo).toEqual({name: 'ROOT', type: 'ROOT'});

    console.log(rootNode);
    const worldNode = sceneGraph._WORLD_instantScanPJ1cgyrm_T6ijgnpsk1c;
    expect(worldNode).toBeTruthy();
    expect(worldNode.vehicleInfo).toEqual({
        name: '_WORLD_instantScanPJ1cgyrm_T6ijgnpsk1c',
        type: 'object'
    });
});


test('spatial searchFrames in range', async () => {
    await waitForObjects();

    const searchParams = new URLSearchParams({
        maxDistance: 20000,
        clientX: 0,
        clientY: 0,
        clientZ: 0,
        src: 'spatialDraw',
        worldId: '_WORLD_instantScanPJ1cgyrm_T6ijgnpsk1c',
    });
    let res = await fetch(`${localServer}/spatial/searchFrames?${searchParams}`, {agent: fetchAgent});
    const frames = await res.json();
    expect(frames.validAddresses).toEqual([{
        objectId: '_WORLD_instantScanPJ1cgyrm_T6ijgnpsk1c',
        frameId: '_WORLD_instantScanPJ1cgyrm_T6ijgnpsk1cspatialDraw1mJx458y5jn9a'
    }]);
});

test('spatial searchFrames out of range', async () => {
    await waitForObjects();

    const searchParams = new URLSearchParams({
        maxDistance: 10,
        clientX: 0,
        clientY: 0,
        clientZ: 0,
        src: 'spatialDraw',
        worldId: '_WORLD_instantScanPJ1cgyrm_T6ijgnpsk1c',
    });
    let res = await fetch(`${localServer}/spatial/searchFrames?${searchParams}`, {agent: fetchAgent});
    const frames = await res.json();
    expect(frames.validAddresses).toEqual([]);
});
