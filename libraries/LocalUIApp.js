const cors = require('cors');
const express = require('express');
const fs = require('fs');
const path = require('path');
const proxyRequestHandler = require('./serverHelpers/proxyRequestHandler.js');

const contentScriptDir = 'content_scripts';
const contentStyleDir = 'content_styles';
const contentResourceDir = 'content_resources';

/**
 * An express app for server a local userinterfaces folder
 * Additionally supports the add-ons content_scripts API by serving add-on
 * scripts from the /addons route.
 */
class LocalUIApp {
    /**
     * @constructor
     * @param {string} userinterfacePath
     * @param {Array} addonFolders
     */
    constructor(userinterfacePath, addonFolders) {
        this.userinterfacePath = userinterfacePath;
        this.addonFolders = addonFolders;
        this.app = express();
    }

    /**
     * Set up the LocalUIApp, configuring its express instance
     */
    setup() {
        this.loadScripts();
        this.loadStyles();
        this.loadResources();

        this.app.use(cors());
        this.app.use('/addons/sources', (req, res) => {
            res.send(this.sources);
        });
        this.app.use('/addons/styles', (req, res) => {
            res.send(this.stylesSources);
        });
        this.app.use('/addons/resources', (req, res) => {
            res.send(this.resourcesSources);
        });

        this.app.use('/addons/:addonName/*', (req, res) => {
            const addonName = req.params.addonName;
            let filePath = req.params[0]; // Capture the remaining path after addonName

            // Security check to prevent directory traversal
            if (filePath.includes('..')) {
                return res.status(403).send('Access prohibited');
            }

            // Normalize filePath and join with addon directory
            filePath = path.normalize(filePath);
            const scriptsInfo = this.scripts[addonName];

            if (scriptsInfo && scriptsInfo.files.includes(filePath)) {
                return res.sendFile(path.join(scriptsInfo.folder, filePath));
            }

            const stylesInfo = this.styles[addonName];
            if (stylesInfo && stylesInfo.files.includes(filePath)) {
                return res.sendFile(path.join(stylesInfo.folder, filePath));
            }

            const resourcesInfo = this.resources[addonName];
            if (resourcesInfo && resourcesInfo.files.includes(filePath)) {
                return res.sendFile(path.join(resourcesInfo.folder, filePath));
            }

            res.status(403).send('Access prohibited to non-script non-style file');
        });
        this.app.get('/proxy/*', proxyRequestHandler);
        if (this.userinterfacePath && fs.existsSync(this.userinterfacePath)) {
            this.app.use(express.static(this.userinterfacePath));
        } else {
            console.error(`${this.userinterfacePath} does not exist, unable to serve LocalUIApp UI`);
        }
    }

    /**
     * Load all the content_scripts specified in the installed add-ons.
     */
    loadScripts() {
        this.sources = [];
        this.scripts = {};
        for (const addonFolder of this.addonFolders) {
            const addonName = path.basename(addonFolder);
            const uiPath = path.join(addonFolder, contentScriptDir);
            if (!fs.existsSync(uiPath)) {
                continue;
            }
            const fileList = fs.readdirSync(uiPath).filter(function(filename) {
                return filename.endsWith('.js');
            });
            if (fileList.length === 0) {
                continue;
            }
            this.scripts[addonName] = {
                folder: uiPath,
                files: fileList,
            };
            for (const file of fileList) {
                this.sources.push(`/addons/${addonName}/${file}`);
            }
        }
    }

    loadStyles() {
        this.stylesSources = [];
        this.styles = {};
        for (const addonFolder of this.addonFolders) {
            const addonName = path.basename(addonFolder);
            const uiPath = path.join(addonFolder, contentStyleDir);
            if (!fs.existsSync(uiPath)) {
                continue;
            }
            const fileList = fs.readdirSync(uiPath).filter(function(filename) {
                return filename.endsWith('.css');
            });
            if (fileList.length === 0) {
                continue;
            }
            this.styles[addonName] = {
                folder: uiPath,
                files: fileList,
            };
            for (const file of fileList) {
                this.stylesSources.push(`/addons/${addonName}/${file}`);
            }
        }
    }

    loadResources() {
        this.resourcesSources = [];
        this.resources = {};
        for (const addonFolder of this.addonFolders) {
            const addonName = path.basename(addonFolder);
            const uiPath = path.join(addonFolder, contentResourceDir);
            if (!fs.existsSync(uiPath)) {
                continue;
            }
            const fileList = fs.readdirSync(uiPath).filter(function (filename) {
                // this list can be extended in future to support more resource types
                return filename.endsWith('.svg') || filename.endsWith('.png') ||
                    filename.endsWith('.fbx') || filename.endsWith('.gltf') ||
                    filename.endsWith('.glb') || filename.endsWith('.3dt') || filename.endsWith('.html');
            });
            if (fileList.length === 0) {
                continue;
            }
            this.resources[addonName] = {
                folder: uiPath,
                files: fileList,
            };
            for (const file of fileList) {
                this.resourcesSources.push(`/addons/${addonName}/${file}`);
            }
        }
    }

    /**
     * Listen and serve requests on a given port
     * @param {number} port
     */
    listen(port) {
        this.app.listen(port);
    }
}

module.exports = LocalUIApp;
