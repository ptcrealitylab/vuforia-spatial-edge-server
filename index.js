'use strict';

const fork = require('child_process').fork;
const path = require('path');
const argv = require('process').argv;

const program = path.resolve('server.js');
const options = {
    stdio: ['inherit', 'inherit', 'inherit', 'ipc']
};

let child = null;

async function startNewChild() {
    child = fork(program, argv, options);
    child.on('message', onChildMessage);
    child.on('exit', onChildCrash);
}

function onChildMessage(message) {
    if (message === 'restart') {
        child.removeListener('exit', onChildCrash);
        child.kill();
        startNewChild();
    } else  if (message === 'exit') {
        child.removeListener('exit', onChildCrash);
        child.kill();
    }
}

function onChildCrash(exitCode) {
    if (exitCode !== 0) {
        console.info('server.js has exited unexpectedly, restarting', exitCode);
        child = fork(program, argv, options);
    }
}

startNewChild();
