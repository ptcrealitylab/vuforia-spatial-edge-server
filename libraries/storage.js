/**
 *   This Source Code Form is subject to the terms of the Mozilla Public
 *   License, v. 2.0. If a copy of the MPL was not distributed with this
 *   file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Storage implementation.
 *
 * Uses node-persist by default and mocks the same API on mobile
 * platforms.
 */

const os = require('os');

let storageImpl = {
    initSync: function() {},
    getItemSync: function() {},
    setItemSync: function() {},
};

if (os.platform() !== 'android' && os.platform() !== 'ios') {
    storageImpl = require('node-persist');
}

module.exports = storageImpl;
