var Service = require('node-windows').Service;

var EventLogger = require('node-windows').EventLogger;

var log = new EventLogger('Reality Server');

log.info('Basic information.');
log.warn('Watch out!');
log.error('Something went wrong.');

// Create a new service object
var svc = new Service({
    name:'Reality Server',
    description: 'Real-Time service for Reality Editor',
    script: require('path').join(__dirname,'server.js'),
    env: {
        name: "HOME",
        value: process.env["admin"] // service is now able to access the user who created its' home directory
    }
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