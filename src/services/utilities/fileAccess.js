class FileAccess {
    /**
     * Utilities
     * @param {object} dependencies
     * @param {object} dependencies.fs
     * @param {object} dependencies.xml2js
     * @param {object} dependencies.ip
     * @param {function} dependencies.ObjectModel
     * @param {object} dependencies.path
     * @param {object} dependencies.os
     * @param {object} dependencies.root const root = require('../getAppRootFolder');
     **/
    constructor(dependencies) {
        // node Modules
        this.fs = dependencies.fs;
        this.xml2js = dependencies.xml2js;
        this.ip = dependencies.ip;
        this.path = dependencies.path;
        this.os = dependencies.os;
        // project
        // this.ObjectModel = dependencies.ObjectModel;
        this.ObjectModel = dependencies.ObjectModel;
        this.root = dependencies.root;
        this.identityFolderName = '.identity';
        this.writeBufferList = {};
        this.isWriting = false;

        this.homedir = this.path.join(this.os.homedir(), 'Documents', 'spatialToolbox');
        this.oldHomeDirectory = this.path.join(this.os.homedir(), 'Documents', 'realityobjects');

        // Default back to old realityObjects dir if it exists
        if (!this.fs.existsSync(this.homedir) &&
            this.fs.existsSync(this.oldHomeDirectory)) {
            this.homedir = this.oldHomeDirectory;
        }

        if (process.env.NODE_ENV === 'test' || this.os.platform() === 'android' || !this.fs.existsSync(this.path.join(this.os.homedir(), 'Documents'))) {
            this.homedir = this.path.join(this.root, 'spatialToolbox');
        }

        this.hardwareIdentity = this.homedir + '/' + this.identityFolderName;

        this.hardwareInterfaces = {};
    }

    loadHardwareInterface(hardwareInterfaceName) {

        let hardwareFolder = this.hardwareIdentity + '/' + hardwareInterfaceName + '/';


        if (!this.fs.existsSync(this.hardwareIdentity)) {
            this.fs.mkdirSync(this.hardwareIdentity, '0766', function (err) {
                if (err) {
                    console.log(err);
                }
            });
        }

        if (!this.fs.existsSync(hardwareFolder)) {
            this.fs.mkdirSync(hardwareFolder, '0766', function (err) {
                if (err) {
                    console.log(err);
                }
            });
        }

        if (!this.fs.existsSync(hardwareFolder + 'settings.json')) {
            this.fs.writeFile(hardwareFolder + 'settings.json', '', function (err) {
                if (err) {
                    console.log(err);
                } else {
                    console.log('JSON created to ' + hardwareFolder + 'settings.json');
                }
            });
        }

        try {
            let fileContents = this.fs.readFileSync(hardwareFolder + 'settings.json', 'utf8');
            this.hardwareInterfaces[hardwareInterfaceName] = JSON.parse(fileContents);

        } catch (e) {
            console.log('Could not load settings.json for: ' + hardwareInterfaceName);
            this.hardwareInterfaces[hardwareInterfaceName] = {};
        }

        this.read = function (settingsName, defaultvalue) {
            if (typeof this.hardwareInterfaces[hardwareInterfaceName][settingsName] === 'undefined') {
                if (typeof defaultvalue !== 'undefined')
                    this.hardwareInterfaces[hardwareInterfaceName][settingsName] = defaultvalue;
                else {
                    this.hardwareInterfaces[hardwareInterfaceName][settingsName] = 0;
                }
            }
            return this.hardwareInterfaces[hardwareInterfaceName][settingsName];
        };
        return this.read;
    }

    createFolder(folderVar, objectsPath, debug) {
        let folder = objectsPath + '/' + folderVar + '/';
        let identity = objectsPath + '/' + folderVar + '/' + this.identityFolderName + '/';
        if (debug) console.log('Creating folder: ' + folder);

        if (!this.fs.existsSync(folder)) {
            this.fs.mkdirSync(folder, '0766', function (err) {
                if (err) {
                    console.error(err);
                }
            });
        }

        if (!this.fs.existsSync(identity)) {
            this.fs.mkdirSync(identity, '0766', function (err) {
                if (err) {
                    console.error(err);
                }
            });
        }
    }

    createFrameFolder(folderVar, frameVar, dirnameO, objectsPath, debug, location) {
        if (location === 'global') return;
        let folder = objectsPath + '/' + folderVar + '/';
        let identity = folder + this.identityFolderName + '/';
        let firstFrame = folder + frameVar + '/';
        if (debug) console.log('Creating application (frame) folder: ' + folder);

        if (!this.fs.existsSync(folder)) {
            this.fs.mkdirSync(folder, '0766', function (err) {
                if (err) {
                    console.error(err);
                }
            });
        }

        if (!this.fs.existsSync(identity)) {
            this.fs.mkdirSync(identity, '0766', function (err) {
                if (err) {
                    console.error(err);
                }
            });
        }

        if (!this.fs.existsSync(firstFrame)) {
            this.fs.mkdirSync(firstFrame, '0766', function (err) {
                if (err) {
                    console.error(err);
                }
            });

            try {
                this.fs.createReadStream(dirnameO + '/libraries/objectDefaultFiles/index.html').pipe(this.fs.createWriteStream(objectsPath + '/' + folderVar + '/' + frameVar + '/index.html'));
                this.fs.createReadStream(dirnameO + '/libraries/objectDefaultFiles/bird.png').pipe(this.fs.createWriteStream(objectsPath + '/' + folderVar + '/' + frameVar + '/bird.png'));
            } catch (e) {
                if (debug) console.error('Could not copy source files', e);
            }
        }
    }

    /**
     * Recursively delete a folder and its contents
     * @param {string} folder - path to folder
     */
    deleteFolderRecursive(folder) {
        let that = this;
        if (this.fs.existsSync(folder)) {
            this.fs.readdirSync(folder).forEach(function (file) {
                let curPath = folder + '/' + file;
                if (this.fs.lstatSync(curPath).isDirectory()) { // recurse
                    that.deleteFolderRecursive(curPath);
                } else { // delete file
                    this.fs.unlinkSync(curPath);
                }
            });
            this.fs.rmdirSync(folder);
        }
    }

    /**
     * Deletes a directory from the hierarchy. Intentionally limit behaviour to frames so that you don't delete something more important.
     * @param objectName
     * @param frameName
     * @param objectsPath
     */
    deleteFrameFolder(objectName, frameName, objectsPath) {
        console.log('objectName', objectName);
        console.log('frameName', frameName);

        let folderPath = objectsPath + '/' + objectName + '/' + frameName;
        console.log('delete frame folder', folderPath);

        let acceptableFrameNames = ['gauge', 'decimal', 'graph', 'light'];
        let isDeletableFrame = false;
        acceptableFrameNames.forEach(function (nameOption) {
            if (frameName.indexOf(nameOption) > -1) {
                isDeletableFrame = true;
                console.log('it is a ' + nameOption + ' frame');
            }
        });

        if (isDeletableFrame) {
            this.deleteFolderRecursive(folderPath);
        }
    }

    /**
     * Create a data flow processing Engine
     * @param {string} folderName
     * @param {string} objectsPath
     **/
    getObjectIdFromTargetOrObjectFile(folderName, objectsPath) {

        if (folderName === 'allTargetsPlaceholder') {
            return 'allTargetsPlaceholder000000000000';
        }

        let xmlFile = objectsPath + '/' + folderName + '/' + this.identityFolderName + '/target/target.xml';
        let jsonFile = objectsPath + '/' + folderName + '/' + this.identityFolderName + '/object.json';

        if (this.fs.existsSync(xmlFile)) {
            let resultXML = '';
            this.xml2js.Parser().parseString(this.fs.readFileSync(xmlFile, 'utf8'),
                function (err, result) {
                    let firstInResult = Object.keys(result)[0];
                    let secondFirstInResult = Object.keys(result[firstInResult]['Tracking'][0])[0];
                    resultXML = result[firstInResult]['Tracking'][0][secondFirstInResult][0].$.name;

                    if (typeof resultXML === 'string' && resultXML.length === 0) {
                        console.warn('Target file for ' + folderName + ' has empty name, ' +
                            'and may not function correctly. Delete and re-upload target for best results.');
                        resultXML = null;
                    }
                });

            return resultXML;
        } else if (this.fs.existsSync(jsonFile)) {
            try {
                let thisObject = JSON.parse(this.fs.readFileSync(jsonFile, 'utf8'));
                if (thisObject.hasOwnProperty('objectId')) {
                    return thisObject.objectId;
                } else {
                    return null;
                }
            } catch (e) {
                console.log('error reading json file', e);
            }
        } else {
            return null;
        }
    }

    getAnchorIdFromObjectFile(folderName, objectsPath) {

        if (folderName === 'allTargetsPlaceholder') {
            return 'allTargetsPlaceholder000000000000';
        }

        let jsonFile = objectsPath + '/' + folderName + '/object.json';

        if (this.fs.existsSync(jsonFile)) {
            let thisObject = JSON.parse(this.fs.readFileSync(jsonFile, 'utf8'));
            if (thisObject.hasOwnProperty('objectId')) {
                return thisObject.objectId;
            } else {
                return null;
            }
        } else {
            return null;
        }
    }

    /**
     *
     * @param folderName
     * @param objectsPath
     * @return {string}
     */
    getTargetSizeFromTarget(folderName, objectsPath) {
        if (folderName === 'allTargetsPlaceholder') {
            return 'allTargetsPlaceholder000000000000';
        }

        let xmlFile = objectsPath + '/' + folderName + '/' + this.identityFolderName + '/target/target.xml';
        let resultXML = {
            width: 0.3, // default width and height for not crashing if there isn't a size in the xml
            height: 0.3
        };

        if (this.fs.existsSync(xmlFile)) {
            try {
                this.xml2js.Parser().parseString(this.fs.readFileSync(xmlFile, 'utf8'), function (err, result) {
                    let first = Object.keys(result)[0];
                    let secondFirst = Object.keys(result[first]['Tracking'][0])[0];
                    let sizeString = result[first]['Tracking'][0][secondFirst][0].$.size;
                    let sizeFloatArray = sizeString.split(' ').map(function (elt) {
                        let number = parseFloat(elt + '');
                        // TODO: this assumption makes it backwards compatible but might cause problems in the future
                        return (number < 10) ? number : 0.001 * number; // detect meter or mm scale
                    });
                    resultXML = {
                        width: sizeFloatArray[0],
                        height: sizeFloatArray[1]
                    };
                });
            } catch (e) {
                console.warn('error parsing xml, returning default size');
            }
        }
        return resultXML;
    }

    /**
     * Saves the RealityObject as "object.json"
     * (Writes the object state to permanent storage)
     * @param {object}   objects - The array of objects
     * @param {string}   object    - The key used to look up the object in the objects array
     * @param {string}   objectsPath  - The base directory name in which an "objects" directory resides.
     * @param {boolean}   writeToFile  - Give permission to write to file.
     **/
    writeObjectToFile(objects, object, objectsPath, writeToFile) {
        if (writeToFile) {
            this.writeBufferList[object] = objectsPath;
        }
        // trigger write process
        this.executeWrite(objects);
    }

    executeWrite(objects) {
        let that = this;
        // console.log('execute write');
        // if write Buffer is empty, stop.
        if (Object.keys(this.writeBufferList).length === 0) return;

        if (this.isWriting) {
            // come back later;
            setTimeout(function () {
                that.executeWrite(objects);
            }, 20);
            return;
        }
        // block function from re-execution
        this.isWriting = true;

        // copy the first item and delete it from the buffer list
        let firstKey = Object.keys(this.writeBufferList)[0];
        let objectsPath = this.writeBufferList[firstKey];
        let obj = firstKey;
        delete this.writeBufferList[firstKey];

        // prepare to write
        let outputFilename = objectsPath + '/' + objects[obj].name + '/' + this.identityFolderName + '/object.json';
        let objectData = objects[obj];
        console.log('writing:', obj);
        // write file
        this.fs.writeFile(outputFilename, JSON.stringify(objectData, null, '\t'), function (err) {
            // once writeFile is done, unblock writing and loop again
            this.isWriting = false;
            that.executeWrite(objects);

            if (err) {
                console.error(err);
            }
        });
    }

    updateObject(objectName, objects) {
        console.log('update ', objectName);

        let objectFolderList = this.fs.readdirSync(this.homedir).filter(function (file) {
            return this.fs.statSync(this.homedir + '/' + file).isDirectory();
        });

        try {
            while (objectFolderList[0][0] === '.') {
                objectFolderList.splice(0, 1);
            }
        } catch (e) {
            console.log('no hidden files');
        }


        for (let i = 0; i < objectFolderList.length; i++) {
            if (objectFolderList[i] === objectName) {
                let tempFolderName = this.getObjectIdFromTargetOrObjectFile(objectFolderList[i], this.homedir);
                console.log('TempFolderName: ' + tempFolderName);

                if (tempFolderName !== null) {
                    // fill objects with objects named by the folders in objects

                    objects[tempFolderName].name = objectFolderList[i];

                    // try to read a saved previous state of the object
                    try {
                        objects[tempFolderName] = JSON.parse(this.fs.readFileSync(this.homedir + '/' + objectFolderList[i] + '/' + this.identityFolderName + '/object.json', 'utf8'));
                        objects[tempFolderName].ip = this.ip.address();

                        // this is for transforming old lists to new lists
                        if (typeof objects[tempFolderName]['objectValues'] !== 'undefined') {
                            objects[tempFolderName].frames[tempFolderName].nodes = objects[tempFolderName]['objectValues'];
                            delete objects[tempFolderName]['objectValues'];
                        }
                        if (typeof objects[tempFolderName]['objectValues'] !== 'undefined') {
                            objects[tempFolderName].frames[tempFolderName].links = objects[tempFolderName]['objectLinks'];
                            delete objects[tempFolderName]['objectValues'];
                        }

                        if (typeof objects[tempFolderName].nodes !== 'undefined') {
                            objects[tempFolderName].frames[tempFolderName].nodes = objects[tempFolderName].nodes;
                            delete objects[tempFolderName].nodes;
                        }
                        if (typeof objects[tempFolderName].links !== 'undefined') {
                            objects[tempFolderName].frames[tempFolderName].links = objects[tempFolderName].links;
                            delete objects[tempFolderName].links;
                        }

                        for (let frameKey in objects[tempFolderName].frames) {
                            for (let nodeKey in objects[tempFolderName].frames[frameKey].nodes) {
                                if (typeof objects[tempFolderName].frames[frameKey].nodes[nodeKey].item !== 'undefined') {
                                    let tempItem = objects[tempFolderName].frames[frameKey].nodes[nodeKey].item;
                                    objects[tempFolderName].frames[tempFolderName].nodes[nodeKey].data = tempItem[0];
                                }
                            }
                        }

                        // cast everything from JSON to Object, Frame, and Node classes
                        let newObj = new this.ObjectModel(objects[tempFolderName].ip,
                            objects[tempFolderName].version,
                            objects[tempFolderName].protocol,
                            objects[tempFolderName].objectId);
                        newObj.setFromJson(objects[tempFolderName]);
                        objects[tempFolderName] = newObj;
                        // TODO: does this need to be added to sceneGraph?

                        console.log('I found objects that I want to add');

                    } catch (e) {
                        objects[tempFolderName].ip = this.ip.address();
                        objects[tempFolderName].objectId = tempFolderName;
                        console.log('No saved data for: ' + tempFolderName);
                    }

                } else {
                    console.log(' object ' + objectFolderList[i] + ' has no marker yet');
                }
                return tempFolderName;
            }
        }
        return null;
    }

    /**
     * Helper function to return the absolute path to the directory that should contain all
     * video files for the provided object name. (makes dir if necessary)
     * @param objectsPath
     * @param identityFolderNameArg
     * @param isMobile
     * @param objectName
     * @return {string}
     */
    getVideoDir(objectsPath, identityFolderNameArg, isMobile, objectName) {
        let videoDir = objectsPath; // on mobile, put videos directly in object home dir

        // directory differs on mobile due to inability to call mkdir
        if (!isMobile) {
            videoDir = this.path.join(objectsPath, objectName, identityFolderNameArg, 'videos');

            if (!this.fs.existsSync(videoDir)) {
                console.log('make videoDir');
                this.fs.mkdirSync(videoDir);
            }
        }

        return videoDir;
    }

    goesUpDirectory(pathStr) {
        return pathStr.match(/\.\./);
    }
}

module.exports = FileAccess;
