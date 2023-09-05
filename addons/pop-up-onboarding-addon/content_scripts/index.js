/*
* Copyright © 2021 PTC
*/

createNameSpace('realityEditor.popup');

import { ViewManager, VIEWS } from './ViewManager.js';
import { sharedSessionState } from './SessionState.js';

(function(_exports) {
    let resources = [];
    const browser = /\.?toolboxedge.net$/.test(window.location.host) || window.location.host.endsWith(':8081');

    function initService() {
        console.log('init service pop-up-onboarding-addon');
        // set the env.var to fix the camera orientation of new tools added to the world
        let env = realityEditor.device.environment.variables;
        env.overrideMenusAndButtons = true; // this has big effects, look at it if the AR camera view never loads
        // Hide menu if menu was initialized before we set overrideMenusAndButtons
        const existingMenu = document.getElementById('UIButtons');
        if (existingMenu) {
            existingMenu.style.display = 'none';
        }

        if (!browser) {
            env.initialPocketToolRotation = makeRotationZ(-Math.PI / 2);
            env.listenForDeviceOrientationChanges = false;
            env.enableViewFrustumCulling = false;
            env.layoutUIForPortrait = true;
            env.alwaysEnableRealtime = true;
            env.supportsAreaTargetCapture = true;
            env.automaticallyPromptForAreaTargetCapture = false;
            env.suppressObjectRendering = true;
            env.overrideAreaTargetScanningUI = true;
            env.supportsMemoryCreation = false;
            env.screenTopOffset = 20; // offsets for the screen notch and status bar
            env.maxAvatarIcons = 3;
        }

        env.suppressObjectDetections = false; // we don't suppress all object detections through the env.var, rather use the pauseHeartbeats while in menu
        realityEditor.network.discovery.pauseObjectDetections();

        let searchParams = new URLSearchParams(window.location.search);
        let deepLink = searchParams.get('deepLink');
        let metaverseManagerCredentials = searchParams.get('metaverseManagerCredentials');
        let toolboxWorldId = searchParams.get('toolboxWorldId');
        let edgeserver_ip = searchParams.get('edgeserver_ip'); // || '192.168.1.140';
        // searchParams also redundantly contains networkId, and networkSecret, but we just fetch those from the edge-agent-addon
        console.log('deepLink = ', deepLink);
        console.log('metaverseManagerCredentials = ', metaverseManagerCredentials);
        console.log('toolboxWorldId = ', toolboxWorldId);
        console.log('edgeserver_ip = ', edgeserver_ip);

        if (metaverseManagerCredentials) {
            sharedSessionState.metaverseManagerCredentials = metaverseManagerCredentials;
            sharedSessionState.updateUsername(metaverseManagerCredentials);
        }

        if (edgeserver_ip) {
            sharedSessionState.designatedEdgeServerIp = edgeserver_ip;
        }

        setupInterface(deepLink, toolboxWorldId);
    }

    function setupInterface(deepLink, toolboxWorldId) {
        let viewManager = new ViewManager(document.body);

        let dontShowAgain = JSON.parse(window.localStorage.getItem('dontShowPopUpTutorial') || 'false');
        let alwaysShowTutorial = JSON.parse(window.localStorage.getItem('ALWAYS_SHOW_TUTORIAL') || 'false');

        let initialView = VIEWS.MAIN_MENU;
        if (browser) {
            initialView = VIEWS.MAIN_AR;
        } else if (deepLink === 'newScan') {
            initialView = VIEWS.SCAN;
        } else if (deepLink === 'joinScan') {
            if (toolboxWorldId) {
                // Usually customServerIp will be null, but toolboxWorldId will be specified.
                // In the debug case where we want to specifically connect to a certain edge server, we include a customServerIp.
                let customServerIp = sharedSessionState.designatedEdgeServerIp || null;
                realityEditor.network.discovery.setPrimaryWorld(customServerIp, toolboxWorldId);
                initialView = VIEWS.MAIN_AR;
            } else {
                initialView = VIEWS.JOIN;
            }
        } else if (!dontShowAgain || alwaysShowTutorial) {
            initialView = VIEWS.TUTORIAL;
        }

        if (initialView !== VIEWS.TUTORIAL) {
            viewManager.getViewInstance(VIEWS.TUTORIAL).hide(); // ensure the tutorial is properly hidden if we skip it
        }

        viewManager.render(initialView);
    }

    function onResourcesLoaded(resourceList) {
        resources = resourceList;
        console.log('index loaded resource list: ', resources);
    }

    const makeRotationZ =  function ( theta ) {
        let c = Math.cos( theta ), s = Math.sin( theta );
        return [  c, -s, 0, 0,
            s, c, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1];
    };

    realityEditor.addons.addCallback('init', initService);
    realityEditor.addons.addCallback('resourcesLoaded', onResourcesLoaded);
})(realityEditor.popup);
