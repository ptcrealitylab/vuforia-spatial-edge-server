/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/* global test, beforeAll, afterAll, expect */
const fetch = require('node-fetch');

process.env.FORCE_MOBILE = true;
const {
    sleep,
    fetchAgent,
    waitForObjects,
    getTestObjects,
    localServer,
} = require('./helpers.js');

let server;
beforeAll(() => {
    server = require('../server.js');
});

afterAll(async () => {
    process.env.FORCE_MOBILE = false;
    await server.exit();
    await sleep(1000);
});

async function testObjectCreation() {
    await waitForObjects(0);

    const allObjectsPre = await getTestObjects();
    expect(allObjectsPre).toEqual([]);
    const resNew = await fetch(`${localServer}/`, {
        headers: {
            'Content-type': 'application/x-www-form-urlencoded',
        },
        'body': 'action=new&name=fdsa&isWorld=null',
        'method': 'POST',
        'mode': 'cors',
        agent: fetchAgent
    });
    await resNew.text();
    const allObjectsCreated = await getTestObjects();

    expect(allObjectsCreated.length).toBe(1);
    const fdsaApi = allObjectsCreated[0];
    expect(fdsaApi.id).toMatch(/^fdsa/);
    expect(fdsaApi.ip).toBeTruthy();
    expect(fdsaApi.port).toBe(server.serverPort);
    expect(fdsaApi.vn).toBe(322);
    expect(fdsaApi.pr).toBe('R2');
    expect(fdsaApi.tcs).toBe(0);

    return fdsaApi;
}

test('mobile local world', async () => {
    await waitForObjects(1);

    const allWorldObjects = await getTestObjects('_WORLD_local');
    expect(allWorldObjects.length).toBe(1);
    const worldLocal = allWorldObjects[0];
    expect(worldLocal.id).toBe('_WORLD_local');
    expect(worldLocal.ip).toBe('localhost');
    expect(worldLocal.port).toBe(server.serverPort);
    expect(worldLocal.vn).toBe(322);
    expect(worldLocal.pr).toBe('R2');
});

test('mobile object creation', async () => {
    await testObjectCreation();

    await fetch(`${localServer}/`, {
        headers: {
            'Content-type': 'application/x-www-form-urlencoded',
        },
        body: 'action=delete&name=fdsa&frame=',
        method: 'POST',
        agent: fetchAgent
    });

    const allObjectsDeleted = await getTestObjects();
    expect(allObjectsDeleted).toEqual([]);
});
