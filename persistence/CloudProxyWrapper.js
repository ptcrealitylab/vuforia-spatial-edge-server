const fetch = require('node-fetch');
const FormData = require('form-data');
const pathOps = require('path');

const {objectsPath} = require('../config.js');

/**
 * Implements a slice of the fs/promises API required to synchronize local
 * files with a cloud backup
 */
class CloudProxyWrapper {
    connect() {
    }

    /**
     * Transform from local (absolute or relative to `objectsPath`) path within
     * the spatialToolbox directory (at objectsPath) to remote (relative to
     * spatialToolbox) path
     *
     * For example:
     * /Users/james/Documents/spatialToolbox/.identity/settings.json -> .identity/settings.json
     *
     * Throws if a path isn't within the spatialToolbox directory
     *
     * @param {string} path
     * @return {string}
     */
    localToRemote(path) {
        path = pathOps.normalize(path);
        if (pathOps.isAbsolute(path)) {
            if (!path.startsWith(objectsPath)) {
                throw new Error('persistence: Unexpected local path outside of objectsPath: ' + path);
            }

            let relPath = pathOps.relative(objectsPath, path);
            if (pathOps.isAbsolute(relPath) || relPath.startsWith('..')) {
                throw new Error('persistence: Unexpected local path: ' + path);
            }
            return relPath;
        }
        if (path.startsWith('..')) {
            throw new Error('persistence: local path outside of objectsPath: ' + path);
        }
        // Just a normal path relative to spatialToolbox
        return path;
    }

    /**
     * Performs opposite of localToRemote, returning a local path prefixed with
     * objectsPath (i.e. guaranteed to be within the spatialToolbox directory)
     *
     * Throws if the local path would be outside the spatialToolbox directory
     *
     * @param {string} path
     * @return {string}
     */
    remoteToLocal(path) {
        let localPath = pathOps.normalize(pathOps.join(objectsPath, path));

        let relPath = pathOps.relative(objectsPath, localPath);

        if (pathOps.isAbsolute(relPath) || relPath.startsWith('..')) {
            throw new Error('persistence: Unexpected remote path: ' + path);
        }

        return localPath;
    }

    apiBase() {
        const {getLoadedHardwareInterface} = require('../libraries/utilities.js');
        const edgeAgent = getLoadedHardwareInterface('edgeAgent');
        if (!edgeAgent || !edgeAgent.networkUUID || !edgeAgent.networkSecret) {
            throw new Error('bad edge-agent settings: ' + JSON.stringify(edgeAgent));
        }
        const serverUrl = edgeAgent.serverUrl || 'alpha.toolboxedge.net';
        const networkUUID = edgeAgent.networkUUID;
        const networkSecret = edgeAgent.networkSecret;
        return `https://${serverUrl}/n/${networkUUID}/s/${networkSecret}/files/`;
    }

    apiHeaders(args) {
        return {
            'X-Files-Args': JSON.stringify(args),
        };
    }

    fetchOptionsRead(args) {
        if (args) {
            return {
                headers: this.apiHeaders(args),
            };
        }
        return {};
    }

    fetchOptionsWrite(args) {
        let headers = {
            'Content-type': 'application/json',
        };
        if (args) {
            Object.assign(headers, this.apiHeaders(args));
        }
        return {
            method: 'POST',
            headers,
        };
    }

    async copyFile(source, dest) {
        const contents = await this.readFile(source);
        return await this.writeFile(dest, contents);
    }

    /**
     * Create directory at `path`
     * @param {string} path
     * @param {object} _options
     */
    async mkdir(path, _options) {
        const res = await fetch(this.apiBase() + 'mkdir', Object.assign(
            this.fetchOptionsWrite(), {
                body: JSON.stringify({
                    path: this.localToRemote(path),
                }),
            }
        ));
        if (!res.ok) {
            throw new Error('fs api error');
        }
    }

