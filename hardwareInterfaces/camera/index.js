exports.enabled = true;

if (exports.enabled) {
    var http = require('http');

    var server = require('../../libraries/hardwareInterfaces');
    server.enableDeveloperUI(true);

    var SMTPServer = require('smtp-server').SMTPServer;
    var smtpServer = new SMTPServer({
        onAuth: onSMTPAuth,
        onData: onSMTPData,
        disabledCommands: ['STARTTLS'],
        allowInsecureAuth: true
    });
    smtpServer.listen(27183);

    var objectName = 'camera';

    var motionDetectionDuration = 5000;
    var lastSMTPData = 0;


    function onSMTPAuth(auth, session, callback) {
        if (auth.username !== 'camera' || auth.password !== 'fluidnsa') {
            return callback(new Error('Invalid username or password'));
        }
        callback(null, {user: 'camera'});
    }

    function onSMTPData(stream, session, callback) {
        lastSMTPData = Date.now();
        stream.resume();
        stream.on('end', function() {
            callback(null, 'OK');
        });
    }

    var deadzone = 0.01;
    var pan = 0;
    var tilt = 0;
    var requestInFlight = false;
    var updateTimeout = null;
    var motion = 0;

    var options = {
        hostname: '192.168.1.138',
        path: '/pantiltcontrol.cgi',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        auth: 'admin:fluidnsa'
    };

    function writeMotion(newMotion) {
        motion = newMotion;
        server.write(objectName, 'motion', motion, 'f');
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

    server.addNode(objectName, 'pan', 'default');
    server.addNode(objectName, 'tilt', 'default');
    server.addNode(objectName, 'motion', 'default');

    server.activate(objectName);

    server.addReadListener(objectName, 'pan', function(data) {
        pan = (data.value - 0.5) * 2;
    });

    server.addReadListener(objectName, 'tilt', function(data) {
        tilt = (data.value - 0.5) * 2;
    });

    update();


    server.addEventListener('shutdown', function() {
        if (updateTimeout) {
            clearTimeout(updateTimeout);
        }
    });
}
