/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

const puppeteer = require('puppeteer');
// const fetch = require('node-fetch');

// Start the server doing its own thing
require('./server.js');

function sleep(ms) {
    return new Promise((res) => {
        setTimeout(res, ms);
    });
}

(async () => {
    await sleep(10 * 1000);

    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    // const res = await fetch(`http://localhost:8080/hardwareInterface/edgeAgent/settings`);
    // const localSettings = await res.json();

    const page = await browser.newPage();

    await page.goto(
        'http://localhost:8080/',
        {
            timeout: 60 * 1000,
        },
    );
    await page.screenshot({
        path: 'screenshots/server-settings.png',
        fullPage: true,
    });

    await page.goto(
        // `https://${localSettings.serverUrl}/stable/n/${localSettings.networkUUID}/s/${localSettings.networkSecret}/`,
        'http://localhost:8081/',
        {
            timeout: 60 * 1000,
        },
    );
    await page.screenshot({
        path: 'screenshots/remote-operator-start.png',
        fullPage: true,
    });

    await page.waitForSelector('#gltf-added', {
        timeout: 120 * 1000
    });
    await page.screenshot({
        path: 'screenshots/remote-operator-loaded.png',
        fullPage: true,
    });

    await page.close();

    await browser.close();

    console.log('basic remote operator through proxy server page load worked');
    process.exit(0);
})();
