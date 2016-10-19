exports.enabled = true;

if (exports.enabled) {
    var http = require('http');
    var server = require('../../libraries/HybridObjectsHardwareInterfaces.js');
    var SMTPServer = require('smtp-server').SMTPServer;
    var smtpServer = new SMTPServer({
        onAuth: onSMTPAuth,
        onData: onSMTPData,
        disabledCommands: ['STARTTLS'],
        logger: true,
        allowInsecureAuth: true
    });
    smtpServer.listen(27183);

    var objectName = 'camera';

    var motionDetectionDuration = 5000;
    var lastSMTPData = 0;


    function onSMTPAuth(auth, session, callback) {
        console.log('auth', auth);
        console.log('auth 2', JSON.stringify(auth));
        if (auth.username !== 'camera' || auth.password !== 'fluidnsa') {
            return callback(new Error('Invalid username or password'));
        }
        callback(null, {user: 'camera'});
    }

    function onSMTPData(stream, session, callback) {
        lastSMTPData = Date.now();
        console.log(session.envelope);
        stream.pipe(process.stdout);
        stream.on('end', function() {
            callback(null, 'OK');
        });
    }

    exports.receive = function() {
    };

    var deadzone = 0.01;
    var pan = 0;
    var tilt = 0;
    var requestInFlight = false;
    var updateTimeout = null;
    var motion = 0;

    var options = {
        hostname: '192.168.1.139',
        path: '/pantiltcontrol.cgi',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        auth: 'admin:fluidnsa'
    };

    function writeMotion(newMotion) {
        motion = newMotion;
        server.writeIOToServer(objectName, 'motion', motion, 'f');
    }

    function update() {
        if (lastSMTPData + motionDetectionDuration > Date.now()) {
            if (motion < 0.5) {
                writeMotion(1);
            }
        } else if (motion > 0.5) {
            writeMotion(0);
        }
        // Map pan and tilt to index
        // 0 is NW, 1 is N, etc.
        var index = -1;
        var panning = Math.abs(pan) > deadzone;
        var tilting = Math.abs(tilt) > deadzone;
        if (panning && tilting) {
            if (panning < 0) {
                if (tilting < 0) {
                    index = 4;
                } else {
                    index = 2;
                }
            } else {
                if (tilting > 0) {
                    index = 0;
                } else {
                    index = 6;
                }
            }
        } else if (panning) {
            if (pan < 0) {
                index = 3;
            } else {
                index = 5;
            }
        } else if (tilting) {
            if (tilt < 0) {
                index = 7;
            } else {
                index = 1;
            }
        }

        if (index !== -1) {
            sendMovement(index);
        }
        updateTimeout = setTimeout(update, 33);
    }

    function sendMovement(index) {
        if (requestInFlight) {
            return;
        }
        requestInFlight = true;
        // Note that this must balance overwhelming the camera with requests
        // (causing lag at end time) and sending requests too infrequently
        // (causing jitter)
        var body = 'PanSingleMoveDegree=1&TiltSingleMoveDegree=1&PanTiltSingleMove=' + index;
        options.headers['Content-Length'] = Buffer.byteLength(body);
        var req = http.request(options, function() {
            requestInFlight = false;
        });
        req.on('error', function(e) {
            console.log('Problem with request:', e.message);
            requestInFlight = false;
        });

        req.write(body);
        req.end();
    }

    exports.send = function(objName, ioName, value, mode, type) {
        // console.log('objName', objName);
        // console.log('ioName', ioName);
        // console.log('value', value, typeof(value));
        // console.log('mode', mode);
        // console.log('type', type);
        if (type !== 'camera') {
            return;
        }

        if (typeof(value) !== 'number') {
            return;
        }
        value = (value - 0.5) * 2;

        if (ioName === 'pan') {
            pan = value;
        } else if (ioName === 'tilt') {
            tilt = value;
        }
    };

    exports.init = function() {
        server.addIO(objectName, 'pan', 'default', 'camera');
        server.addIO(objectName, 'tilt', 'default', 'camera');
        server.addIO(objectName, 'motion', 'default', 'camera');
        server.clearIO(objectName);

        update();
    };

    exports.shutdown = function() {
        if (updateTimeout) {
            clearTimeout(updateTimeout);
        }
    };
}
