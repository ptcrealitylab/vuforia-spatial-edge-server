(function(exports) {
    /**
     * How to use:
     *
     * In a frame that you want to be an envelope (a container for other frames that can be opened and closed):
     *
     * 1. instantiate envelope = new Envelope(...) object with a reference to a RealityInterface and other parameters
     * 2. Use envelope APIs like envelope.open(), envelope.close(), envelope.onFrameAdded(...), ...
     * 3. To send a message to frames dropped into this envelope, use:
          envelope.sendMessageToAllContainedFrames({
            exampleMessageName: messageData
          });
          (You can also use sendMessageToFrameWithId or sendMessageToFrameAtIndex to send to a specific one)
     * 4. To listen for messages from contained frames, use:
          envelope.onMessageFromContainedFrame(function(message) {
            if (typeof message.exampleMessageName !== 'undefined') {
              // respond to message.exampleMessageName
            }
          });
     * 5. Ensure that all frames you want to be compatible with this envelope follow the instructions in envelopeContents.js
     */

    // makes sure this only gets loaded once per iframe
    if (typeof exports.Envelope !== 'undefined') {
        return;
    }

    /**
     * Defines an interface that declares this frame to be an "envelope" frame that can contain other frames to
     * form some form of a relationship between them all. Envelopes have an "open" state, where they take up the
     * fullscreen 2D UI, and a "closed" state, where they are minimized into a small 3D icon in space. Their contained
     * frames are only visible when the envelope is open.
     *
     * @constructor
     * @param {RealityInterface} realityInterface - reference to the RealityInterface API object
     * @param {Array.<string>} compatibleFrameTypes - array of types of frames that can be added to this envelope
     * @param {HTMLElement} rootElementWhenOpen - a containing div that will be rendered when open (fullscreen 2D)
     * @param {HTMLElement} rootElementWhenClosed - a containing div that will be rendered when closed (small 3D icon)
     * @param {boolean} isStackable - whether other envelopes can be opened while this one is open
     * @param {boolean} areFramesOrdered - whether to keep track of the order of all added frames
     * @param {boolean} isFull2D - whether to add background blur and remove the touch overlay div to stop proxying touches
     * @param {boolean} opensWhenAdded - whether the envelope initially opens (just the first time it's added)
     */
    function Envelope(realityInterface, compatibleFrameTypes, rootElementWhenOpen, rootElementWhenClosed,
        isStackable = false, areFramesOrdered = false, isFull2D = false, opensWhenAdded = false) {
        /**
         * A pointer to the envelope frame's RealityInterface object, so that this can interact with the other JavaScript APIs
         */
        this.realityInterface = realityInterface;
        /**
         * The names of which frames can be added to this envelope
         * @type {Array.<string>}
         */
        this.compatibleFrameTypes = compatibleFrameTypes;
        /**
         * If other envelopes can be open at the same time or not
         * @type {boolean}
         */
        this.isStackable = isStackable;
        /**
         * Should this keep track of the ordering of its contained frames, or are they an unordered set
         * @type {boolean}
         */
        this.areFramesOrdered = areFramesOrdered;
        /**
         * If true, turns off overlay div so tool acts like 2D browser (touches are handled naturally, not thru proxy)
         * @type {boolean}
         */
        this.isFull2D = isFull2D;
        /**
         * If true, automatically opens the first time it is added (but not on subsequent loads)
         * @type {boolean}
         */
        this.opensWhenAdded = opensWhenAdded;
        /**
         * True on the first session when the tool gets added
         * @type {boolean}
         */
        this.wasToolJustCreated = false;
        /**
         * A map of all the frameIds -> frame data for each frame added to the envelope
         * @type {Object.<string, Object>}
         */
        this.containedFrames = {};
        /**
         * A list of frameIds. The order they appear here determines their ordering / indices.
         * Only used if areFramesOrdered===true.
         * @type {Array}
         */
        this.frameIdOrdering = [];
        /**
         * Whether the envelope is opened in a fullscreen/maximized way, or minimized as a small 3D icon in space
         * @type {boolean}
         */
        this.isOpen = false;
        /**
         * Whether the envelope will receive touch events, and whether it should show interactable 2D UI
         * @type {boolean}
         */
        this.hasFocus = true;
        /**
         * Callbacks for various events from contained frames or the reality editor
         * @type {{onFrameAdded: Array, onFrameDeleted: Array, onMessageFromContainedFrame: Array, onOpen: Array, onClose: Array}}
         */
        this.callbacks = {
            /**
             * Triggered when the envelope is open and a compatible frame is created
             */
            onFrameAdded: [],
            /**
             * Triggered when a contained frame is deleted. Automatically updates ordering, etc, but you may need to update UI
             */
            onFrameDeleted: [],
            /**
             * Triggered when a contained frame is loaded.
             */
            onFrameLoaded: [],
            /**
             * Triggered when a contained frame sends a message to the envelope (e.g. "stepCompleted")
             */
            onMessageFromContainedFrame: [],
            /**
             * Triggered when the user taps on the envelope or otherwise opens it. May need to update UI for fullscreen
             */
            onOpen: [],
            /**
             * Triggered when the user closes/minimizes the envelope, or another non-stackable envelope kicks this one out of fullscreen
             */
            onClose: [],
            /**
             * Triggered when the envelope loads new persistent data (about which frames it contains). Functions as an onload method.
             */
            onPublicDataLoaded: []
        };
        /**
         * The actual width and height of the screen, used to set the size of the frame when the envelope is opened
         * These are default values, that get overridden in the constructor using realityInterface.getScreenDimensions
         * @type {{width: number, height: number}}
         */
        this.screenDimensions = {
            width: 736,
            height: 414
        };
        /**
         * default 400ms when closed, gets overwritten if you change realityInterface.setMoveDelay
         * @type {number}
         */
        this.moveDelayBeforeOpen = 400;

        // finish setting up the envelope by adding default callbacks and listeners for certain events

        // listen to post messages from the editor to trigger certain envelope events
        window.addEventListener('message', this.onWindowMessage.bind(this));

        // these keep the list of contained frames and the ordering up-to-date
        // add your own callback to adjust the UI based on frames being added or removed
        this.onFrameAdded(this._defaultOnFrameAdded.bind(this));
        this.onFrameDeleted(this._defaultOnFrameDeleted.bind(this));
        this.onFrameLoaded(this._defaultOnFrameLoaded.bind(this));

        // these update the UI automatically when the frame is opened or closed to switch between its two container divs
        this.onOpen(this._defaultOnOpen.bind(this));
        this.onClose(this._defaultOnClose.bind(this));

        // Uses the RealityInterface frame messaging system to listen for messages from contained frames.
        realityInterface.addFrameMessageListener(this._defaultFrameMessageListener.bind(this));

        // read from persistent storage to restore any relationships with contained frames when this loads
        realityInterface.addReadPublicDataListener('storage', 'envelopeContents', this._defaultPublicDataListener.bind(this));

        // registers the envelope with the editor
        this.realityInterface.sendEnvelopeMessage({
            isEnvelope: true,
            compatibleFrameTypes: this.compatibleFrameTypes
        });

        if (!this.isFull2D) {
            realityInterface.addReadListener('open', this._defaultOpenNodeListener.bind(this));
        }

        this.realityInterface.wasToolJustCreated(justCreated => {
            if (!justCreated) return;
            this.wasToolJustCreated = true;

            // automatically ensure that there is a node called 'storage' on the envelope frame to store the publicData
            this.realityInterface.initNodeWithOptions('storage', {
                x: 0,
                y: 0,
                attachToGroundPlane: false,
                type: 'storeData'
            });

            if (!this.isFull2D) {
                // set a flag so that we don't open the envelope minimized the first time it reads its own node value
                this.dontBlurOnNextOpen = true;
                // ensure that there is a node called 'open' on the envelope frame to open or close it
                this.realityInterface.initNodeWithOptions('open', {
                    x: 0,
                    y: 0,
                    attachToGroundPlane: false,
                    type: 'node',
                    defaultValue: this.opensWhenAdded ? 1 : 0
                });
            }
        });

        const adjustForScreenSize = (width, height) => {
            this.screenDimensions = {
                width: width,
                height: height
            };

            // changing the root element size should reposition everything else nicely relative to it
            // if necessary, reposition/resize any element with manual adjustments
            rootElementWhenOpen.style.width = width + 'px';
            rootElementWhenOpen.style.height = height + 'px';
        };

        // this adjusts the size of the body to be fullscreen based on accurate device screen size
        realityInterface.getScreenDimensions(adjustForScreenSize);

        realityInterface.onWindowResized(({width, height})=> {
            adjustForScreenSize(width, height);
        });

        // Manage the UI for open and closed states
        this.rootElementWhenOpen = rootElementWhenOpen;
        this.rootElementWhenClosed = rootElementWhenClosed;
        if (this.isOpen) {
            this.rootElementWhenClosed.style.display = 'none';
        } else {
            this.rootElementWhenOpen.style.display = 'none';
        }
    }

    // Envelope API - these methods can / should be called from the frame you build
    {
        /**
         * API to trigger the envelope to open if it's closed, which means it becomes sticky fullscreen and triggers onOpen events
         */
        Envelope.prototype.open = function(options = { dontWrite: false }) {
            if (this.isOpen) { return; }

            this.isOpen = true;
            this.realityInterface.setStickyFullScreenOn({animated: true, full2D: this.isFull2D}); // currently assumes envelopes want 'sticky' fullscreen, not regular
            if (!this.isStackable) {
                this.realityInterface.setExclusiveFullScreenOn(function() {
                    this.close(); // trigger all the side-effects related to the envelope closing
                }.bind(this));
            }

            this.focus();

            this.triggerCallbacks('onOpen', {});

            this.realityInterface.sendEnvelopeMessage({
                open: true
            });

            if (!options.dontWrite) {
                if (!this.isFull2D) {
                    this.realityInterface.write('open', 1);
                }
                this.realityInterface.writePublicData('storage', 'envelopeLastOpen', Date.now());
            }
        };

        /**
         * API to trigger the envelope to close if it's open, which means it turns off fullscreen and triggers onClosed events
         */
        Envelope.prototype.close = function(options = { dontWrite: false }) {
            if (!this.isOpen) { return; }

            this.isOpen = false;
            this.realityInterface.setFullScreenOff({animated: true});

            this.triggerCallbacks('onClose', {});

            this.realityInterface.sendEnvelopeMessage({
                close: true
            });

            if (!options.dontWrite) {
                if (!this.isFull2D) {
                    this.realityInterface.write('open', 0);
                }
            }
        };

        Envelope.prototype.focus = function() {
            this.hasFocus = true;
            this.triggerCallbacks('onFocus', {});

            this.realityInterface.sendEnvelopeMessage({
                focus: true
            });

            // focusing on a tool also "refreshes it" as the most recent tool
            this.realityInterface.writePublicData('storage', 'envelopeLastOpen', Date.now());
        }

        Envelope.prototype.blur = function() {
            this.hasFocus = false;
            this.triggerCallbacks('onBlur', {});

            this.realityInterface.sendEnvelopeMessage({
                blur: true
            });
        }

        /**
         * API to subscribe to a compatible frame being added to the envelope.
         * The envelope already automatically adds it to the containedFrames and updates the ordering if needed.
         * @param {onFrameCallback} callback
         */
        Envelope.prototype.onFrameAdded = function(callback) {
            this.addCallback('onFrameAdded', callback);
        };

        /**
         * API to subscribe to a contained frame being deleted from the envelope.
         * The envelope already automatically removes it from the containedFrames and updates the ordering if needed.
         * @param {onFrameCallback} callback
         */
        Envelope.prototype.onFrameDeleted = function(callback) {
            this.addCallback('onFrameDeleted', callback);
        };

        /**
         * API to subscribe to a compatible frame being loaded (perhaps from another object coming into view).
         * The envelope already automatically adds it to the containedFrames and updates the ordering if needed.
         * @param {onFrameCallback} callback
         */
        Envelope.prototype.onFrameLoaded = function(callback) {
            this.addCallback('onFrameLoaded', callback);
        };

        /**
         * @callback onFrameCallback
         * @param {{objectId: string, frameId: string, frameType: string}} frame
         */

        /**
         * API to subscribe to arbitrary messages being sent to the envelope by its contained frames.
         * @param {onMessageCallback} callback
         */
        Envelope.prototype.onMessageFromContainedFrame = function(callback) {
            this.addCallback('onMessageFromContainedFrame', callback);
        };

        /**
         * @callback onMessageCallback
         * @param {Object} message
         */

        /**
         * API to respond to the envelope opening.
         * Its UI already automatically requests fullscreen and changes from rootElementWhenClosed to rootElementWhenOpen.
         * @param {function} callback
         */
        Envelope.prototype.onOpen = function(callback) {
            this.addCallback('onOpen', callback);
        };

        /**
         * API to respond to the envelope closing.
         * Its UI already automatically removes fullscreen and changes from rootElementWhenOpen to rootElementWhenClosed.
         * @param {function} callback
         */
        Envelope.prototype.onClose = function(callback) {
            this.addCallback('onClose', callback);
        };

        /**
         * API to respond to this envelope losing focus. Tools should subscribe to this and hide their 2D UI in response.
         * @param callback
         */
        Envelope.prototype.onFocus = function(callback) {
            this.addCallback('onFocus', callback);
        }

        /**
         * API to respond to this envelope regaining focus. Tools should redisplay their 2D UI in response.
         * @param callback
         */
        Envelope.prototype.onBlur = function(callback) {
            this.addCallback('onBlur', callback);
        }

        /**
         * API to be notified when the envelope has fully loaded its publicData.
         * At this point, its containedFrames and frameIdOrdering will be correct.
         * Can be used as an onload method for the envelope.
         * @param {function} callback
         */
        Envelope.prototype.onPublicDataLoaded = function(callback) {
            this.addCallback('onPublicDataLoaded', callback);
        };

        /**
         * API to send a JSON message to a particular contained frame, if there is one matching that ID.
         * @param {string} id - the uuid of the frame
         * @param {Object} message
         */
        Envelope.prototype.sendMessageToFrameWithId = function(id, message) {
            this.realityInterface.sendMessageToFrame(id, {
                envelopeMessage: message
            });
        };

        /**
         * API to send a JSON message to all contained frames.
         * @param {Object} message
         */
        Envelope.prototype.sendMessageToAllContainedFrames = function(message) {
            this.forEachFrame(function(frameId, _frameData) {
                this.sendMessageToFrameWithId(frameId, message);
            }.bind(this));
        };

        /**
         * API to send a JSON message to the contained frame in a certain index of the ordering.
         * @param {number} index
         * @param {Object} message
         * @param {string|undefined} category - optionally filter down the set of frames and get the nth frame of this category
         */
        Envelope.prototype.sendMessageToFrameAtIndex = function(index, message, category) {
            if (!this.areFramesOrdered) {
                console.warn('You cannot send a message by index if the frames are unordered');
                return;
            }
            this.sendMessageToFrameWithId(this.getFrameIdAtIndex(index, category), message);
        };

        /**
         * API to move the frame with the specified ID to the new index.
         * Note - this hasn't been fully tested in practice yet.
         * @param {string} frameId
         * @param {number} newIndex
         */
        Envelope.prototype.reorderFrames = function(frameId, newIndex) { // TODO: support categories so it works for mixed envelopes
            if (!this.areFramesOrdered) {
                console.warn('You cannot reorder frames if the frames are unordered');
                return;
            }
            let currentIndex = this.frameIdOrdering.indexOf(frameId);
            if (currentIndex > -1) {
                // moves element from currentIndex to newIndex - see https://stackoverflow.com/a/2440723/1190267
                this.frameIdOrdering.splice(newIndex, 0, this.frameIdOrdering.splice(currentIndex, 1)[0]);
                this.orderingUpdated();
                this.savePersistentData();
            }
        };
    }

    // Internal helper functions, not actually private but don't need to be called from the frame you build
    // In conjunction with the constructor, these set up all the behind-the-scenes functionality to make envelopes work
    {
        /**
         * Triggers all callbacks functions when the iframe receives an 'envelopeMessage' POST message from the parent window.
         * @param {string} msg - stringified JSON message
         */
        Envelope.prototype.onWindowMessage = function(msg) {
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

            if (typeof msgContent.envelopeMessage.sendMessageToContents !== 'undefined') {
                this.sendMessageToAllContainedFrames(msgContent.envelopeMessage.sendMessageToContents);
            }
            if (typeof msgContent.envelopeMessage.open !== 'undefined') {
                this.open();
            }
            if (typeof msgContent.envelopeMessage.close !== 'undefined') {
                this.close();
            }
            if (typeof msgContent.envelopeMessage.focus !== 'undefined') {
                this.focus();
            }
            if (typeof msgContent.envelopeMessage.blur !== 'undefined') {
                this.blur();
            }
        };

        /**
         * Maintains set of contained frames when a compatible frame is added
         * @param {{objectId: string, frameId: string, frameType: string}} frameAddedMessage
         */
        Envelope.prototype._defaultOnFrameAdded = function(frameAddedMessage) {
            // update containedFrames and ordering
            var isAlreadyContained = !!this.containedFrames[frameAddedMessage.frameId];
            if (isAlreadyContained) { return; }
            this.containedFrames[frameAddedMessage.frameId] = new FrameData(frameAddedMessage.objectId, frameAddedMessage.frameId, frameAddedMessage.frameType);
            if (this.areFramesOrdered) {
                this.frameIdOrdering.push(frameAddedMessage.frameId);
            }
            // send messages to trigger events and save persistently
            this.orderingUpdated();
            this.containedFramesUpdated();
            this.savePersistentData();
        };

        /**
         * Maintains set of contained frames when a contained frame is deleted
         * @param {{objectId: string, frameId: string, frameType: string}} frameDeletedMessage
         */
        Envelope.prototype._defaultOnFrameDeleted = function(frameDeletedMessage) {
            // update containedFrames and ordering
            delete this.containedFrames[frameDeletedMessage.frameId];
            if (this.areFramesOrdered) {
                let index = this.frameIdOrdering.indexOf(frameDeletedMessage.frameId);
                if (index > -1) {
                    this.frameIdOrdering.splice(index, 1);
                }
            }
            // send messages to trigger events and save persistently
            this.orderingUpdated();
            this.containedFramesUpdated();
            this.savePersistentData();
        };

        /**
         * Maintains set of contained frames when a compatible frame is added
         * @param {{objectId: string, frameId: string, frameType: string}} frameAddedMessage
         */
        Envelope.prototype._defaultOnFrameLoaded = function(_frameAddedMessage) {
            // send messages to trigger events and save persistently
            this.orderingUpdated();
            this.containedFramesUpdated();
            // this.savePersistentData();
        };

        /**
         * Updates the UI and relevant frame properties when the envelope should become fullscreen.
         */
        Envelope.prototype._defaultOnOpen = function() {
            this.rootElementWhenClosed.style.display = 'none';
            this.rootElementWhenOpen.style.display = '';
            // change the iframe and touch overlay size (including visual feedback corners) when the frame changes size
            this.realityInterface.changeFrameSize(parseInt(this.rootElementWhenOpen.clientWidth), parseInt(this.rootElementWhenOpen.clientHeight));
            this.moveDelayBeforeOpen = this.realityInterface.getMoveDelay() || 400;
            this.realityInterface.setMoveDelay(-1); // can't move it while fullscreen
        };

        /**
         * Resets the UI and relevant frame properties when the envelope is closed.
         */
        Envelope.prototype._defaultOnClose = function() {
            this.rootElementWhenClosed.style.display = '';
            this.rootElementWhenOpen.style.display = 'none';
            // change the iframe and touch overlay size (including visual feedback corners) when the frame changes size
            this.realityInterface.changeFrameSize(parseInt(this.rootElementWhenClosed.clientWidth), parseInt(this.rootElementWhenClosed.clientHeight));
            this.realityInterface.setMoveDelay(this.moveDelayBeforeOpen); // restore to previous value
        };

        /**
         * Uses the RealityInterface frame messaging system to listen for messages from contained frames.
         * @param {{msgContent: Object, sourceFrame: string, destinationFrame: string}} message
         */
        Envelope.prototype._defaultFrameMessageListener = function(message) {
            if (typeof message.msgContent.containedFrameMessage !== 'undefined') {

                if (typeof message.msgContent.containedFrameMessage.setCategories !== 'undefined') {
                    this.updateContainedFrameCategories(message.sourceFrame, message.msgContent.containedFrameMessage.setCategories);
                }

                // insert the source frame into the message so the callback has that context
                if (typeof message.msgContent.containedFrameMessage.sourceFrame === 'undefined') {
                    message.msgContent.containedFrameMessage.sourceFrame = message.sourceFrame;
                }

                if (typeof message.msgContent.containedFrameMessage.screenPosition !== 'undefined') {
                    this._receiveScreenPosition(message.sourceFrame, message.msgContent.containedFrameMessage.screenPosition, message.msgContent.containedFrameMessage.worldCoordinates);
                }

                // console.warn('contents received envelope message', msgContent, sourceFrame, destinationFrame);
                this.triggerCallbacks('onMessageFromContainedFrame', message.msgContent.containedFrameMessage);
            }
        };

        /**
         * Updates the frame to be tagged with the array of categories. Also includes the frame's type as a default.
         * @param {string} frameId
         * @param {Array.<string>} categories
         */
        Envelope.prototype.updateContainedFrameCategories = function(frameId, categories) {
            this.containedFrames[frameId].categories = categories;
            // ensure that it always uses type as a category
            if (this.containedFrames[frameId].categories.indexOf(this.containedFrames[frameId].type) === -1) {
                this.containedFrames[frameId].categories.push(this.containedFrames[frameId].type);
            }
            this.orderingUpdated();
            this.savePersistentData();
        };

        /**
         * Read from persistent storage to restore any relationships with contained frames when this loads.
         * @param {{containedFrames: Object|undefined, frameIdOrdering: Array.<string>|undefined}} savedContents
         */
        Envelope.prototype._defaultPublicDataListener = function(savedContents) {
            console.log('saved envelope contents', savedContents);
            if (typeof savedContents.containedFrames !== 'undefined') {
                this.containedFrames = savedContents.containedFrames;
                this.containedFramesUpdated();
            }
            if (typeof savedContents.frameIdOrdering !== 'undefined') {
                this.frameIdOrdering = savedContents.frameIdOrdering;
                this.orderingUpdated();
            }

            this.triggerCallbacks('onPublicDataLoaded', {});
        };

        /**
         * Listens for new values sent to the 'open' node on the envelope, and uses that to open or close it.
         * @param {Data} event
         */
        Envelope.prototype._defaultOpenNodeListener = function(event) {
            if (typeof this.lastOpenValue === 'undefined') {
                this.lastOpenValue = event.value;
            }
            if (this.lastOpenValue === 0 && event.value === 0) {
                return; // prevents it from closing itself when the node first loads or on duplicate data
            }
            if (event.value < 0.5) {
                this.close({ dontWrite: true });
            } else {
                let alreadyOpen = this.isOpen;
                this.open({ dontWrite: true });

                // when the tool opens in response to another client writing to the 'open' node, open minimized (not focused)
                // we have to ignore when wasToolJustCreated, as the tool initially learns its open state from the node
                if (!this.dontBlurOnNextOpen) {
                    // Already open due to local user input, don't override our
                    // local state to blurred
                    if (!alreadyOpen) {
                        this.blur();
                    }
                    this.dontBlurOnNextOpen = false;
                }
            }

            this.lastOpenValue = event.value; // prevents duplicate reads (get triggered on sendRealityEditorSubscribe)
        };

        /**
         * Sends a message to the editor with all contained frames so editor has an accurate map of envelopes->containedFrames.
         * Gets triggered automatically when frames are added or removed.
         */
        Envelope.prototype.containedFramesUpdated = function() {
            this.realityInterface.sendEnvelopeMessage({
                containedFrameIds: Object.keys(this.containedFrames)
            });
        };

        /**
         * Sends a message (if areFramesOrdered) to all contained frames updating them about which index they
         * are in the ordering, and how many contained frames there are in total.
         * Gets triggered automatically when frames are added or removed.
         */
        Envelope.prototype.orderingUpdated = function() {
            if (!this.areFramesOrdered) { return; }

            let categoryOrderMap = this.getCategoryOrderMap();

            // send a message to each frame with their order
            this.frameIdOrdering.forEach(function(frameId, index) {
                this.sendMessageToFrameWithId(frameId, {
                    onOrderUpdated: {
                        index: index,
                        total: this.frameIdOrdering.length,
                        categories: categoryOrderMap[frameId]
                    }
                });
            }.bind(this));

        };

        /**
         * Returns an object containing each frameId, mapped to the set of categories it is tagged with,
         * and its respective index in each of their orderings.
         * @return {Object.<string, Object.<string, number>>}
         */
        Envelope.prototype.getCategoryOrderMap = function() {
            if (!this.areFramesOrdered) { return; }
            let frameCategoryMap = {};
            this.frameIdOrdering.forEach(function(frameId) {
                frameCategoryMap[frameId] = {};
                this.containedFrames[frameId].categories.forEach(function(thisCategoryName) {
                    frameCategoryMap[frameId][thisCategoryName] = this.getFrameIndex(frameId, thisCategoryName);
                }.bind(this));
            }.bind(this));
            return frameCategoryMap;
        };

        /**
         * Returns the index of a frame compared to all others tagged with the same category
         * @param {string} frameId
         * @param {string} category
         * @return {{index: number, total: number}}
         */
        Envelope.prototype.getFrameIndex = function(frameId, category) {
            // filter down an ordered list of all frames with that category
            // return this frameId's index in that list
            let framesOfThisCategory = this.frameIdOrdering.filter(function(frameId) {
                return this.containedFrames[frameId].categories.indexOf(category) > -1;
            }.bind(this));
            return {
                index: framesOfThisCategory.indexOf(frameId),
                total: framesOfThisCategory.length
            };
        };

        /**
         * Writes the containedFrames and frameIdOrdering to publicData so that the relationships persist across sessions.
         * Gets triggered automatically when frames are added or removed.
         */
        Envelope.prototype.savePersistentData = function() {
            let envelopeContents = {
                containedFrames: this.containedFrames
            };
            if (this.areFramesOrdered) {
                envelopeContents.frameIdOrdering = this.frameIdOrdering;
            }
            console.log('savePersistentData', envelopeContents);
            this.realityInterface.writePublicData('storage', 'envelopeContents',  envelopeContents);
        };

        /**
         * Method to manually trigger callbacks via the envelope object, rather than reacting to post message events.
         * Used e.g. to trigger onOpen and onClose when the API's open() and close() functions are used.
         * Otherwise, callbacks usually get triggered via the window.addEventListener('message', ...) callback handler.
         * @param {string} callbackName
         * @param {Object} msgContent
         */
        Envelope.prototype.triggerCallbacks = function(callbackName, msgContent) {
            if (this.callbacks[callbackName]) { // only trigger for callbacks that have been set
                this.callbacks[callbackName].forEach(function(addedCallback) {
                    try {
                        addedCallback(msgContent);
                    } catch (e) {
                        console.warn('error in envelope callback: ' + callbackName, e);
                    }
                });
            }
        };

        /**
         * Helper function to correctly add a callback function
         * @param {string} callbackName - should match one of the keys in this.callbacks
         * @param {function} callbackFunction
         */
        Envelope.prototype.addCallback = function(callbackName, callbackFunction) {
            if (typeof this.callbacks[callbackName] === 'undefined') {
                console.warn('Creating a new envelope callback that wasn\'t defined in the constructor');
                this.callbacks[callbackName] = [];
            }

            this.callbacks[callbackName].push(callbackFunction);
        };

        /**
         * Gets the frame id that corresponds to a certain index in the ordering (optionally, of a given category of frame).
         * @param {number} index
         * @param {string|undefined} category
         */
        Envelope.prototype.getFrameIdAtIndex = function(index, category) {
            if (!this.areFramesOrdered) {
                console.warn('You cannot send a message by index if the frames are unordered');
                return;
            }
            if (typeof category !== 'undefined') {
                return this.frameIdOrdering.filter(function(frameId) {
                    return this.containedFrames[frameId].categories.indexOf(category) > -1;
                }.bind(this))[index];
            }
            return this.frameIdOrdering[index];
        };

        /**
         * Helper function to iterate over all contained frames.
         * @param {frameIterator} callback
         */
        Envelope.prototype.forEachFrame = function(callback) {
            for (let frameId in this.containedFrames) {
                callback(frameId, this.containedFrames[frameId]);
            }
        };

        let subscriptions = {};
        Envelope.prototype.subscribeToPosition = function(frameId, callback, subscribe3d) {
            if (typeof subscriptions[frameId] !== 'undefined') {
                // subscriptions[frameId] = {};
                console.warn('currently only supports one subscription per frameId...');
                console.warn('cancelling previous subscription and subscribing again.');
            }
            subscriptions[frameId] = callback;
            // console.log('subscribed to position for ' + frameId);
            // console.log(subscriptions);

            let value = subscribe3d ? '3d' : true;

            this.sendMessageToFrameWithId(frameId, {
                subscribeToPosition: value
            });
        };

        /**
         * Updates the frame to be tagged with the array of categories. Also includes the frame's type as a default.
         * @param {string} frameId
         * @param {{x: number, y: number}} screenPosition
         * @param {{x: number, y: number, z: number}} worldCoordinates
         */
        Envelope.prototype._receiveScreenPosition = function(frameId, screenPosition, worldCoordinates) {
            let thisCallback = subscriptions[frameId];
            if (typeof thisCallback !== 'function') {
                return;
            }
            // console.log('envelope learned contained frame position');
            let displayWidth = screenPosition.lowerRight.x - screenPosition.upperLeft.x;
            let displayHeight = screenPosition.lowerRight.y - screenPosition.upperLeft.y;

            let zPosition = undefined;
            let depth = undefined;

            if (typeof screenPosition.center.z !== 'undefined') {
                zPosition = screenPosition.center.z;
                depth = screenPosition.lowerRight.z - screenPosition.upperLeft.z;
            }
            thisCallback(screenPosition.center.x, screenPosition.center.y, displayWidth, displayHeight, zPosition, depth, worldCoordinates);
        };

        /**
         * @callback frameIterator
         * @param {string} frameId
         * @param {FrameData} frameData
         */
    }

    /**
     * This contains all the necessary information to keep track of a frame that the envelope contains.
     * More params can be added as necessary for more features.
     *
     * @constructor
     * @param {string} objectId - the object uuid
     * @param {string} id - the frame uuid, used as an address to send messages to it
     * @param {string} type - the frame type, used to ensure it is a compatible with this envelope or to distinguish between different contained frames' capabilities
     */
    function FrameData(objectId, id, type) {
        this.objectId = objectId;
        this.id = id;
        this.type = type;
        this.categories = [type];
    }

    exports.Envelope = Envelope;

})(window);
