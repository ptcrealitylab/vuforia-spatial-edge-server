"use strict";

/**
 * Starts server.js using forever, so that it restarts upon exiting
 */

var cmd = ( process.env.DBG ? "node --debug" : "node" );

var forever = require( 'forever' ),
    child = new( forever.Monitor )( 'server.js', {
        'command': cmd
    } );

child.on( "exit", function() {
    console.log( 'server.js has exited!' );
} );
child.on( "restart", function() {
    console.log( 'server.js has restarted.' );
} );

child.start();
forever.startServer( child );

if (process.pid) {
    console.log('Reality Server index.js process is running with PID ' + process.pid);
}

process.on( 'SIGINT', function() {
    console.log( "\nGracefully shutting down \'node forever\' from SIGINT (Ctrl-C)" );
    // some other closing procedures go here
    // child.kill('SIGINT');

    try{
        //Killing node process manually that is running "Index.js" file.
        process.kill(child.childData.pid);
        console.log("Child process killed succesfully!!");
        console.log("Forever exit!!");
    }
    catch(err){
        console.log("Child process already stopped!!");
        console.log("Forever exit!!");
    }

    //Killing forever process.
    process.exit();
} );

process.on( 'uncaughtException', function( err ) {
    console.log( 'Caught exception in \'node forever\': ' + err );
} );
