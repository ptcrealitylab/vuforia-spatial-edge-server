const fs = require('./FileSystemWrapper.js');
const cloud = require('./CloudProxyWrapper.js');

const {startSyncIfNotSyncing} = require('./synchronize.js');

const debug = false;

/**
 * Intercept all access to fs API, returning a proxied function which calls
 * both fs and the cloud synchronization layer to attempt to keep both in sync
 * with minimal data transfer. If there is a mismatch, it calls the heavier
 * `synchronize` function to walk the entire tree and resolve all differences.
 */
const proxy = new Proxy({}, {
    get(target, prop) {
        return async function() {

            let cloudRes, _cloudThrown;
            try {
                cloudRes = await cloud[prop].apply(cloud, arguments);
            } catch (e) {
                _cloudThrown = e;
            }
            let fsRes, fsThrown;
            try {
                fsRes = await fs[prop].apply(fs, arguments);
            } catch (e) {
                fsThrown = e;
            }

            // Currently don't care about cloud's errors
            if (fsThrown) {
                if (debug) {
                    console.log(prop, Array.from(arguments), fsThrown);
                }
                throw fsThrown;
            }

            if (cloudRes !== fsRes) {
                if (debug) {
                    console.error(prop, Array.from(arguments), 'could not verify persistence', {cloudRes, fsRes});
                }
                startSyncIfNotSyncing();
            }
            return fsRes;
        };
    }
});

module.exports = proxy;
