/**
 * Parses service arguments
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

// scrappy way to parse command line arguments until we drop support for Node.js 10.x
let arguments = process.argv.slice(2); // this removes `node` and the filename from arguments list
let args = {}
if (arguments.indexOf("--services") !== -1) { // if it exists
    let after = arguments.slice(arguments.indexOf("--services")+1);
    let until = after.findIndex(value => value.indexOf('--') === 0); // find next
    args.services = after.slice(0, (until === -1 ? undefined : until));
} else {
    args.services = [];
}

// Note: With minimum support for Node 12.x, we can use yargs instead:
/*
let yargs = require('yargs');

let args = yargs
    .option('services', {
        alias: 's',
        describe: 'specify optional services this server supports, e.g. world',
        type: 'array',
        demand: false,
        default: []
    }).argv;

console.log(args.services);
*/

module.exports.providedServices = args.services;
module.exports.hasWorldService = args.services.includes('world');
