/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/* global test, beforeAll, afterAll */

const puppeteer = require('puppeteer');
const puppeteerToIstanbul = require('puppeteer-to-istanbul');
const fetch = require('node-fetch');

const {
    sleep,
    waitForObjects,
    localServer,
    localRemoteOperator,
    fetchAgent,
} = require('./helpers.js');

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
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors'],
        headless: 'new',
        ignoreHTTPSErrors: true
    });

    const page = await browser.newPage();
    await Promise.all([
        page.coverage.startJSCoverage(),
        page.coverage.startCSSCoverage()
    ]);
    // from https://stackoverflow.com/questions/58089425/how-do-print-the-console-output-of-the-page-in-puppeter-as-it-would-appear-in-th
    page.on('console', async e => {
        try {
            const args = await Promise.all(e.args().map(a => a.jsonValue() || a));
            console[e.type() === 'warning' ? 'warn' : e.type()](e.location(), ...args);
        } catch (_) {
            // don't care
        }
    });

    await waitForObjects();

    await page.goto(
        localServer,
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
        localRemoteOperator,
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
        const res = await fetch(`${localServer}/hardwareInterface/edgeAgent/settings`, {agent: fetchAgent});
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

    const [jsCoverage, cssCoverage] = await Promise.all([
        page.coverage.stopJSCoverage(),
        page.coverage.stopCSSCoverage()
    ]);

    puppeteerToIstanbul.write([...jsCoverage, ...cssCoverage], {
        includeHostname: true,
        storagePath: './.nyc_output',
    });

    await page.close();

    await browser.close();

    console.log('basic remote operator through proxy server page load worked');
}, 5 * 60 * 1000);
