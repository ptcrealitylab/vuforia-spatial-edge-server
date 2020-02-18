const AddonFramesSource = require('./AddonFramesSource');

/**
 * Manages a set of AddonFramesSources, exposing all of their frames to the server
 */
class AddonFrames {
    constructor() {
        this.framesSources = [];
    }

    /**
     * Add a new source of frames
     * @param {string} framePath - absolute path to frame source directory
     * @param {string} identityName - name of identity folder, e.g. '.identity'
     */
    addFramesSource(framePath, identityName) {
        const source = new AddonFramesSource(framePath, identityName);
        source.setupDirectories();
        source.loadFramesJsonData();
        this.framesSources.push(source);
    }

    /**
     * Gets the coalesced map of all frames
     */
    getFrameList() {
        const frameList = {};
        for (const source of this.framesSources) {
            const sourceList = source.getFrameList();
            for (const key in sourceList) {
                if (!frameList.hasOwnProperty(key)) {
                    frameList[key] = sourceList[key];
                }
            }
        }
        return frameList;
    }

    /**
     * Gets the coalesced map of all frames where metadata.enabled === true
     */
    getEnabledFrames() {
        const frameList = this.getFrameList();
        const keys = Object.keys(frameList);
        for (const key of keys) {
            if (!frameList[key].metadata || !frameList[key].metadata.enabled) {
                delete frameList[key];
            }
        }
        return frameList;
    }

    /**
     * Locates the frame source responsible for frameName then overwrites the
     * 'enabled' property in the
     * realityframes/.identity/frameName/settings.json
     * If the file is new (empty), write a default json blob into it with the
     * new enabled value
     * @param {string} frameName
     * @param {boolean} shouldBeEnabled
     * @param {Function} callback - called with true if successful, error and
     *                              message if failed
     */
    setFrameEnabled(frameName, shouldBeEnabled, callback) {
        for (const source of this.framesSources) {
            let frameList = source.getFrameList();
            if (frameList.hasOwnProperty(frameName)) {
                source.setFrameEnabled(frameName, shouldBeEnabled, callback);
                return;
            }
        }
        callback(false, 'could not find frame ' + frameName);
    }
}

module.exports = AddonFrames;
