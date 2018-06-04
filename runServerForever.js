var forever = require('forever-monitor');

var child = new (forever.Monitor)('server.js', {
    silent: false,
    args: []
});

child.on('watch:restart', function(info) {
    console.error('Restaring script because ' + info.file + ' changed');
});

child.on('restart', function() {
    console.error('Forever restarting script for ' + child.times + ' time');
});

child.on('exit:code', function(code) {
    console.error('Forever detected script exited with code ' + code);
});

child.on('exit', function () {
    console.log('your-filename.js has exited after 3 restarts');
});

child.start();

/*
var Service = require('node-windows').Service;

// Create a new service object
var svc = new Service({
    name:'Reality Server',
    description: 'This will run the Reality Server forever',
    script: require('path').join(__dirname,'server.js')
});

// Listen for the "install" event, which indicates the
// process is available as a service.
svc.on('install',function(){
    svc.start();
});

svc.on('alreadyinstalled',function(){
    svc.start();
});

svc.install();
*/