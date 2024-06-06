(function(exports) {
    class LanguageInterface {
        /**
         * @param {string} applicationName - the type of the application, e.g. "spatialDraw"
         * @param {string} objectId - the uuid of the object
         * @param {string} applicationId - the uuid of the frame
         */
        constructor(applicationName, objectId, applicationId) {
            this.applicationName = applicationName;
            this.applicationId = applicationId;
            this.objectId = objectId;

            this.callbacks = {
                onSpatialReferenceStartHover: [],
                onSpatialReferenceStopHover: []
            };

            // track a set of uuid => (name, coordinates)
            this.spatialReferences = {};

            // track any particular properties, metadata, etc., that can be used as a procedurally-generated summary
            this.summarizedState = {};
            // define a function that will turn the summarizedState into a natural language description of the tool that
            // will be included as context for AI interactions
            this.stateToStringReducer = null;

            // TODO: put some limits on the amount of state, number of prompts, and length of each prompt,
            //  to ensure that the number of input tokens isn't too high
            // track any raw data or higher-level data that you want to be processed by an AI prompt to get a generative
            // summary of the tool contents
            this.stateForAiPrompts = {};
            // add one or more prompts that will process the stateForAiPrompts and produce some intelligent description
            // of the contents; the result will be included as context for AI interactions with the chatbot
            this.aiStateProcessingPrompts = [];
        }

        updateStateToBeProcessedByAiPrompts(key, state) {
            if (typeof state === 'undefined' || state === null) {
                delete this.stateForAiPrompts[key];
            } else {
                this.stateForAiPrompts[key] = state;
            }
        }

        sendAiProcessingStateToParent() {
            window.parent.postMessage({
                type: 'UPDATE_AI_PROCESSING_STATE',
                applicationName: this.applicationName,
                objectId: this.objectId,
                applicationId: this.applicationId,
                state: this.stateForAiPrompts,
            }, '*');
        }

        // these execute sequentially, e.g. state * prompt1 => summary1, summary1 * prompt2 => summary2
        addAiStateProcessingPrompt(prompt) {
            if (typeof prompt === 'string') {
                this.aiStateProcessingPrompts.push(prompt);
            }
        }

        sendAiProcessingPromptsToParent() {
            window.parent.postMessage({
                type: 'UPDATE_AI_PROCESSING_PROMPTS',
                applicationName: this.applicationName,
                objectId: this.objectId,
                applicationId: this.applicationId,
                prompts: this.aiStateProcessingPrompts,
            }, '*');
        }

        updateSummarizedState(key, state) {
            if (typeof state === 'undefined' || state === null) {
                delete this.summarizedState[key];
            } else {
                this.summarizedState[key] = state;
            }
        }

        setStateToStringReducer(callback) {
            this.stateToStringReducer = callback;
        }

        sendSummarizedStateToParent() {
            window.parent.postMessage({
                type: 'UPDATE_SUMMARIZED_STATE',
                applicationName: this.applicationName,
                objectId: this.objectId,
                applicationId: this.applicationId,
                summarizedState: this.stateToStringReducer ? this.stateToStringReducer(this.summarizedState) : JSON.stringify(this.summarizedState)
            }, '*');
        }

        updateSpatialReference(uuid, name, position) {
            this.spatialReferences[uuid] = {
                name: name,
                position: position
            };
        }

        removeSpatialReference(uuid) {
            if (!this.spatialReferences[uuid]) { return; }
            delete this.spatialReferences[uuid];
            this.sendSpatialReferencesToParent();
        }

        sendSpatialReferencesToParent() {
            window.parent.postMessage({
                type: 'UPDATE_SPATIAL_REFERENCES',
                applicationName: this.applicationName,
                objectId: this.objectId,
                applicationId: this.applicationId,
                spatialReferences: this.spatialReferences
            }, '*');
        }

        onSpatialReferenceStartHover(callback) {
            this.callbacks.onSpatialReferenceStartHover.push(callback);
        }

        onSpatialReferenceStopHover(callback) {
            this.callbacks.onSpatialReferenceStopHover.push(callback);
        }

        listenForCalls() {
            window.addEventListener('message', (event) => {

                if (event.data.type === 'HIGHLIGHT_SPATIAL_REFERENCE' && event.data.applicationId === this.applicationId) {
                    // console.log('LanguageInterface got HIGHLIGHT_SPATIAL_REFERENCE', event.data);

                    this.callbacks.onSpatialReferenceStartHover.forEach(cb => {
                        cb(event.data);
                    });

                } else if (event.data.type === 'UNHIGHLIGHT_SPATIAL_REFERENCE' && event.data.applicationId === this.applicationId) {
                    // console.log('LanguageInterface got UNHIGHLIGHT_SPATIAL_REFERENCE', event.data);

                    this.callbacks.onSpatialReferenceStopHover.forEach(cb => {
                        cb(event.data);
                    });
                }
            });
        }
    }
    exports.LanguageInterface = LanguageInterface;
})(window);
