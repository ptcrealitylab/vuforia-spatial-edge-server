'use strict';

const fork = require('child_process').fork;
const path = require('path');
const argv = require('process').argv;

// const mdb = require('./persistence/MongoDBWrapper.js');
const fsProm = require('./persistence/FileSystemWrapper.js');

const {synchronize} = require('./persistence/walkers.js');
const {objectsPath} = require('./config.js');

const program = path.resolve('server.js');
const options = {
    stdio: ['inherit', 'inherit', 'inherit', 'ipc']
};

let child = null;

async function startNewChild() {
    // await synchronize(mdb, fsProm, objectsPath);
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

function onChildCrash() {
    console.info('server.js has exited unexpectedly, restarting');
    child = fork(program, argv, options);
}

startNewChild();
