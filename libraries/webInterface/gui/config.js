/**
 * @fileOverview
 * This is a library that should be included in hardware interface's config.html pages in order
 * to automatically add a websocket to the page and give them access to teh InterfaceConfig
 * APIs, which will allow them to subscribe to realtime updates to the settings from the
 * hardware interface's index.js
 */

/**
 * This is used to allow the config.html pages for hardware interfaces to subscribe to new settings
 * @param {string} interfaceName - exact name of the hardware interface
 * @constructor
 */
function InterfaceConfig(interfaceName) { // eslint-disable-line no-unused-vars
    this.interfaceName = interfaceName;
    this.pendingIos = [];
    let self = this;

    if (typeof io !== 'undefined') {
        this.injectSocketIoAPI();
    } else {
        this.ioObject = {
            on: function() {
                console.log('ioObject.on stub called, please don\'t');
            }
        };
        this.addSettingsUpdateListener = makeIoStub('addSettingsUpdateListener');

        this.loadObjectSocketIo();
    }

    /**
     * If you call a SocketIO API function before that API has been initialized, it will get queued up as a stub
     * and executed as soon as that API is fully loaded
     * @param {string} name - the name of the function that should be called
     * @return {Function}
     */
    function makeIoStub(name) {
        return function() {
            console.log('makeIoStub for ' + name);
            self.pendingIos.push({name: name, args: arguments});
        };
    }
}

InterfaceConfig.prototype.injectSocketIoAPI = function() {
    let self = this;

    this.ioObject = io.connect();

    this.addSettingsUpdateListener = function (callback) {
        console.log('added interfaceSettings socket listener');

        self.ioObject.emit('/subscribe/interfaceSettings', JSON.stringify({
            interfaceName: self.interfaceName
        }));

        self.ioObject.on('interfaceSettings', function (msg) {
            var thisMsg = JSON.parse(msg);
            callback(thisMsg);
        });
    };

    console.log('socket.io is loaded and injected into the config.js API');

    for (var i = 0; i < this.pendingIos.length; i++) {
        var pendingIo = this.pendingIos[i];
        this[pendingIo.name].apply(this, pendingIo.args);
    }
    this.pendingIos = [];
};

/**
 * automatically injects the socket.io script into the page
 */
InterfaceConfig.prototype.loadObjectSocketIo = function() {
    let self = this;

    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = '../../socket.io/socket.io.js';

    script.addEventListener('load', function () {
        // adds the API methods related to sending/receiving socket messages
        self.injectSocketIoAPI();
    });

    document.body.appendChild(script);
};
