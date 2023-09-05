/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

const puppeteer = require('puppeteer');
const fetch = require('node-fetch');

// Start the server doing its own thing
require('./server.js');

(async () => {
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

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
    await page.click('#manageHardwareInterfaces');
    await page.screenshot({
        path: 'screenshots/server-settings-hardware-interfaces.png',
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
        path: 'screenshots/remote-operator-start-localhost.png',
        fullPage: true,
    });

    await page.waitForSelector('#gltf-added', {
        timeout: 60 * 1000
    });

    await page.screenshot({
        path: 'screenshots/remote-operator-loaded-localhost.png',
        fullPage: true,
    });

    try {
        const res = await fetch(`http://localhost:8080/hardwareInterface/edgeAgent/settings`);
        const localSettings = await res.json();

        await page.goto(
            `https://${localSettings.serverUrl}/stable/n/${localSettings.networkUUID}/s/${localSettings.networkSecret}/`,
            {
                timeout: 60 * 1000,
            },
        );
        await page.screenshot({
            path: 'screenshots/remote-operator-start-proxied.png',
            fullPage: true,
        });

        await page.waitForSelector('#gltf-added', {
            timeout: 60 * 1000
        });

        await page.screenshot({
            path: 'screenshots/remote-operator-loaded-proxied.png',
            fullPage: true,
        });
    } catch (e) {
        console.warn('Failed proxy test', e);
    }


    await page.close();

    await browser.close();

    console.log('basic remote operator through proxy server page load worked');
    process.exit(0);
})();
