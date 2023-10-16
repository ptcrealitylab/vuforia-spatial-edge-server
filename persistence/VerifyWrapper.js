const mdb = require('./MongoDBWrapper.js');
const fs = require('./FileSystemWrapper.js');

const proxy = new Proxy({}, {
    get(target, prop) {
        return async function() {
            console.log(prop, Array.from(arguments));
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
            if (mdbThrown && fsThrown) {
                throw mdbThrown;
            }
            if ((!!mdbThrown) !== (!!fsThrown)) {
                console.error('could not verify persistence', {mdbRes, fsRes, mdbThrown, fsThrown});
                // process.exit(-1);
                throw mdbThrown || fsThrown;
            }

            if (mdbRes !== fsRes) {
                console.error('could not verify persistence', {mdbRes, fsRes});
                // process.exit(-1);
            }
            return fsRes;
        };
    }
});

module.exports = proxy;
