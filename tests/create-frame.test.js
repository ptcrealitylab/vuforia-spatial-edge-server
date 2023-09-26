/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/* global test, beforeAll, afterAll, expect */
const {sleep, snapshotDirectory, filterSnapshot, filterToObjects, getAllObjects} = require('./helpers.js');

const fetch = require('node-fetch');

let server;
beforeAll(() => {
    server = require('../server.js');
});

afterAll(async () => {
    await server.exit();
    await sleep(1000);
});

async function addFrame() {
    const res = await fetch('http://localhost:8080/object/_WORLD_instantScanPJ1cgyrm_T6ijgnpsk1c/addFrame/', {
        headers: {
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            objectId: '_WORLD_instantScanPJ1cgyrm_T6ijgnpsk1c',
            name: 'spatialDraw1mJx458y5jn9a',
            visualization: 'ar',
            ar: {
                x: 0,
                y: 0,
                scale: 1,
                matrix: [
                    0.966, 0.015, 0.257, 0,
                    -0.256, -0.0676, 0.964, 0,
                    -0.0319, 0.997, 0.0614, 0,
                    -50.227, -193.471, -239.032, 1,
                ],
            },
            screen: { x: 0, y: 0, scale: 0.5 },
            visible: false,
            visibleText: false,
            visibleEditing: false,
            developer: true,
            memory: {},
            links: {},
            nodes: {},
            location: 'global',
            src: 'spatialDraw',
            staticCopy: false,
            distanceScale: 1,
            groupID: null,
            pinned: true,
            uuid: '_WORLD_instantScanPJ1cgyrm_T6ijgnpsk1cspatialDraw1mJx458y5jn9a',
            begin: [
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1,
            ],
            loaded: false,
            screenZ: 1000,
            temp: [
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1,
            ],
            fullScreen: false,
            sendMatrix: false,
            sendMatrices: {},
            sendAcceleration: false,
            integerVersion: 300,
            lastEditor: 'cKzswlhy',
        }),
        method: 'POST',
    });
    return await res.text();
}

async function getObject() {
    const res = await fetch('http://localhost:8080/object/_WORLD_instantScanPJ1cgyrm_T6ijgnpsk1c');
    return await res.json();
}

async function getFrame() {
    const res = await fetch('http://localhost:8080/object/_WORLD_instantScanPJ1cgyrm_T6ijgnpsk1c/frame/_WORLD_instantScanPJ1cgyrm_T6ijgnpsk1cspatialDraw1mJx458y5jn9a');
    return await res.json();
}

async function moveFrame() {
    const res = await fetch('http://localhost:8080/object/_WORLD_instantScanPJ1cgyrm_T6ijgnpsk1c/frame/_WORLD_instantScanPJ1cgyrm_T6ijgnpsk1cspatialDraw1mJx458y5jn9a/node/null/size/', {
        headers: {
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            x: 0,
            y: 0,
            scale: 1,
            matrix: [
                0.966, 0.015, 0.257, 0,
                -0.256, -0.0675, 0.964, 0,
                -0.031, 0.997, 0.061, 0,
                -150, -293, -555, 1
            ],
            lastEditor: 'cKzswlhy'
        }),
        method: 'POST',
    });
    return await res.text();
}

const frameAddedRef = {
    objectId: '_WORLD_instantScanPJ1cgyrm_T6ijgnpsk1c',
    uuid: '_WORLD_instantScanPJ1cgyrm_T6ijgnpsk1cspatialDraw1mJx458y5jn9a',
    name: 'spatialDraw1mJx458y5jn9a',
    visualization: 'ar',
    ar: {
        x: 0,
        y: 0,
        scale: 1,
        matrix: [
            0.966, 0.015, 0.257, 0,
            -0.256, -0.0676, 0.964, 0,
            -0.0319, 0.997, 0.0614, 0,
            -50.227, -193.471, -239.032, 1
        ]
    },
    screen: { x: 0, y: 0, scale: 0.5 },
    visible: false,
    visibleText: false,
    visibleEditing: false,
    developer: true,
    links: {},
    nodes: {},
    location: 'global',
    src: 'spatialDraw',
    privateData: {},
    publicData: {},
    staticCopy: false,
    distanceScale: 1,
    groupID: null,
    pinned: true
};

const frameMovedRef = JSON.parse(JSON.stringify(frameAddedRef));
frameMovedRef.ar.matrix = [
    0.966, 0.015, 0.257, 0,
    -0.256, -0.0675, 0.964, 0,
    -0.031, 0.997, 0.061, 0,
    -150, -293, -555, 1
];

test('new object creation', async () => {
    let objectsPath = require('../config.js').objectsPath;

    await addFrame();

    const worldAdded = await getObject();
    expect(worldAdded.frames).toEqual({
        _WORLD_instantScanPJ1cgyrm_T6ijgnpsk1cspatialDraw1mJx458y5jn9a: frameAddedRef,
    });
    const frameAdded = await getFrame();
    expect(frameAdded).toEqual(frameAddedRef);

    const snapshot = filterSnapshot(snapshotDirectory(objectsPath), filterToObjects);
    let objFs = null;
    for (let key of Object.keys(snapshot)) {
        if (key.endsWith('.identity/object.json')) {
            objFs = snapshot[key];
            break;
        }
    }
    expect(objFs.frames).toEqual({
        _WORLD_instantScanPJ1cgyrm_T6ijgnpsk1cspatialDraw1mJx458y5jn9a: frameAddedRef,
    });

    await moveFrame();

    const worldMoved = await getObject();
    expect(worldMoved.frames).toEqual({
        _WORLD_instantScanPJ1cgyrm_T6ijgnpsk1cspatialDraw1mJx458y5jn9a: frameMovedRef,
    });
    const frameMoved = await getFrame();
    expect(frameMoved).toEqual(frameMovedRef);

    const snapshotMoved = filterSnapshot(snapshotDirectory(objectsPath), filterToObjects);
    objFs = null;
    for (let key of Object.keys(snapshotMoved)) {
        if (key.endsWith('.identity/object.json')) {
            objFs = snapshotMoved[key];
            break;
        }
    }
    expect(objFs.frames).toEqual({
        _WORLD_instantScanPJ1cgyrm_T6ijgnpsk1cspatialDraw1mJx458y5jn9a: frameMovedRef,
    });
});
