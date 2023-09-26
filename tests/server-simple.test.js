/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/* global test, beforeAll, afterAll */

const {sleep} = require('./helpers.js');

let server;
beforeAll(() => {
    server = require('../server.js');
});

afterAll(async () => {
    await server.exit();
    await sleep(1000);
});

test('server is intact after 5 seconds', async () => {
    // Start the server doing its own thing
    await sleep(5000);
}, 10000);
