const fetch = require('node-fetch');
const FormData = require('form-data');

/**
 * Implements a slice of the fs/promises API required to synchronize local
 * files with a cloud backup
 */
class CloudProxyWrapper {
    connect() {
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
                    path,
                }),
            }
        ));
        if (!res.ok) {
            throw new Error('fs api error');
        }
    }

    async readFile(path, options) {
        const res = await fetch(this.apiBase() + 'read_file', this.fetchOptionsRead({
            path,
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
            path,
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
                path: dirEntJson.path,
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
                    path,
                    destPath,
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
                    path,
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
            path,
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
                    path,
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
        const name = path.split('/').at(-1);
        form.append('file', contents, {filename: name, name});
        const res = await fetch(this.apiBase() + 'write_file', {
            method: 'POST',
            headers: Object.assign(
                this.apiHeaders({path}),
                form.getHeaders()
            ),
            body: form,
        });
        if (!res.ok) {
            throw new Error('fs api error');
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
            throw new Error('fs api error: ' + res.status);
        }
        return await res.json();
    }
}

let wrapper = new CloudProxyWrapper();
module.exports = wrapper;