    async readFile(path, options) {
        const res = await fetch(this.apiBase() + 'read_file', this.fetchOptionsRead({
            path: this.localToRemote(path),
        }));
        if (!res.ok) {
            throw new Error('fs api error');
        }
        const arrayBuffer = await res.arrayBuffer();
        const buf = Buffer.from(arrayBuffer);

        if (typeof options === 'string') {
            return buf.toString(options);
        }
        if (options && options.encoding) {
            return buf.toString(options.encoding);
        }
        return buf;
    }

    async readdir(path, options) {
        const res = await fetch(this.apiBase() + 'readdir', this.fetchOptionsRead({
            path: this.localToRemote(path),
        }));
        if (!res.ok) {
            throw new Error('fs api error');
        }
        const dirEntsJson = await res.json();

        const dirEnts = [];
        for (const dirEntJson of dirEntsJson) {
            const name = dirEntJson.name;
            const isDirectory = dirEntJson.isDirectory;
            const isFile = !isDirectory;
            if (!options || !options.withFileTypes) {
                dirEnts.push(name);
                continue;
            }

            dirEnts.push({
                name,
                path: this.remoteToLocal(dirEntJson.path),
                isDirectory: function() {
                    return isDirectory;
                },
                isFile: function() {
                    return isFile;
                },
            });
        }
        return dirEnts;
    }

    /**
     * Rename the file or folder at `path` to be `destPath`
     * @param {string} path
     * @param {string} destPath
     */
    async rename(path, destPath) {
        const res = await fetch(this.apiBase() + 'rename', Object.assign(
            this.fetchOptionsWrite(), {
                body: JSON.stringify({
                    path: this.localToRemote(path),
                    destPath: this.localToRemote(destPath),
                }),
            }
        ));
        if (!res.ok) {
            throw new Error('fs api error');
        }
        const data = await res.json();
        if (data.error) {
            console.error('fs api error', data.error);
            throw new Error('fs api error');
        }
    }

    async rmdir(path, _options) {
        const res = await fetch(this.apiBase() + 'rmdir', Object.assign(
            this.fetchOptionsWrite(), {
                body: JSON.stringify({
                    path: this.localToRemote(path),
                }),
            }
        ));
        if (!res.ok) {
            throw new Error('fs api error');
        }
    }

    /**
     * @param {string} path
     */
    async stat(path) {
        const res = await fetch(this.apiBase() + 'stat', this.fetchOptionsRead({
            path: this.localToRemote(path),
        }));
        if (!res.ok) {
            throw new Error('stat failed');
        }
        return {};
    }

    async access(path) {
        await this.stat(path);
    }

    /**
     * Remove document with given path
     * @param {string} path
     */
    async unlink(path) {
        const res = await fetch(this.apiBase() + 'unlink', Object.assign(
            this.fetchOptionsWrite(), {
                body: JSON.stringify({
                    path: this.localToRemote(path),
                }),
            }
        ));
        if (!res.ok) {
            throw new Error('fs api error');
        }
    }

    /**
     * Create or update document at `path`
     * @param {string} path
     * @param {any} contents
     * @return {Buffer} remote's contents at `path` (result of local-remote merge)
     */
    async writeFile(path, contentsAny) {
        const form = new FormData();
        const contents = Buffer.from(contentsAny);
        const name = pathOps.basename(path);
        form.append('file', contents, {filename: name, name});
        const res = await fetch(this.apiBase() + 'write_file', {
            method: 'POST',
            headers: Object.assign(
                this.apiHeaders({path: this.localToRemote(path)}),
                form.getHeaders()
            ),
            body: form,
        });
        if (!res.ok) {
            throw new Error(`fs api error: writeFile(${path}): ${res.statusText}`);
        }
        const arrayBuffer = await res.arrayBuffer();
        return Buffer.from(arrayBuffer);
    }

    /**
     * Read from the /checksums API which gives a table of all known files and
     * their checksum value
     */
    async getChecksumList() {
        const res = await fetch(this.apiBase() + 'checksums', this.fetchOptionsRead());
        if (!res.ok) {
            throw new Error(`fs api error: ${res.status} ${res.url}`);
        }
        return await res.json();
    }
}

let wrapper = new CloudProxyWrapper();
module.exports = wrapper;
