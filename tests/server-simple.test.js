/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/* global test */

function sleep(ms) {
    return new Promise((res) => {
        setTimeout(res, ms);
    });
}

test('server is intact after 10 seconds', async () => {
    // Start the server doing its own thing
    let server = require('../server.js');
    await sleep(5000);
    await server.exit();
    await sleep(3000);
}, 13000);
