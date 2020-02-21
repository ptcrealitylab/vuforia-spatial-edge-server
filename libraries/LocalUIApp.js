const cors = require('cors');
const express = require('express');
const fs = require('fs');
const path = require('path');

const contentScriptDir = 'content_scripts';

class LocalUIApp {
    constructor(addonFolders) {
        this.addonFolders = addonFolders;
        this.app = express();
    }

    setup() {
        this.loadScripts();

        this.app.use(cors());
        this.app.use('/addons/sources', (req, res) => {
            res.send(this.sources);
        });
        this.app.use('/addons/:addonName/:file', (req, res) => {
            const addonName = req.params.addonName;
            const file = req.params.file;
            const scriptsInfo = this.scripts[addonName];
            if (!scriptsInfo.files.includes(file)) {
                res.status(403).send('access prohibited to non-script file');
                return;
            }
            res.sendFile(path.join(scriptsInfo.folder, file));
        });
        this.app.use(express.static(path.join(__dirname, '../../userinterface/')));
    }

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


    listen(port) {
        this.app.listen(port);
    }
}

module.exports = LocalUIApp;
