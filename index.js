"use strict";

/**
 * Starts server.js using forever, so that it restarts upon exiting
 */

var cmd = ( process.env.DBG ? "node --debug" : "node" );


var forever = require('forever');

const child = new forever.Monitor('server.js', {
    command: cmd
});

child.on("exit", function() {
    logger.info('server.js has exited!');
} );
child.on("restart", function() {
    logger.info( 'server.js has restarted.' );
} );

child.start();
forever.startServer( child );

if (process.pid) {
    console.log('Reality Server index.js process is running with PID', process.pid);
}

process.on('SIGINT', function() {
    logger.info("Gracefully shutting down 'node forever' from SIGINT (Ctrl-C)");
    // some other closing procedures go here
    // child.kill('SIGINT');

    try {
        //Killing node process manually that is running "Index.js" file.
        process.kill(child.childData.pid);
        console.log("Child process killed succesfully!!");
    } catch(err) {
        console.error("Child process already stopped!!", err);
    }

    //Killing forever process.
    process.exit();
});

process.on('uncaughtException', function(err) {
    console.error('Caught exception in \'node forever\': ', err);
});
