var Service = require('node-windows').Service;

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

// Listen for the "uninstall" event so we know when it's done.
svc.on('uninstall',function(){
    console.log('Uninstall complete.');
    console.log('The service exists: ',svc.exists);
});

// Uninstall the service.
svc.uninstall();
