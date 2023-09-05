/**
 * Copyright (c) 2018 PTC
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/
 */

const os = require('os');

var server = require('../../../../libraries/hardwareInterfaces');
var settings = server.loadHardwareInterface(__dirname);

exports.enabled = os.platform() === 'ios' || settings('enabled');
exports.configurable = true; // can be turned on/off/adjusted from the web frontend

const OVERRIDE_SERVER = 'toolboxedge.net';
const OVERRIDE_NETWORK = 'MDvW4qbAdW1FatkJslAv';
const OVERRIDE_SECRET = 'mn8Nh3yt3IHTBPUz7BWuHfe2Ns7gNMHTQbv0O0gH';

if (exports.enabled) {
    const {print, uuidTime, createSecret} = require('./utilities.js');
    const Cloud = require('./Cloud.js');
    const Edge = require('./Edge.js');

    exports.settings = {
        serverUrl: OVERRIDE_SERVER || settings('serverUrl') || 'toolboxedge.net',
        networkUUID: OVERRIDE_NETWORK || settings('networkUUID'),
        networkSecret: OVERRIDE_SECRET || settings('networkSecret'),
        networkSecretCommand: settings('networkSecretCommand') || '',
        isConnected: settings('isConnected'),
        connect: settings('connect') || 'true',
        enabled: true,
    };
    console.log('initial settings', exports.settings);

    function setSetting(name, value) {
        if (exports.settings[name] === value) {
            return;
        }

        exports.settings[name] = value;

        server.setHardwareInterfaceSettings('edgeAgent', exports.settings, null, function(successful, error) {
            if (error) {
                console.warn('unable to set hw interface settings', exports.settings, error);
            }
        });
    }

    const agentCloud = new Cloud(server, setSetting);
    const agentEdge = new Edge(server);

    agentCloud.agentEdge = agentEdge;
    agentEdge.agentCloud = agentCloud;

    server.addEventListener('reset', function() {
        print('reset agent');
        settings = server.loadHardwareInterface(__dirname);

        exports.settings = {
            serverUrl: OVERRIDE_SERVER || settings('serverUrl') || 'toolboxedge.net',
            networkUUID: OVERRIDE_NETWORK || settings('networkUUID'),
            networkSecret: OVERRIDE_SECRET || settings('networkSecret'),
            networkSecretCommand: settings('networkSecretCommand') || '',
            isConnected: settings('isConnected'),
            connect: settings('connect') || 'true',
        };
        console.log('reset start settings', exports.settings);

        print('networkUUID', exports.settings.networkUUID);
        let settingsChanged = false;

        if (!exports.settings.networkUUID) {
            exports.settings.networkUUID = uuidTime(20);
            settingsChanged = true;
            //todo write new network ID into the toolsocket
        }
        agentCloud.networkUUID = exports.settings.networkUUID;

        if (exports.settings.networkSecretCommand === 'generateNewSecret' || !exports.settings.networkSecret) {
            exports.settings.networkSecret = createSecret(40);
            exports.settings.networkSecretCommand = '';
            settingsChanged = true;
        }

        if (exports.settings.networkSecretCommand === 'removeSecret') {
            exports.settings.networkSecret = '';
            exports.settings.networkSecretCommand = '';
            settingsChanged = true;
        }
        agentCloud.networkSecret = exports.settings.networkSecret;

        if (settingsChanged) {
            server.setHardwareInterfaceSettings('edgeAgent', exports.settings, null, function(successful, error) {
                if (error) {
                    console.warn('unable to set hw interface settings', exports.settings, error);
                }
            });
        }

        print('---------connect---------');
        print(exports.settings.serverUrl);
        print(exports.settings.connect);
        if (exports.settings.serverUrl !== '' && exports.settings.connect) {
            agentCloud.serverUrl = exports.settings.serverUrl;
            print('I should connect');
            agentCloud.openSocket();
        } else {
            print('Do not Connect');
            agentCloud.closeConnection();
        }
        console.log('reset end settings', exports.settings);
    });

    agentEdge.service();
}
