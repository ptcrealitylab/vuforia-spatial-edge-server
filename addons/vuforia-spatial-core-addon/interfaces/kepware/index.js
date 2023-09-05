/**
 * Copyright (c) 2018 PTC
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

var server = require('../../../../libraries/hardwareInterfaces');
var settings = server.loadHardwareInterface(__dirname);

exports.enabled = settings('enabled');
exports.configurable = true; // can be turned on/off/adjusted from the web frontend

if (exports.enabled) {
    const fetch = require('node-fetch');

    let kepware1 = null;

    server.addEventListener('reset', function() {
        console.log('reset kepware');
        kepware1 = null;
        setup();
    });

    function setup() { // eslint-disable-line no-inner-declarations
        console.log('setup kepware');
        settings = server.loadHardwareInterface(__dirname);

        /**
         * These settings will be exposed to the webFrontend to potentially be modified
         */
        exports.settings = {
            ip: {
                value: settings('ip'),
                type: 'text',
                helpText: 'The IP address of the KEPServerEX you want to connect to.'
            },
            port: {
                value: settings('port'),
                type: 'number',
                default: 39320,
                helpText: 'The port of the IoT Gateway on the KEPServerEx.'
            },
            updateRate: {
                value: settings('updateRate'),
                type: 'number',
                default: 100,
                helpText: 'How many times per second to stream data into this server from the IoT Gateway.'
            },
            name: {
                value: settings('name'),
                type: 'text',
                helpText: 'The name of the Reality Object where nodes for each tag will be created.'
            },
            frameName: {
                value: settings('frameName'),
                type: 'text',
                helpText: 'The name of the frame on that object where nodes will be added.'
            },
            tagsInfo: settings('tagsInfo')
        };

        if (settings('enabled')) {
            kepware1 = new Kepware(settings('ip'), settings('name'),  settings('port'),  settings('updateRate'), settings('tagsInfo'));
            kepware1.setup();
        }
    }

    /**
     * @param {string} kepwareServerIP
     * @param {string} kepwareServerName
     * @param {number} kepwareServerRequestInterval
     * @param {Object} kepwareServerTagsInfo
     */
    function Kepware (kepwareServerIP, kepwareServerName, kepwareServerPort, kepwareServerRequestInterval, kepwareServerTagsInfo) { // eslint-disable-line no-inner-declarations
        this.KepwareData = function() {
            this.name = '';
            this.id = '';
            this.data = {
                'id': '',
                's': true,
                'r': '',
                'v': 0,
                't': 0,
                'min': 10000,
                'max': 0,
                'value': 0
            };
            this.dataOld = {
                'id': '',
                's': true,
                'r': '',
                'v': 0,
                't': 0,
                'min': 10000,
                'max': 0,
                'value': 0
            };
            this.enabled = true;
        };
        this.kepwareInterfaces = {};
        server.enableDeveloperUI(true);
        this.kepwareAddress = 'http://' + kepwareServerIP + ':' + kepwareServerPort + '/iotgateway/';

        console.log('tags info saved in settings.json: ', kepwareServerTagsInfo);

        /**
         * Browse the IoT gateway and create nodes for each found tag. Also starts an update interval.
         */
        this.setup = function () {

            this.thisID = {};
            fetch(this.kepwareAddress + 'browse').then(res => {
                return res.json();
            }).then(data => {
                for (var i = 0; i < data.browseResults.length; i++) {
                    this.thisID = data.browseResults[i].id;
                    this.kepwareInterfaces[this.thisID] = new this.KepwareData();
                    this.kepwareInterfaces[this.thisID].id = data.browseResults[i].id;
                    this.kepwareInterfaces[this.thisID].name = this.thisID.substr(this.thisID.lastIndexOf('.') + 1);

                    console.log(kepwareServerName + '_' + this.kepwareInterfaces[this.thisID].name);

                    // enabled by default, unless there is a specific entry in the settings.tagsInfo saying it is disabled
                    this.kepwareInterfaces[this.thisID].enabled = typeof kepwareServerTagsInfo[this.thisID] === 'undefined' || typeof kepwareServerTagsInfo[this.thisID].enabled === 'undefined' || kepwareServerTagsInfo[this.thisID].enabled;

                    // TODO: better frame naming configuration instead of just appending a '1' to the end of the object name
                    if (this.kepwareInterfaces[this.thisID].enabled) {
                        server.addNode(kepwareServerName, kepwareServerName + '1', this.kepwareInterfaces[this.thisID].name, 'node');
                        this.setReadList(kepwareServerName, kepwareServerName + '1', this.thisID, this.kepwareInterfaces[this.thisID].name, this.kepwareInterfaces);
                    } else {
                        // remove node instead of adding if settings.tagsInfo is disabled for this node
                        server.removeNode(kepwareServerName, kepwareServerName + '1', this.kepwareInterfaces[this.thisID].name);
                    }

                }

                server.pushUpdatesToDevices(kepwareServerName);

                this.interval = setInterval(this.start, kepwareServerRequestInterval);

            }).catch(err => {
                this.error(err);
            });
        }.bind(this);

        /**
         * When new data arrives at the node from a linked node, write the result to the kepware device using the IoT gateway.
         */
        this.setReadList = function(object, frame, node, name, kepwareInterfaces) {

            server.addReadListener(object, frame, name, function (data) {

                kepwareInterfaces[node].data.value = data.value;

                const options = {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify([{id: node, v: kepwareInterfaces[node].data.value}]),
                };

                fetch(this.kepwareAddress + 'write', options).then(() => {
                }).catch(err => {
                    this.error(err);
                });

            }.bind(this));

        }.bind(this);

        /**
         * The update interval that gets called many times per second (defined by settings('updateRate'))
         * Reads all tags at once from the kepware device.
         */
        this.start = function () {

            var argstring = '?';
            for (var key in this.kepwareInterfaces) {
                argstring += 'ids=' + key + '&';
            }

            fetch(this.kepwareAddress + 'read' + argstring).then(res => {
                return res.json();
            }).then(data => {
                // parsed response body as js object

                for (var i = 0; i < data.readResults.length; i++) {
                    var thisID = data.readResults[i].id;

                    if (this.kepwareInterfaces[thisID] && !this.kepwareInterfaces[thisID].enabled) {
                        continue; // don't try to update nodes that are disabled (they don't exist!)
                    }

                    this.kepwareInterfaces[thisID].data.s = data.readResults[i].s;
                    this.kepwareInterfaces[thisID].data.r = data.readResults[i].r;
                    this.kepwareInterfaces[thisID].data.v = data.readResults[i].v;
                    this.kepwareInterfaces[thisID].data.t = data.readResults[i].t;

                    if (typeof this.kepwareInterfaces[thisID].data.v === 'boolean' ) { // converts boolean to 0 or 1 because nodes can only handle numbers
                        this.kepwareInterfaces[thisID].data.v = this.kepwareInterfaces[thisID].data.v ? 1 : 0;
                    }
                    if (isNaN(this.kepwareInterfaces[thisID].data.v)) {
                        console.warn(thisID + ' kepware tag value isNaN ' + this.kepwareInterfaces[thisID].data.v);
                        this.kepwareInterfaces[thisID].data.v = 0; // uses 0 as default node value if NaN
                    }

                    let definedMin = (typeof kepwareServerTagsInfo[thisID] !== 'undefined') ? kepwareServerTagsInfo[thisID].min : undefined;
                    let definedMax = (typeof kepwareServerTagsInfo[thisID] !== 'undefined') ? kepwareServerTagsInfo[thisID].max : undefined;
                    let definedUnit = (typeof kepwareServerTagsInfo[thisID] !== 'undefined') ? kepwareServerTagsInfo[thisID].unit : undefined;

                    if (typeof definedMax === 'undefined') {
                        // continuously adjusts min and max based on values it's seen so far
                        this.kepwareInterfaces[thisID].data.max = Math.max(1, Math.max(this.kepwareInterfaces[thisID].data.v, this.kepwareInterfaces[thisID].data.max));
                    } else {
                        this.kepwareInterfaces[thisID].data.max = definedMax;
                    }

                    if (typeof definedMin === 'undefined') {
                        // continuously adjusts min and max based on values it's seen so far
                        this.kepwareInterfaces[thisID].data.min = Math.min(0, Math.min(this.kepwareInterfaces[thisID].data.v, this.kepwareInterfaces[thisID].data.min));
                    } else {
                        this.kepwareInterfaces[thisID].data.min = definedMin;
                    }

                    // clip readings to their [min - max] range, and then normalize them to the range of [0 - 1]
                    if (this.kepwareInterfaces[thisID].data.v < this.kepwareInterfaces[thisID].data.min) {
                        this.kepwareInterfaces[thisID].data.v = this.kepwareInterfaces[thisID].data.min;
                    }
                    if (this.kepwareInterfaces[thisID].data.v > this.kepwareInterfaces[thisID].data.max) {
                        this.kepwareInterfaces[thisID].data.v = this.kepwareInterfaces[thisID].data.max;
                    }
                    this.kepwareInterfaces[thisID].data.value = Math.round(server.map(this.kepwareInterfaces[thisID].data.v, this.kepwareInterfaces[thisID].data.min, this.kepwareInterfaces[thisID].data.max, 0, 1) * 1000) / 1000;

                    // if the new value is different than the previous value, write to the node -> propagate value to rest of the system
                    if (this.kepwareInterfaces[thisID].name && (this.kepwareInterfaces[thisID].dataOld.value !== this.kepwareInterfaces[thisID].data.value)) {

                        // write the normalized value to the server
                        server.write(kepwareServerName,
                            kepwareServerName + '1', // TODO: make frame name configurable instead of just kepwareBox -> kepwareBox1
                            this.kepwareInterfaces[thisID].name,
                            this.kepwareInterfaces[thisID].data.value,
                            'f', // floating point
                            definedUnit || this.kepwareInterfaces[thisID].name,
                            this.kepwareInterfaces[thisID].data.min,
                            this.kepwareInterfaces[thisID].data.max);

                    }

                    this.kepwareInterfaces[thisID].dataOld.value = this.kepwareInterfaces[thisID].data.value;
                }

            }).catch(err => {
                this.error(err);
            });

        }.bind(this);

        /**
         * If there's ever an error with connecting to the IoT gateway, print debug information.
         */
        this.error = function(_err) {
            //  console.error('kepware error', err); // todo err just outputs a gigantic json object. Needs some more specifics.
            console.error('cant find kepware server: \033[33m' + kepwareServerName + '\033[0m with the IP: \033[33m' + kepwareServerIP + '\033[0m');
        };
    }

    setup();
}