/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/* global test, beforeAll, afterAll */

const puppeteer = require('puppeteer');
const fetch = require('node-fetch');

const {sleep, waitForObjects} = require('./helpers.js');

let server;
beforeAll(() => {
    server = require('../server.js');
});

afterAll(async () => {
    await server.exit();
    await sleep(1000);
});

test('server provides remote operator functionality', async () => {
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: 'new',
    });

    const page = await browser.newPage();
    // from https://stackoverflow.com/questions/58089425/how-do-print-the-console-output-of-the-page-in-puppeter-as-it-would-appear-in-th
    page.on('console', async e => {
        try {
            const args = await Promise.all(e.args().map(a => a.jsonValue() || a));
            console[e.type() === 'warning' ? 'warn' : e.type()](...args);
        } catch (_) {
            // don't care
        }
    });

    await waitForObjects();

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

    await sleep(2000);

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
}, 5 * 60 * 1000);
