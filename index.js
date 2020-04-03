'use strict';

const fork = require('child_process').fork;
const path = require('path');

const program = path.resolve('server.js');
const parameters = [];
const options = {
    stdio: ['inherit', 'inherit', 'inherit', 'ipc']
};

let child = null;

function startNewChild() {
    child = fork(program, parameters, options);
    child.on('message', onChildMessage);
    child.on('exit', onChildCrash);
}

function onChildMessage(message) {
    console.log('message from child:', message);
    if (message === 'restart') {
        child.removeListener('exit', onChildCrash);
        child.kill();
        startNewChild();
    }
}

function onChildCrash() {
    console.info('server.js has exited unexpectedly, restarting');
    child = fork(program, parameters, options);
}

startNewChild();
