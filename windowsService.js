var Service = require('node-windows').Service;

// Create a new service object
var svc = new Service({
    name:'Reality Server',
    description: 'This will run the Reality Server forever',
    script: require('path').join(__dirname,'runServerForever.js')
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