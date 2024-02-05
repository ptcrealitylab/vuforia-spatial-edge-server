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
} = require('./helpers.js');
const fsProm = require('fs/promises');
const path = require('path');

const fetch = require('node-fetch');
const https = require('https');
let httpsAgent = new https.Agent({rejectUnauthorized: false});
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

    const resNew = await fetch('https://localhost:8080/', {
        headers: {
            'Content-type': 'application/x-www-form-urlencoded',
        },
        'body': `action=new&name=${worldName}&isWorld=true`,
        'method': 'POST',
        agent: httpsAgent
    });
    await resNew.text();

    const preUploadSnapshot = filterSnapshot(snapshotDirectory(objectsPath), (name) => name.includes(worldName));
    const preUploadObjJson = getValueWithKeySuffixed(preUploadSnapshot, '.identity/object.json');

    const form = new FormData();
    form.append('target.zip', targetZipBuf, {filename: 'target.zip', name: 'target.zip', contentType: 'application/zip'});
    const res = await fetch(`https://localhost:8080/content/${worldName}`, {
        method: 'POST',
        headers: {
            ...form.getHeaders(),
            type: 'targetUpload',
        },
        body: form,
        agent: httpsAgent
    });
    const content = await res.json();
    expect(content).toEqual({
        id: preUploadObjJson.objectId,
        name: worldName,
        initialized: false,
        jpgExists: false,
        xmlExists: true,
        datExists: true,
        glbExists: false,
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

    const resDelete = await fetch('https://localhost:8080/', {
        headers: {
            'Content-type': 'application/x-www-form-urlencoded',
        },
        'body': `action=delete&name=${worldName}&frame=`,
        'method': 'POST',
        agent: httpsAgent
    });
    await resDelete.text();

    const deletedSnapshot = filterSnapshot(snapshotDirectory(objectsPath), (name) => name.includes(worldName));
    expect(deletedSnapshot).toEqual({});
});
