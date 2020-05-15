'use strict';


const path = require('path');
const {app, BrowserWindow} = require('electron');

/*
// This code tries to use node to open the server via command line and that won't work in electron.

const fork = require('child_process').fork;
const program = path.resolve('server.js');
const parameters = [
//    '--inspect-brk'
];
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
    if (message === 'restart') {
        console.log('message from child:', message);
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
    child = fork(program, parameters, options);
}
startNewChild();
*/

require('./server');

// Modules to control application life and create native browser window

function createWindow() {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 900,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    });

    // Open the DevTools.
    //mainWindow.webContents.openDevTools();

    // and load the index.html of the app.
    mainWindow.loadURL('http://localhost:8080');
}

if (app) {
    // This method will be called when Electron has finished
    // initialization and is ready to create browser windows.
    // Some APIs can only be used after this event occurs.
    app.whenReady().then(createWindow);

    // Quit when all windows are closed.
    app.on('window-all-closed', function() {
        // On macOS it is common for applications and their menu bar
        // to stay active until the user quits explicitly with Cmd + Q
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });

    app.on('activate', function () {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });

} else {
    console.log('Electron unavailable on this platform');
}
