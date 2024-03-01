/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/* global test, beforeAll, afterAll, expect */
const fetch = require('node-fetch');
const https = require('https');

let httpsAgent = new https.Agent({rejectUnauthorized: false});

const {
    filterSnapshot,
    filterToTestObject,
    getTestObjects,
    getValueWithKeySuffixed,
    sleep,
    snapshotDirectory,
    waitForObjects,
} = require('./helpers.js');

let server;
beforeAll(() => {
    server = require('../server.js');
});

afterAll(async () => {
    await server.exit();
    await sleep(1000);
});

test('new object creation', async () => {
    await waitForObjects(0);
    let objectsPath = require('../config.js').objectsPath;

    const allObjectsPre = await getTestObjects();
    expect(allObjectsPre).toEqual([]);
    const resNew = await fetch('https://localhost:8080/', {
        headers: {
            'Content-type': 'application/x-www-form-urlencoded',
        },
        'body': 'action=new&name=fdsa&isWorld=null',
        'method': 'POST',
        'mode': 'cors',
        agent: httpsAgent
    });
    await resNew.text();
    const allObjectsCreated = await getTestObjects();

    expect(allObjectsCreated.length).toBe(1);
    const fdsaApi = allObjectsCreated[0];
    expect(fdsaApi.id).toMatch(/^fdsa/);
    expect(fdsaApi.ip).toBeTruthy();
    expect(fdsaApi.port).toBe(8080);
    expect(fdsaApi.vn).toBe(322);
    expect(fdsaApi.pr).toBe('R2');
    expect(fdsaApi.tcs).toBe(0);

    const snapshot = filterSnapshot(snapshotDirectory(objectsPath), filterToTestObject);
    let fdsaFs = getValueWithKeySuffixed(snapshot, 'fdsa/.identity/object.json');
    expect(fdsaFs.objectId).toMatch(/^fdsa/);
    expect(fdsaFs.name).toBe('fdsa');
    expect(fdsaFs.matrix).toEqual([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1,
    ]);
    expect(fdsaFs.worldId).toBe(null);
    expect(fdsaFs.isAnchor).toBe(false);
    expect(fdsaFs.ip).toBeTruthy();
    expect(fdsaFs.version).toBe('3.2.2');
    expect(fdsaFs.deactivated).toBe(false);
    expect(fdsaFs.protocol).toBe('R2');
    expect(fdsaFs.tcs).toBe(0);
    expect(fdsaFs.visible).toBe(false);
    expect(fdsaFs.visibleText).toBe(false);
    expect(fdsaFs.visibleEditing).toBe(false);
    expect(fdsaFs.memory).toEqual({});
    expect(fdsaFs.memoryCameraMatrix).toEqual({});
    expect(fdsaFs.memoryProjectionMatrix).toEqual({});
    expect(fdsaFs.frames).toEqual({});
    expect(fdsaFs.framesHistory).toEqual({});
    expect(fdsaFs.visualization).toBe('ar');
    expect(fdsaFs.zone).toBe('');
    expect(fdsaFs.targetSize).toEqual({width: 0.3, height: 0.3});
    expect(fdsaFs.isWorldObject).toBe(false);
    expect(fdsaFs.type).toBe('object');
    expect(fdsaFs.timestamp).toBe(null);
    expect(fdsaFs.port).toBe(8080);

    await fetch('https://localhost:8080/', {
        headers: {
            'Content-type': 'application/x-www-form-urlencoded',
        },
        body: 'action=delete&name=fdsa&frame=',
        method: 'POST',
        agent: httpsAgent
    });

    const allObjectsDeleted = await getTestObjects();
    expect(allObjectsDeleted).toEqual([]);
    const snapshotDeleted = filterSnapshot(snapshotDirectory(objectsPath), filterToTestObject);
    expect(snapshotDeleted).toEqual({});
});

