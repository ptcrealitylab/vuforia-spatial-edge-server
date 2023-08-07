(function(exports) {
    /**
     * How to use:
     *
     * In a frame that you want to be able to be added to an envelope:
     *
     * 1. instantiate a new envelopeContents(...) object
          let envelopeContents = new EnvelopeContents(realityInterface, document.body);
     * 2. Use envelopeContents APIs like envelope.onOrderUpdated(), ...
     * 3. To send a message to the envelope this belongs to, use:
          envelopeContents.sendMessageToEnvelope({
            exampleMessageName: messageData
          });
     * 4. To listen for messages from the envelope it belongs to, use:
          envelopeContents.onMessageFromEnvelope(function(message) {
            if (typeof message.exampleMessageName !== 'undefined') {
              // respond to message.exampleMessageName
            }
          });
     * 5. Note that it is the responsibility of the envelope to declare which frames it can contain, not the
     *    responsibility of the contained frame to declare which envelopes it can be added to.
     */

    /* eslint no-inner-declarations: "off" */
    // makes sure this only gets loaded once per iframe
    if (typeof exports.EnvelopeContents !== 'undefined') {
        return;
    }

    /**
     * Defines an interface that declares this frame to be able to be added to envelope frames.
     * By doing so, it will automatically be added to compatible envelopes if they are open when it is created, and
     * if so, it will hide and show when that envelope is opened and closed. A number of events also become available.
     *
     * @constructor
     * @param {RealityInterface} realityInterface
     * @param {HTMLElement} rootElement
     */
    function EnvelopeContents(realityInterface, rootElement) {
        this.realityInterface = realityInterface;
        this.rootElement = rootElement; // the HTML element to show or hide when the envelope opens and closes
        this.envelopeId = null;

        /**
         * Callbacks for various events from contained frames or the reality editor
         * @type {{onOrderUpdated: Array, onMessageFromEnvelope: Array}}
         */
        this.callbacks = {
            /**
             * Triggered when a the frame's order changes for any reason
             */
            onOrderUpdated: [],
            /**
             * Triggered when the envelope frame sends a message directly to this one
             */
            onMessageFromEnvelope: [],
            /**
             * Triggered when the envelope is opened
             */
            onOpen: [],
            /**
             * Triggered when the envelope is minimized
             */
            onClose: []
        };

        /**
         * Triggers all callbacks functions when the iframe receives an 'envelopeMessage' POST message from the parent window.
         */
        window.addEventListener('message', function (msg) {
            if (typeof msg === 'string') {
                return;
            }
            if (typeof msg.data !== 'string') {
                return;
            }
            let msgContent = JSON.parse(msg.data);
            if (typeof msgContent.envelopeMessage === 'undefined') {
                return;
            }
            // if any keys that envelopeMessage contains match the name of any callbacks, those callbacks will be triggered
            for (let callbackKey in msgContent.envelopeMessage) {
                if (typeof this.callbacks[callbackKey] === 'undefined') { continue; }
                this.callbacks[callbackKey].forEach(function(addedCallback) {
                    addedCallback(msgContent.envelopeMessage[callbackKey]);
                });
            }
        }.bind(this));

        /**
         * Listen for envelope messages using the Reality Interface frame messaging system
         */
        realityInterface.addFrameMessageListener(function(message) {
            if (typeof message.msgContent.envelopeMessage !== 'undefined') {

                if (!this.envelopeId) {
                    this.envelopeId = message.sourceFrame; // received first message from an envelope. you now belong to that one.
                }

                if (this.envelopeId !== message.sourceFrame) {
                    return; // pre-filter out messages from different envelopes
                }

                let envelopeMessage = message.msgContent.envelopeMessage;

                this.triggerCallbacks('onMessageFromEnvelope', envelopeMessage);
            }
        }.bind(this));

        let screenPositionListenerHandle = null;
        let mostRecentScreenPosition = null;
        let mostRecentModelView = null;
        /**
         * Automatically show and hide the rootElement of the frame when its envelope opens or closes
         */
        this.onMessageFromEnvelope(function(envelopeMessage) {

            // trigger onOrderUpdated if needed
            if (typeof envelopeMessage.onOrderUpdated !== 'undefined') {
                this.triggerCallbacks('onOrderUpdated', envelopeMessage.onOrderUpdated);
            }

            // show/hide in response to envelope opening/closing
            if (typeof envelopeMessage.showContainedFrame !== 'undefined') {
                if (envelopeMessage.showContainedFrame) {
                    this.show();
                } else {
                    this.hide();
                }
            }

            // respond to position subscriptions
            if (typeof envelopeMessage.subscribeToPosition !== 'undefined') {
                if (envelopeMessage.subscribeToPosition === '3d') {
                    if (!screenPositionListenerHandle) {

                        let screenWidth = 736; // assume iPhone 8 but update to accurate when API returns
                        let screenHeight = 414;
                        realityInterface.getScreenDimensions(function(width, height) {
                            screenWidth = width;
                            screenHeight = height;
                        });

                        screenPositionListenerHandle = realityInterface.addMatrixListener(function(modelView, projection) {

                            let modelViewProjection = [];
                            multiplyMatrix(modelView, projection, modelViewProjection);

                            let semiNormalizedX = modelViewProjection[12] / modelViewProjection[15];
                            let semiNormalizedY = modelViewProjection[13] / modelViewProjection[15];
                            let z = modelViewProjection[14]; // don't divide by [15] or it's always = 1

                            let x = mapRange(semiNormalizedX, -1, 1, 0, screenWidth);
                            let y = mapRange(semiNormalizedY, 1, -1, 0, screenHeight);

                            // var zDistance = Math.abs(modelView[14]);

                            if (mostRecentScreenPosition &&
                                mostRecentScreenPosition.center.x === x &&
                                mostRecentScreenPosition.center.y === y &&
                                mostRecentScreenPosition.center.z === z) {
                                return; // don't send duplicate values
                            }

                            var scaleFactor = Math.abs(modelView[0]);

                            // 300 happens to be the width in pixels of this tool
                            let width = 300 * scaleFactor * (300 / modelViewProjection[15]); // TODO: infer or calculate from scale etc
                            let height = width; //300 * scaleFactor / modelViewProjection[15];
                            let depth = width; //300 * scaleFactor / modelViewProjection[15];

                            mostRecentScreenPosition = {
                                center: {
                                    x: x,
                                    y: y,
                                    z: z
                                },
                                upperLeft: {
                                    x: x - width / 2,
                                    y: y - height / 2,
                                    z: z - depth / 2
                                },
                                lowerRight: {
                                    x: x + width / 2,
                                    y: y + height / 2,
                                    z: z + depth / 2
                                }
                            };

                            mostRecentModelView = {
                                position: {
                                    x: modelView[12],
                                    y: modelView[13],
                                    z: modelView[14]
                                },
                                scale: {
                                    x: modelView[0],
                                    y: modelView[5],
                                    z: modelView[10]
                                }
                            };

                            this.sendMessageToEnvelope({
                                screenPosition: mostRecentScreenPosition,
                                worldCoordinates: mostRecentModelView
                            });
                        }.bind(this));
                    }
                } else {
                    if (!screenPositionListenerHandle) {
                        screenPositionListenerHandle = realityInterface.addScreenPositionListener(function (screenPosition) {
                            if (mostRecentScreenPosition &&
                                mostRecentScreenPosition.center.x === screenPosition.center.x &&
                                mostRecentScreenPosition.center.y === screenPosition.center.y) {
                                return; // don't send duplicate values
                            }
                            mostRecentScreenPosition = screenPosition;

                            this.sendMessageToEnvelope({
                                screenPosition: mostRecentScreenPosition
                            });
                        }.bind(this));
                    }
                }
            }

        }.bind(this));
    }

    // Envelope API - these methods can / should be called from the frame you build
    {
        /**
         * API to subscribe to arbitrary messages being sent from the envelope this belongs to.
         * @param {onMessageCallback} callback
         */
        EnvelopeContents.prototype.onMessageFromEnvelope = function(callback) {
            this.addCallback('onMessageFromEnvelope', callback);
        };

        /**
         * @callback onMessageCallback
         * @param {Object} message
         */

        /**
         * API to subscribe to updates in what order this frame is in the sequence of contained frames.
         * Only gets triggered if the envelope this was added to has areFramesOrdered=true.
         * @param {onOrderUpdatedCallback} callback
         */
        EnvelopeContents.prototype.onOrderUpdated = function(callback) {
            this.addCallback('onOrderUpdated', callback);
        };

        /**
         * @callback onOrderUpdatedCallback
         * @param {{index: number, total: number}} orderData
         */

        /**
         * API to respond to the envelope opening.
         * @param {function} callback
         */
        EnvelopeContents.prototype.onOpen = function(callback) {
            this.addCallback('onOpen', callback);
        };

        /**
         * API to respond to the envelope closing.
         * @param {function} callback
         */
        EnvelopeContents.prototype.onClose = function(callback) {
            this.addCallback('onClose', callback);
        };

        /**
         * API to send an arbitrary message to the envelope that this frame belongs to.
         * @param {Object} message
         */
        EnvelopeContents.prototype.sendMessageToEnvelope = function(message) {
            this.realityInterface.sendMessageToFrame(this.envelopeId, {
                containedFrameMessage: message
            });
        };

        /**
         * API to tag this frame with a list of one or more categories, in which its order will be tracked.
         * @param categories
         */
        EnvelopeContents.prototype.setCategories = function(categories) {
            this.sendMessageToEnvelope({
                setCategories: categories
            });
        };
    }

    // Internal helper functions, not actually private but don't need to be called from the frame you build
    // In conjunction with the constructor, these set up all the behind-the-scenes functionality to make envelopes work
    {
        /**
         * Show the frame and allow touch interaction again.
         */
        EnvelopeContents.prototype.show = function() {
            this.rootElement.style.display = '';
            this.realityInterface.ignoreAllTouches(false);
            this.triggerCallbacks('onOpen', {});
        };

        /**
         * Hide the frame and disable all touch interaction so touches pass through it with no chance of interception.
         */
        EnvelopeContents.prototype.hide = function() {
            this.rootElement.style.display = 'none';
            this.realityInterface.ignoreAllTouches(true);
            this.triggerCallbacks('onClose', {});
        };

        /**
         * Method to manually trigger callbacks via the envelopeContents object, rather than reacting to post message events.
         * Used e.g. to trigger onMessageFromEnvelope
         * Otherwise, callbacks usually get triggered via the window.addEventListener('message', ...) callback handler.
         * @param {string} callbackName
         * @param {Object} msgContent
         */
        EnvelopeContents.prototype.triggerCallbacks = function(callbackName, msgContent) {
            if (this.callbacks[callbackName]) { // only trigger for callbacks that have been set
                this.callbacks[callbackName].forEach(function(addedCallback) {
                    addedCallback(msgContent);
                });
            }
        };

        /**
         * Helper function to correctly add a callback function.
         * @param {string} callbackName - should match one of the keys in this.callbacks
         * @param {function} callbackFunction
         */
        EnvelopeContents.prototype.addCallback = function(callbackName, callbackFunction) {
            if (typeof this.callbacks[callbackName] === 'undefined') {
                console.warn('Creating a new envelope callback that wasn\'t defined in the constructor');
                this.callbacks[callbackName] = [];
            }

            this.callbacks[callbackName].push(callbackFunction);
        };
    }

    /**
     * @desc This function multiplies one m16 matrix with a second m16 matrix
     * @param {Array.<number>} m2 - origin matrix to be multiplied with
     * @param {Array.<number>} m1 - second matrix that multiplies.
     * @param {Array.<number>} r - matrix result of the multiplication
     */
    const multiplyMatrix = function(m2, m1, r) {
        // Cm1che only the current line of the second mm1trix
        r[0] = m2[0] * m1[0] + m2[1] * m1[4] + m2[2] * m1[8] + m2[3] * m1[12];
        r[1] = m2[0] * m1[1] + m2[1] * m1[5] + m2[2] * m1[9] + m2[3] * m1[13];
        r[2] = m2[0] * m1[2] + m2[1] * m1[6] + m2[2] * m1[10] + m2[3] * m1[14];
        r[3] = m2[0] * m1[3] + m2[1] * m1[7] + m2[2] * m1[11] + m2[3] * m1[15];

        r[4] = m2[4] * m1[0] + m2[5] * m1[4] + m2[6] * m1[8] + m2[7] * m1[12];
        r[5] = m2[4] * m1[1] + m2[5] * m1[5] + m2[6] * m1[9] + m2[7] * m1[13];
        r[6] = m2[4] * m1[2] + m2[5] * m1[6] + m2[6] * m1[10] + m2[7] * m1[14];
        r[7] = m2[4] * m1[3] + m2[5] * m1[7] + m2[6] * m1[11] + m2[7] * m1[15];

        r[8] = m2[8] * m1[0] + m2[9] * m1[4] + m2[10] * m1[8] + m2[11] * m1[12];
        r[9] = m2[8] * m1[1] + m2[9] * m1[5] + m2[10] * m1[9] + m2[11] * m1[13];
        r[10] = m2[8] * m1[2] + m2[9] * m1[6] + m2[10] * m1[10] + m2[11] * m1[14];
        r[11] = m2[8] * m1[3] + m2[9] * m1[7] + m2[10] * m1[11] + m2[11] * m1[15];

        r[12] = m2[12] * m1[0] + m2[13] * m1[4] + m2[14] * m1[8] + m2[15] * m1[12];
        r[13] = m2[12] * m1[1] + m2[13] * m1[5] + m2[14] * m1[9] + m2[15] * m1[13];
        r[14] = m2[12] * m1[2] + m2[13] * m1[6] + m2[14] * m1[10] + m2[15] * m1[14];
        r[15] = m2[12] * m1[3] + m2[13] * m1[7] + m2[14] * m1[11] + m2[15] * m1[15];
    };

    /**
     * Rescales x from the original range (in_min, in_max) to the new range (out_min, out_max)
     * @example map(5, 0, 10, 100, 200) would return 150, because 5 is halfway between 0 and 10, so it finds the number halfway between 100 and 200
     *
     * @param {number} x
     * @param {number} in_min
     * @param {number} in_max
     * @param {number} out_min
     * @param {number} out_max
     * @return {number}
     */
    const mapRange = function(x, in_min, in_max, out_min, out_max) {
        return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
    };

    exports.EnvelopeContents = EnvelopeContents;

})(window);


