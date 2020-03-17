/**
 * @fileOverview
 * This is a library that should be included in hardware interface's config.html pages in order
 * to automatically add a websocket to the page and give them access to teh InterfaceConfig
 * APIs, which will allow them to subscribe to realtime updates to the settings from the
 * hardware interface's index.js
 */

let socketIoScript = {};
let socketIoRequest = {};

// Load socket.io.js synchronous so that it is available by the time the rest of the code is executed.
function loadScriptSync(url, requestObject, scriptObject) {
    requestObject = new XMLHttpRequest();
    requestObject.open('GET', url, false);
    requestObject.send();

    // Only add script if fetch was successful
    if (requestObject.status === 200) {
        scriptObject = document.createElement('script');
        scriptObject.type = 'text/javascript';
        scriptObject.text = requestObject.responseText;
        document.getElementsByTagName('head')[0].appendChild(scriptObject);
    } else {
        console.log('Error XMLHttpRequest HTTP status: ' + requestObject.status);
    }
}

loadScriptSync('../../socket.io/socket.io.js', socketIoRequest, socketIoScript);

/**
 * This is used to allow the config.html pages for hardware interfaces to subscribe to new settings
 * @param {string} interfaceName - exact name of the hardware interface
 * @constructor
 */
function InterfaceConfig(interfaceName) { // eslint-disable-line no-unused-vars
    if (typeof io !== 'undefined') {
        var _this = this;

        this.ioObject = io.connect();

        this.addSettingsUpdateListener = function (callback) {
            console.log('added interfaceSettings socket listener');

            _this.ioObject.emit('/subscribe/interfaceSettings', JSON.stringify({
                interfaceName: interfaceName
            }));

            _this.ioObject.on('interfaceSettings', function (msg) {
                var thisMsg = JSON.parse(msg);
                callback(thisMsg);
            });
        };

        console.log('socket.io is loaded');
    } else {
        console.warn('socket.io is not working. This is normal when you work offline.');
    }
}
