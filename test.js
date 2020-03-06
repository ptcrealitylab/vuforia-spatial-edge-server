/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

// Start the server doing its own thing
require('./server.js');

setTimeout(() => {
    console.log('The server is intact after 10 seconds');
    process.exit(0);
}, 10000);
