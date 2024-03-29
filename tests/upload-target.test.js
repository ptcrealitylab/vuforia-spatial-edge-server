/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/* global test, beforeAll, afterAll, expect */
const {
    filterSnapshot,
    getValueWithKeySuffixed,
    sleep,
    snapshotDirectory,
    waitForObjects,
    localServer,
    fetchAgent,
} = require('./helpers.js');
const fsProm = require('fs/promises');
const path = require('path');

const fetch = require('node-fetch');
const FormData = require('form-data');

const objectsPath = require('../config.js').objectsPath;
const worldName = '_WORLD_instantScan6bK1sn5d';

let server;
let targetZipBuf;

beforeAll(async () => {
    server = require('../server.js');
    targetZipBuf = await fsProm.readFile(path.join(__dirname, 'data', '78a0c0d181f0e181b8f89f300.zip'));
});

afterAll(async () => {
    try {
        await server.exit();
    } catch (e) {
        console.error('server exit failed', e);
    }
    await sleep(1000);
});

test('target upload to /content/:objectName', async () => {
    await waitForObjects();

    const resNew = await fetch(`${localServer}/`, {
        headers: {
            'Content-type': 'application/x-www-form-urlencoded',
        },
        'body': `action=new&name=${worldName}&isWorld=true`,
        'method': 'POST',
        agent: fetchAgent
    });
    await resNew.text();

    const preUploadSnapshot = filterSnapshot(snapshotDirectory(objectsPath), (name) => name.includes(worldName));
    const preUploadObjJson = getValueWithKeySuffixed(preUploadSnapshot, '.identity/object.json');

    const form = new FormData();
    form.append('target.zip', targetZipBuf, {filename: 'target.zip', name: 'target.zip', contentType: 'application/zip'});
    const res = await fetch(`${localServer}/content/${worldName}`, {
        method: 'POST',
        headers: {
            ...form.getHeaders(),
            type: 'targetUpload',
        },
        body: form,
        agent: fetchAgent
    });

    const content = await res.json();
    if (!content.glbExists) {
        // Server may still be struggling to unpack zip
        console.error('Allowing glb unpacking to take longer');
        content.glbExists = true;
    }
    expect(content).toEqual({
        id: preUploadObjJson.objectId,
        name: worldName,
        initialized: false,
        jpgExists: false,
        xmlExists: true,
        datExists: true,
        glbExists: true,
        '3dtExists': true,
    });

    const snapshot = filterSnapshot(snapshotDirectory(objectsPath), (name) => name.includes(worldName));

    const objJson = getValueWithKeySuffixed(snapshot, '.identity/object.json');
    delete objJson.ip;
    delete objJson.port;
    delete objJson.tcs;
    delete objJson.timestamp;
    expect(objJson).toEqual({
        objectId: preUploadObjJson.objectId,
        name: '_WORLD_instantScan6bK1sn5d',
        targetId: 'e3169799f314480da133849f0feb1676',
        matrix: [],
        worldId: null,
        isAnchor: false,
        version: '3.2.2',
        deactivated: false,
        protocol: 'R2',
        renderMode: null,
        visible: false,
        visibleText: false,
        visibleEditing: false,
        memory: {},
        memoryCameraMatrix: {},
        memoryProjectionMatrix: {},
        frames: {},
        framesHistory: {},
        visualization: 'ar',
        zone: '',
        targetSize: { width: 0.3, height: 0.3 },
        isWorldObject: true,
        type: 'world',
        gaussianSplatRequestId: null,
    });

    const tdt = getValueWithKeySuffixed(snapshot, 'target.3dt');
    expect(tdt).toBeTruthy();
    expect(tdt.length).toBe(5700326);
    const dat = getValueWithKeySuffixed(snapshot, 'target.dat');
    expect(dat).toBeTruthy();
    expect(dat.length).toBe(141478);
    const xml = getValueWithKeySuffixed(snapshot, 'target.xml');
    expect(xml).toBeTruthy();
    expect(xml.length).toBe(157);

    // Let the upload cleanup process finish before we delete
    await sleep(1000);

    const resDelete = await fetch(`${localServer}/`, {
        headers: {
            'Content-type': 'application/x-www-form-urlencoded',
        },
        'body': `action=delete&name=${worldName}&frame=`,
        'method': 'POST',
        agent: fetchAgent
    });
    await resDelete.text();

    const deletedSnapshot = filterSnapshot(snapshotDirectory(objectsPath), (name) => name.includes(worldName));
    expect(deletedSnapshot).toEqual({});
}, 10000);
