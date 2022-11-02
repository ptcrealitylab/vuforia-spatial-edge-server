/**
 * Parses service arguments
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

let yargs = require('yargs');

let args = yargs
    .option('services', {
        alias: 's',
        describe: 'specify optional services this server supports, e.g. world',
        type: 'array',
        demand: false,
        default: []
    }).argv;

module.exports.providedServices = args.services;
module.exports.hasWorldService = args.services.includes('world');
