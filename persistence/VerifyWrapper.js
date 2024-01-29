// const cloud = require('./MongoDBWrapper.js');
const fs = require('./FileSystemWrapper.js');
const mdb = require('./CloudProxyWrapper.js');

const {synchronize} = require('./synchronize.js');

let syncInProgress = false;

async function sync() {
    if (syncInProgress) {
        return;
    }
    syncInProgress = true;
    try {
        await synchronize();
    } catch (e) {
        console.error('synchronize failed', e);
    } finally {
        syncInProgress = false;
    }
}

const proxy = new Proxy({}, {
    get(target, prop) {
        return async function() {
            let debug = false;
            if (prop === 'access') {
                debug = false;
            }
            if (!arguments[0].includes('spatialToolbox')) {
                debug = false;
            }

            let mdbRes, mdbThrown;
            try {
                mdbRes = await mdb[prop].apply(mdb, arguments);
            } catch (e) {
                mdbThrown = e;
            }
            let fsRes, fsThrown;
            try {
                fsRes = await fs[prop].apply(fs, arguments);
            } catch (e) {
                fsThrown = e;
            }
            if (fsThrown) {
                if (debug) {
                    console.log(prop, Array.from(arguments), fsThrown);
                }
                // Currently don't care about mdb's errors
                throw fsThrown;
            }
            if (mdbThrown && fsThrown) {
                throw fsThrown;
            }
            // if ((!!mdbThrown) !== (!!fsThrown)) {
            //     console.error('could not verify persistence', {mdbRes, fsRes, mdbThrown, fsThrown});
            //     // process.exit(-1);
            //     throw mdbThrown || fsThrown;
            // }

            let isBadStat = true;
            // if (prop === 'stat') {
            //     if (mdbRes.isFile() === fsRes.isFile()) {
            //         isBadStat = false;
            //     }
            // }
            if (isBadStat && mdbRes !== fsRes) {
                if (debug) {
                    console.error(prop, Array.from(arguments), 'could not verify persistence', {mdbRes, fsRes});
                }
                sync();
                // process.exit(-1);
            } else {
                if (debug) {
                    // console.log(prop, Array.from(arguments), fsRes);
                }
            }
            return fsRes;
        };
    }
});

module.exports = proxy;
