const process = require('process');

process.on('uncaughtException', (e) => {
    console.error('Uncaught server error', e);
});

try {
    const _ = require('./server.js');
} catch (e) {
    console.error('Fatal server error', e);
}
