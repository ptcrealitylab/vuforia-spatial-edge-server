/*
* Copyright © 2018 PTC
*
* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

const server = require('@libraries/hardwareInterfaces');
const utilities = require('@libraries/utilities');

const settings = server.loadHardwareInterface(__dirname);

exports.enabled = settings('enabled');
exports.configurable = true; // can be turned on/off/adjusted from the web frontend

/**
 * These settings will be exposed to the webFrontend to potentially be modified
 */
exports.settings = {
    offlineMode: {
        value: settings('offlineMode'),
        type: 'boolean',
        disabled: false,
        default: false,
        helpText: 'The absolute path to the vuforia-spatial-toolbox-userinterface.'
    }
};

// offlineDatabase.makeDatabase();

// if (!exports.enabled) return;

const isRunningInOfflineMode = true; // exports.settings.offlineMode.value;
console.log(`The digitalThread hardware interface is running in ${isRunningInOfflineMode ? 'OFFLINE' : 'ONLINE'} mode`);

process.env.PORT = 8083;

const bodyParser = require('body-parser');
const cors = require('cors');
const express = require('express');
const path = require('path');

const { localDatabasePath } = require('./offlineDatabase.js');

const onlineControllers = require('./controllers');
const offlineControllers = require('./offlineControllers');

let controller;
if (isRunningInOfflineMode) {
    controller = offlineControllers;
} else {
    controller = onlineControllers;
}

const app = express();

if (process.env.NODE_ENV !== 'production') {
    // load .env from absolute path otherwise it tries looking in vuforia-spatial-edge-server top level directory
    require('dotenv').config({ path: path.join(__dirname, '.env') });
}

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.resolve(__dirname, 'public')));
app.use('/localDigitalThread', express.static(localDatabasePath));

app.post('/search', controller.searchController);
app.post('/autocomplete', controller.autocompleteController);

app.get('/', function(req, res) {
    res.sendFile('index.html', { root: __dirname });
});

app.use(function(req, res, next) {
    const err = new Error('Not Found')
    err.status = 404
    next(err)
});

function jsonErrorHandler(err, req, res) {
    console.error(err.stack);
    res.status(err.statusCode || 500).send(err.message || 'Internal Server Error');
}

app.use(jsonErrorHandler);

const port = process.env.PORT || 8080;

app.listen(port, function() {
    console.log(`listening on port ${port}`)
});
