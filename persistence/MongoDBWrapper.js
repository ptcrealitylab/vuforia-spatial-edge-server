const { MongoClient } = require('mongodb');
const { uri } = require('../config-private.js');
const client = new MongoClient(uri);

/*
const root = config.thething;

function cutPath(path) {
    if (path.startsWith(root)) {
        return path.substr(root.length);
    }
    return path;
}
*/

/**
 * {
 *   path: string,
 *   contents: Buffer? (hopefully it works),
 *   isDirectory: haaah,
 * }
 * Should have user id which is somehow a scope for mongo
 */
class MongoDBWrapper {
    connect() {
        this.database = client.db('filesDatabase');
        this.collection = this.database.collection('files');
    }

    async copyFile(source, dest) {
        const contents = await this.readFile(source);
        return await this.writeFile(dest, contents);
    }
    /**
     * Create directory at `path`
     * @param {string} path
     * @param {object} options
     */

    async mkdir(path, options) {
        let paths = [path];
        if (options && options.recursive) {
            let allParts = path.split('/');
            for (let i = 0; i < allParts.length; i++) {
                let parts = allParts.slice(0, i);
                paths.push(parts.join('/'));
            }
        }
        for (let pathToCreate of paths) {
            await this.collection.updateOne({
                path: pathToCreate,
            }, {
                $set: {
                    contents: null,
                    isDirectory: true,
                }
            }, {
                upsert: true,
            });
        }
    }

    async readFile(path, options) {
        const doc = await this.collection.findOne({
            path: {$eq: path},
        });
        if (!doc) {
            throw new Error(`No file at ${path}`);
        }
        if (typeof options === 'string') {
            return doc.contents.toString(options);
        }
        if (options && options.encoding) {
            return doc.contents.toString(options.encoding);
        }
        return doc.contents;
    }

    async readdir(path, options) {
        // find all keys prefixed with path
        let pathEscaped = path.replace(/[/\\.]/g, '\\$&');
        if (pathEscaped.endsWith('/')) {
            pathEscaped = pathEscaped.substr(0, pathEscaped.length - 1);
        }
        const allDocs = await this.collection.find({
            path: {$regex: '^' + pathEscaped + '\\/[^/]+$'},
        }).toArray();

        let dirEnts = [];
        for (const doc of allDocs) {
            const name = doc.path.split('/').at(-1);
            const isDirectory = doc.isDirectory;
            const isFile = !isDirectory;
            if (!options || !options.withFileTypes) {
                dirEnts.push(name);
                continue;
            }

            dirEnts.push({
                name,
                path: doc.path,
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

    async rename(path, destPath) {
        // alter path rename to destPath
        let pathEscaped = path.replace(/[/\\.]/g, '\\$&');
        if (pathEscaped.endsWith('/')) {
            pathEscaped = pathEscaped.substr(0, pathEscaped.length - 1);
        }
        const allDocs = await this.collection.find({
            path: {$regex: '^' + pathEscaped + '\\/[^/]+$'},
        }).toArray();
        for (let doc of allDocs) {
            return await this.collection.updateOne({
                path: doc.path,
            }, {
                $set: {
                    path: doc.path.replace(path, destPath),
                }
            });
        }
    }

    async rmdir(path, _options) {
        // remove all keys prefixed with path
        // throw if options recursive false and you would remove any (lol)
        return await this.collection.deleteMany({
            path: {$regex: '^' + path.replace(/[/\\.]/g, '\\$&')},
        });
    }

    /**
     * @param {string} path
     */
    async stat(path) {
        const doc = await this.collection.findOne({
            path: {$eq: path},
        });
        if (!doc) {
            throw new Error('ENOEXIST');
        }

        const isDirectory = doc.isDirectory;
        const isFile = !isDirectory;
        return {
            name: doc.path.split('/').at(-1),
            path: doc.path,
            isDirectory: function() {
                return isDirectory;
            },
            isFile: function() {
                return isFile;
            },
        };
    }

    async access(path) {
        return !!await this.stat(path);
    }

    /**
     * Remove document with given path
     * @param {string} path
     */
    async unlink(path) {
        return await this.collection.deleteOne({
            path: {$eq: path},
        });
    }

    /**
     * Create or update document at `path`
     * @param {string} path
     * @param {any} contents
     */
    async writeFile(path, contents) {
        // write document (ez)
        return await this.collection.updateOne({
            path,
        }, {
            $set: {
                contents,
                isDirectory: false,
            }
        }, {
            upsert: true,
        });
    }
}

let mdbWrapper = new MongoDBWrapper();
mdbWrapper.connect();
module.exports = mdbWrapper;
