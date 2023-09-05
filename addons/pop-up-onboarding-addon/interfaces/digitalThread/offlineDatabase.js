const path = require('path');
const fs = require('fs');
const {objectsPath} = require('@libraries/../config.js'); //require('../config.js');
const identityFolderName = '.identity'; // TODO: get this from server.js
const thisInterfaceName = 'digitalThread';
const databaseDirectoryName = 'database';
const databasePath = path.join(objectsPath, identityFolderName, thisInterfaceName, databaseDirectoryName);

function isHiddenFile(filename) {
    return filename.indexOf('.') === 0;
}

function makeDatabase() {
    console.log('makeDatabase');
    console.log(databasePath);

    if (!fs.existsSync(databasePath)) {
        fs.mkdirSync(databasePath, { recursive: true });
    }

    let db = [];

    let machines = fs.readdirSync(databasePath, { });
    machines.forEach(machineName => {
        if (isHiddenFile(machineName)) return;
        let machineResults = {};
        machineResults.fullName = machineName;
        machineResults.applications = [];
        let applications = fs.readdirSync(path.join(databasePath, machineName));
        applications.forEach(appName => {
            if (isHiddenFile(appName)) return;
            let appResults = {};
            appResults.name = appName;
            appResults.app_items = [];
            let documents = fs.readdirSync(path.join(databasePath, machineName, appName));
            documents.forEach(docName => {
                if (isHiddenFile(docName)) return;
                let docResults = {};
                docResults.name = docName;
                docResults.path = path.join('localDigitalThread', machineName, appName, docName); // path.join(databasePath, machineName, appName, docName);
                appResults.app_items.push(docResults);
            });
            machineResults.applications.push(appResults);
        });
        db.push(machineResults);
    });

    console.log(db);
    console.log('finished populating the db');

    return db;
}

module.exports = {
    database: makeDatabase(),
    localDatabasePath: databasePath
}
