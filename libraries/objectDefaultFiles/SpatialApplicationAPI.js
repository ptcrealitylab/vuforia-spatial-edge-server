(function(exports) {
    class SpatialApplicationAPI {
        /**
         * @param {string} applicationName - the type of the application, e.g. "spatialDraw"
         * @param {string} objectId - the uuid of the object
         * @param {string} applicationId - the uuid of the frame
         */
        constructor(applicationName, objectId, applicationId) {
            this.applicationName = applicationName;
            this.applicationId = applicationId;
            this.objectId = objectId;
            this.apiDefinitions = {};
        }

        defineAPI(apiName, parameterInfo, returnInfo, handler) {
            this.apiDefinitions[apiName] = {
                parameterInfo,
                returnInfo,
                handler
            };
        }

        sendAPIDefinitionsToParent() {
            const apiMetadata = Object.entries(this.apiDefinitions).map(([name, {parameterInfo, returnInfo}]) => ({
                name,
                parameterInfo,
                returnInfo
            }));

            window.parent.postMessage({
                type: 'API_DEFINITION',
                applicationName: this.applicationName,
                objectId: this.objectId,
                applicationId: this.applicationId,
                apiDefinitions: apiMetadata
            }, '*');

            console.log('sent API definitions to parent', this.applicationName, this.applicationId, apiMetadata);
        }

        listenForCalls() {
            console.log('listen for calls...');
            window.addEventListener('message', (event) => {
                if (typeof event.data !== 'string' && event.data.name !== 'frame') {
                    console.log('SpatialApplicationAPI got message');
                }
                if (event.data.type === 'API_CALL' && event.data.applicationId === this.applicationId) {
                    console.log('SpatialApplicationAPI got API_CALL');
                    const { name, parameters, callId } = event.data; // callId lets you return data to the sender
                    const api = this.apiDefinitions[name];
                    if (api && api.handler) {
                        const result = api.handler(...parameters); // even if void, return so that await can resolve
                        window.parent.postMessage({
                            type: 'API_RESPONSE',
                            objectId: this.objectId,
                            applicationId: this.applicationId,
                            callId: callId,
                            result: result
                        }, '*');
                    }
                }
            });
        }
    }
    exports.SpatialApplicationAPI = SpatialApplicationAPI;
})(window);
