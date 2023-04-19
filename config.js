/**
 * Server configuration
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const spatialToolboxPath = path.join(os.homedir(), 'Documents', 'spatialToolbox');
const oldRealityObjectsPath = path.join(os.homedir(), 'Documents', 'realityobjects');

// All objects are stored in this folder:
// Look for objects in the user Documents directory instead of __dirname+"/objects"
let objectsPath = spatialToolboxPath;

objectsPath = path.join(__dirname, '..', 'spatialToolbox');

if (process.env.NODE_ENV === 'test' || os.platform() === 'android' || !fs.existsSync(path.join(os.homedir(), 'Documents'))) {
    objectsPath = path.join(__dirname, 'spatialToolbox');
}

// Default back to old realityObjects dir if it exists
if (!fs.existsSync(objectsPath) &&
    objectsPath === spatialToolboxPath &&
    fs.existsSync(oldRealityObjectsPath)) {
    console.warn('Please rename your realityobjects directory to spatialToolbox');
    objectsPath = oldRealityObjectsPath;
}

// create objects folder at objectsPath if necessary
if (!fs.existsSync(objectsPath)) {
    console.log('created objects directory at ' + objectsPath);
    fs.mkdirSync(objectsPath);
}

module.exports.objectsPath = objectsPath;
