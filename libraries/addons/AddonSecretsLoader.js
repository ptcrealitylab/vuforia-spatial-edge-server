const fs = require('fs');
const path = require('path');

module.exports = {
    /*
     * Returns a mapping of addon names to secrets contained within those addons
     */
    load: (addonFolders) => {
        const secrets = {};
        addonFolders.forEach(addonFolder => {
            const addon = path.basename(addonFolder);
            const secretsPath = path.join(addonFolder, 'secrets.json');
            if (!fs.existsSync(secretsPath)) {
                return;
            }
            try {
                secrets[addon] = JSON.parse(fs.readFileSync(secretsPath, 'utf8'));
            } catch (e) {
            }
        });
        return secrets;
    }
}
