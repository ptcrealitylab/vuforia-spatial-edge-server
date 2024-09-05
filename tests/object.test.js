/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/* global test, beforeAll, afterAll, expect, beforeEach, afterEach, describe */
const fetch = require('node-fetch');

const {
    filterSnapshot,
    filterToTestObject,
    getObject,
    getTestObjects,
    getValueWithKeySuffixed,
    sleep,
    snapshotDirectory,
    waitForObjects,
    localServer,
    fetchAgent,
} = require('./helpers.js');

let server;
beforeAll(() => {
    server = require('../server.js');
});

afterAll(async () => {
    await server.exit();
    await sleep(1000);
});

async function testObjectCreation() {
    await waitForObjects(0);
    const objectsPath = require('../config.js').objectsPath;

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

    return fdsaApi;
}

test('object creation, old object deletion', async () => {
    await testObjectCreation();

    const objectsPath = require('../config.js').objectsPath;

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
    const snapshotDeleted = filterSnapshot(snapshotDirectory(objectsPath), filterToTestObject);
    expect(snapshotDeleted).toEqual({});
});

test('object creation, new object deletion', async () => {
    const testObject = await testObjectCreation();

    const objectsPath = require('../config.js').objectsPath;

    await fetch(`${localServer}/object/${testObject.id}`, {
        method: 'DELETE',
        agent: fetchAgent
    });

    const allObjectsDeleted = await getTestObjects();
    expect(allObjectsDeleted).toEqual([]);
    const snapshotDeleted = filterSnapshot(snapshotDirectory(objectsPath), filterToTestObject);
    expect(snapshotDeleted).toEqual({});
});

test('deletion of missing object', async () => {
    let res = await fetch(`${localServer}/object/notarealobjectid`, {
        method: 'DELETE',
        agent: fetchAgent
    });
    expect(res.status).toEqual(404);
});


describe('object apis', () => {
    let testObject;
    beforeEach(async () => {
        testObject = await testObjectCreation();
    });

    afterEach(async () => {
        await fetch(`${localServer}/object/${testObject.id}`, {
            method: 'DELETE',
            agent: fetchAgent
        });
    });

    test('scene graph activation', async () => {
        expect(testObject.deactivated).toBeFalsy();

        await fetch(`${localServer}/object/${testObject.id}/deactivate`, {
            method: 'get',
            agent: fetchAgent
        });

        {
            // Not present in list due to deactivation
            const allObjectsCreated = await getTestObjects();
            expect(allObjectsCreated.length).toBe(0);

            const testObjectUpdated = await getObject(testObject.id);
            expect(testObjectUpdated.deactivated).toBeTruthy();
        }

        await fetch(`${localServer}/object/${testObject.id}/activate`, {
            method: 'get',
            agent: fetchAgent
        });

        {
            const allObjectsCreated = await getTestObjects();
            expect(allObjectsCreated.length).toBe(1);

            const testObjectUpdated = allObjectsCreated[0];
            expect(testObjectUpdated.deactivated).toBeFalsy();
        }
    });

    test('set render mode', async () => {
        await fetch(`${localServer}/object/${testObject.id}/renderMode`, {
            method: 'post',
            headers: {
                'Content-type': 'application/json',
            },
            body: JSON.stringify({
                renderMode: 'ai',
            }),
            agent: fetchAgent
        });

        const testObjectUpdated = await getObject(testObject.id);
        expect(testObjectUpdated.renderMode).toBe('ai');
    });

    test('set render mode of missing object', async () => {
        let res = await fetch(`${localServer}/object/notarealobjectid/renderMode`, {
            method: 'post',
            headers: {
                'Content-type': 'application/json',
            },
            body: JSON.stringify({
                renderMode: 'ai',
            }),
            agent: fetchAgent
        });

        expect(res.status).toBe(404);
    });

    test('set render mode missing render mode', async () => {
        let res = await fetch(`${localServer}/object/${testObject.id}/renderMode`, {
            method: 'post',
            headers: {
                'Content-type': 'application/json',
            },
            body: JSON.stringify({
            }),
            agent: fetchAgent
        });

        expect(res.ok).toBeFalsy();
    });

    test('set visualization screen', async () => {
        await fetch(`${localServer}/object/${testObject.id}/screen`, {
            agent: fetchAgent
        });

        const testObjectUpdated = await getObject(testObject.id);
        expect(testObjectUpdated.visualization).toBe('screen');
    });

    test('set visualization ar of missing object', async () => {
        let res = await fetch(`${localServer}/object/notarealobjectid/ar`, {
            agent: fetchAgent
        });

        expect(res.status).toBe(404);
    });

});
