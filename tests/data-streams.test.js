/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/* global test, beforeAll, afterAll, expect */
const fetch = require('node-fetch');
const { DataStream } = require('../libraries/dataStreamInterfaces');
const DataStreamInterface = require('../libraries/DataStreamInterface');
const { objectsPath } = require('../config');
const { fileExists, mkdirIfNotExists } = require('../libraries/utilities');
const { sleep, localServer } = require('./helpers.js');
const path = require('path');
const fsProm = require('fs/promises');
const https = require('https');

let httpsAgent = new https.Agent({rejectUnauthorized: false});

let server;
beforeAll(async () => {
    server = require('../server.js');
    await sleep(1000);
});

afterAll(async () => {
    await server.exit();
    await sleep(1000);
});

test('add data source and node binding', async () => {
    expect.assertions(9);  // don't finish test until we count this many assertions

    // create a settings.json file for the testInterface
    const INTERFACE_NAME = 'testInterface';
    let interfaceIdentityDir = path.join(objectsPath, '.identity', INTERFACE_NAME);
    await mkdirIfNotExists(interfaceIdentityDir, {recursive: true, mode: '0766'});
    let settingsFile = path.join(interfaceIdentityDir, 'settings.json');
    if (!await fileExists(settingsFile)) {
        try {
            await fsProm.writeFile(settingsFile, '{}');
        } catch (err) {
            console.log('Error writing file', err);
        }
    }

    // create some mock data
    const stream1 = new DataStream('streamId_001', 'Test Stream 1', 'node', 0.7, 0, 1, INTERFACE_NAME);
    const stream2 = new DataStream('streamId_002', 'Test Stream 2', 'node', 10, 0, 10, INTERFACE_NAME);

    // this function mocks the process of "fetching" the array of data streams from a data source endpoint
    const fetchMockDataStreams = async (dataSource) => {
        if (!dataSource) return [];
        return [
            stream1,
            stream2
        ];
    };
    let dsInterface = new DataStreamInterface(INTERFACE_NAME, [], [], fetchMockDataStreams);

    // check that data source, streams, and node bindings begin as empty
    expect(dsInterface.dataSources).toEqual([]);
    expect(dsInterface.dataStreams).toEqual([]);
    expect(dsInterface.nodeBindings).toEqual([]);

    let addDataSourceBody = {
        interfaceName: INTERFACE_NAME,
        dataSource: {
            id: 'testDataSource123',
            displayName: 'Test Data Source 123',
            source: {
                type: 'REST/GET',
                url: 'http://www.example.com/',
                headers: {
                    Accept: 'application/json',
                    appKey: 'testAppKey'
                },
                pollingFrequency: 60 * 1000,
                dataFormat: 'testFormat'
            }
        }
    };

    await fetch(`${localServer}/logic/addDataSourceToInterface`, {
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(addDataSourceBody),
        method: 'POST',
        mode: 'cors',
        agent: httpsAgent
    });

    // after posting to /addDataSourceToInterface, the interface will have one dataSource and two dataStreams
    expect(dsInterface.dataSources).toEqual([dsInterface.castToDataSource(addDataSourceBody.dataSource)]);
    expect(dsInterface.dataStreams).toEqual([stream1, stream2]);

    // send a message to the correct hardware interface on the correct server to subscribe this node
    let bindNodeBody = {
        interfaceName: INTERFACE_NAME,
        nodeBinding: {
            objectId: '_WORLD_instantScanPJ1cgyrm_T6ijgnpsk1c',
            frameId: '_WORLD_instantScanPJ1cgyrm_T6ijgnpsk1cspatialDraw1mJx458y5jn9a',
            nodeName: 'value',
            nodeType: 'node',
            frameType: 'spatialDraw',
            streamId: stream1.id
        }
    };

    await fetch(`${localServer}/logic/bindNodeToDataStream`, {
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(bindNodeBody),
        method: 'POST',
        mode: 'cors',
        agent: httpsAgent
    });

    // after posting to /bindNodeToDataStream, the interface will have one node binding with a nodeId and streamId
    expect(dsInterface.nodeBindings[0].objectId).toBe('_WORLD_instantScanPJ1cgyrm_T6ijgnpsk1c');
    expect(dsInterface.nodeBindings[0].frameId).toBe('_WORLD_instantScanPJ1cgyrm_T6ijgnpsk1cspatialDraw1mJx458y5jn9a');
    expect(dsInterface.nodeBindings[0].nodeId).toMatch(/^_WORLD_instantScanPJ1cgyrm_T6ijgnpsk1cspatialDraw1mJx458y5jn9a/);
    expect(dsInterface.nodeBindings[0].streamId).toBe(stream1.id);
});
