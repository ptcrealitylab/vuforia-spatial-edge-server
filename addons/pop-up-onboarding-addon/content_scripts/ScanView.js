/*
* Copyright © 2021 PTC
*/

import { VIEWS } from './ViewManager.js';
import { MenuView } from './MenuView.js';
import { sharedNetworkSettings } from './NetworkSettings.js';
import { sharedSessionState, MANAGER_BASE_URL } from './SessionState.js';

// This only applies to world objects on external servers, not world objects saved on this phone
// TODO: when metaverse manager deletes a metaverse, delete the world object on this phone too
const DELETE_OLD_WORLD_OBJECTS_BEFORE_SCANNING = true;

export class ScanView extends MenuView {
    constructor(viewManager) {
        super(viewManager);
        this.scanStatus = null;
        this.scanStatusInfo = null;
        this.supportsDepthCapture = false;

        realityEditor.app.promises.doesDeviceHaveDepthSensor().then(supportsCapture => {
            this.supportsDepthCapture = supportsCapture;
        });

        this.networkSettings = null;
        sharedNetworkSettings.addOnChange((settings) => {
            this.networkSettings = settings;
        });

        // refresh the UI if we detect a new server
        realityEditor.network.discovery.onServerDetected(() => {
            if (!this.isVisible) { return; }
            if (!this.supportsDepthCapture) { return; } // don't refresh UI if we can't even capture
            this.viewManager.render(VIEWS.SCAN);
        });

        // add these one time only, rather than re-adding each time we go to scan page
        realityEditor.gui.ar.areaTargetScanner.onStartScanning(() => {
            if (!this.isVisible) { return; }
            this.viewManager.isActivelyScanning = true;
            this.viewManager.isScanFinishing = false;
            console.log('started scanning');

            this.viewManager.render(VIEWS.SCAN);
        });
        realityEditor.gui.ar.areaTargetScanner.onStopScanning(() => {
            if (!this.isVisible) { return; }
            console.log('stopped scanning');
            this.viewManager.isActivelyScanning = false;
            this.viewManager.isScanFinishing = true;

            let scannedWorldId = realityEditor.gui.ar.areaTargetScanner.getSessionObjectId();
            realityEditor.network.discovery.setPrimaryWorld(null, scannedWorldId);

            this.viewManager.render(VIEWS.SCAN);
        });
        realityEditor.gui.ar.areaTargetScanner.onCaptureSuccessOrError((success, errorMessage) => {
            if (!this.isVisible) { return; }
            console.log('capture completed. success: ' + success + ', error: ' + errorMessage);
            this.viewManager.isActivelyScanning = false;
            this.viewManager.isScanFinishing = false;

            this.viewManager.render(VIEWS.FINALIZE_SCAN);
        });
        realityEditor.gui.ar.areaTargetScanner.onCaptureStatus((status, statusInfo) => {
            if (!this.isVisible) { return; }
            console.log('capture status: ' + status + ', statusInfo: ' + statusInfo);

            let dimmer = document.getElementById('introScanDimmer');
            let animationPath = document.getElementById('helpAnimationPath');
            let animationPhone = document.getElementById('helpAnimationPhone');
            let helpText = this.getHelpText();

            if (status === 'PREPARING') {
                this.showElement(dimmer);
                this.showElement(animationPath);
                this.showElement(animationPhone);
                this.hideElement(helpText);

            } else if (status === 'CAPTURING' && this.scanStatus !== 'CAPTURING') {
                // hide helpAnimation when changes from PREPARING to CAPTURING

                // when we're newly capturing, hide animation and show corners
                this.addScanningCorners();
                this.hideElement(dimmer);
                this.hideElement(animationPath);
                this.hideElement(animationPhone);
                this.hideElement(helpText);

            } else if (status === 'CAPTURING') {

                if (statusInfo === 'MOVEMENT_NEEDED') {
                    // show dimmer, animation, and "Movement Needed"
                    this.showElement(dimmer);
                    this.showElement(animationPath);
                    this.showElement(animationPhone);
                    this.showElement(helpText);
                    helpText.innerText = 'Movement Needed';

                } else if (statusInfo === 'EXCESSIVE_MOVEMENT') {
                    // show dimmer, hide animation, and show "Slow Down"
                    this.showElement(dimmer);
                    this.hideElement(animationPath);
                    this.hideElement(animationPhone);
                    this.showElement(helpText);
                    helpText.innerText = 'Slow Down';

                } else {
                    // hide everything if status is NORMAL
                    this.hideElement(dimmer);
                    this.hideElement(animationPath);
                    this.hideElement(animationPhone);
                    this.hideElement(helpText);
                    helpText.innerText = '';
                }

            }

            this.scanStatus = status;
            this.scanStatusInfo = statusInfo;
        });
    }
    show(previousViewName) {
        super.show();
        this.backButtonExitsEntirely = previousViewName === VIEWS.APP_ENTRY_POINT;
        this.previousViewName = previousViewName;
    }
    showElement(elt) {
        elt.style.display = '';
    }
    hideElement(elt) {
        elt.style.display = 'none';
    }
    getHelpText() {
        if (document.getElementById('introScanHelpText')) {
            return document.getElementById('introScanHelpText');
        }
        let div = document.createElement('div');
        div.classList.add('introScanHelpText');
        div.id = 'introScanHelpText';
        this.dom.appendChild(div);
        return div;
    }
    render() {
        super.render();

        realityEditor.device.environment.variables.suppressObjectRendering = true;

        let backButton = this.addBackButton(this.previousViewName || VIEWS.MAIN_MENU);
        if (this.backButtonExitsEntirely) {
            backButton.addEventListener('pointerdown', () => {
                window.location = 'https://toolboxedge.net/metaverse-manager/';
            });
        }

        // show the settings button if there is at least one server other than 127.0.0.1
        let settingsButton = null;
        let availableNonLocalServers = realityEditor.network.discovery.getDetectedServerIPs({limitToWorldService: true}).filter(ip => {
            return ip !== '127.0.0.1';
        });
        if (availableNonLocalServers.length > 0 && !(sharedSessionState.designatedEdgeServerIp)) {
            settingsButton = this.addSettingsButton();
        }

        if (this.viewManager.isScanSettingsOpen && !this.viewManager.isActivelyScanning && !this.viewManager.isScanFinishing) {
            this.addSettingsCard();
        }

        if (!this.viewManager.isScanFinishing) {
            if (this.viewManager.isActivelyScanning) {
                this.addStopButton();
                this.addHelpAnimation();

                // disable back and settings buttons
                // todo: change back button into a cancel button that safely cancels the scan
                this.disableTopButtons(backButton, settingsButton);
            } else {
                if (this.supportsDepthCapture) {
                    this.addStartButton();
                } else {
                    // check LiDAR support again in case render was called before constructor promise resolved
                    realityEditor.app.promises.doesDeviceHaveDepthSensor().then(supportsCapture => {
                        if (supportsCapture) {
                            this.addStartButton();
                        } else {
                            this.addUnableToCaptureCard();
                            // remove back and settings buttons, if they exist
                            this.disableTopButtons(backButton, settingsButton);
                            if (backButton) backButton.style.display = 'none';
                            if (settingsButton) settingsButton.style.display = 'none';
                        }
                    });
                }
            }
        } else {
            this.disableTopButtons(backButton, settingsButton);
        }
    }
    disableTopButtons(backButton, settingsButton) {
        if (backButton) {
            backButton.classList.add('introButtonDisabled');
        }
        if (settingsButton) {
            settingsButton.classList.add('introButtonDisabled');
        }
    }
    addHelpAnimation() {
        let backgroundDimmer = document.createElement('div');
        backgroundDimmer.classList.add('dimmerView');
        backgroundDimmer.id = 'introScanDimmer';
        this.dom.appendChild(backgroundDimmer);

        let leftRightArrow = document.createElement('img');
        leftRightArrow.src = '/addons/pop-up-onboarding-addon/left-right-arrow-path-center.svg';
        leftRightArrow.classList.add('introScanHelpImage');
        leftRightArrow.classList.add('helpAnimationPath');
        leftRightArrow.id = 'helpAnimationPath';
        this.dom.appendChild(leftRightArrow);

        let phoneImage = document.createElement('img');
        phoneImage.src = '/addons/pop-up-onboarding-addon/hand-holding-phone.svg';
        phoneImage.classList.add('introScanHelpImage');
        phoneImage.classList.add('helpAnimationPhone');
        phoneImage.id = 'helpAnimationPhone';
        this.dom.appendChild(phoneImage);
    }
    addScanningCorners() {
        let scanBox = document.createElement('div');
        scanBox.id = 'scanCornerBox';
        this.dom.appendChild(scanBox);
        realityEditor.gui.moveabilityCorners.wrapDivWithCorners(scanBox, 8, true, null, -4, 8, 30);
    }
    addStartButton() {
        let beginScanButton = this.addDarkButton('beginScan', 'Begin Scan', this.dom, () => {
            // trigger the areaTargetScanner
            // let DEFAULT_SERVER_IP = '127.0.0.1';
            let DEFAULT_SERVER_IP = realityEditor.network.discovery.getDetectedServerIPs({limitToWorldService: true})[0];
            let destinationServerIp = sharedSessionState.designatedEdgeServerIp || this.viewManager.selectedServerIP || DEFAULT_SERVER_IP;

            // Old method: just overwrite the existing world object and hope that's enough
            if (!DELETE_OLD_WORLD_OBJECTS_BEFORE_SCANNING ||
                destinationServerIp === '127.0.0.1') {
                beginScanButton.style.display = 'none';
                realityEditor.gui.ar.areaTargetScanner.programmaticallyStartScan(destinationServerIp);
                // don't delete world objects saved on this phone, in case we want to start them up later
                return;
            }

            // new method: delete all existing world objects on that server before beginning the scan
            // check if there are any discovered heartbeats for world objects on the destination server
            let objectsToDelete = [];
            let detectedWorldObjects = realityEditor.network.discovery.getDetectedObjectsOfType('world');
            detectedWorldObjects.forEach(objectInfo => {
                if (objectInfo.heartbeat.ip === destinationServerIp) {
                    objectsToDelete.push({
                        ip: objectInfo.heartbeat.ip,
                        id: objectInfo.heartbeat.id,
                        port: realityEditor.network.getPort(objectInfo.heartbeat),
                        name: objectInfo.metadata.name
                    });
                }
            });
            console.log('objects to delete: ', objectsToDelete);

            beginScanButton.style.display = 'none';

            if (objectsToDelete.length === 0) {
                realityEditor.gui.ar.areaTargetScanner.programmaticallyStartScan(destinationServerIp);
            } else {
                let numResponsesLeft = objectsToDelete.length;
                objectsToDelete.forEach((info) => {
                    let url = realityEditor.network.getURL(info.ip, info.port, '/');
                    console.log('deleting: ', info);
                    realityEditor.network.postData(url, { action: 'delete', name: info.name, frame: '' }, (err, response) => {
                        // also delete from the discovery map and pending heartbeats
                        realityEditor.network.discovery.deleteObject(info.ip, info.id);
                        numResponsesLeft -= 1;
                        console.log(numResponsesLeft, err, response);
                        if (numResponsesLeft === 0) {
                            console.log('begin scanning: ', info);
                            realityEditor.gui.ar.areaTargetScanner.programmaticallyStartScan(destinationServerIp);
                        }

                        // also try to delete the metaverse from the metaverse manager
                        try {
                            this.delete_existingMetaverse(info.id);
                        } catch (e) {
                            console.err('error deleting metaverse', e);
                        }
                    });
                });
            }
        });
        beginScanButton.style.bottom = '30px';
        this.setupButtonVisualFeedback(beginScanButton, 'introButtonPressed');
    }
    addStopButton() {
        let stopButton = document.getElementById('scanStopButton');
        if (!stopButton) { return; }
        stopButton.style.left = '40px';
        stopButton.style.width = 'calc(100vw - 80px)';
        stopButton.style.backgroundColor = 'rgba(0,0,0,0.8)';
        stopButton.style.color = 'white';
        stopButton.style.bottom = '85px';
        let timer = document.getElementById('scanTimerTextfield');
        timer.style.bottom = '45px';
        this.setupButtonVisualFeedback(stopButton, 'introButtonPressed');
    }
    addSettingsButton() {
        let button = document.createElement('div');
        button.id = 'viewSettingsButton';
        button.classList.add('settingsButton');
        this.dom.appendChild(button);
        // button.innerText = '*';

        let gearIcon = document.createElement('img');
        gearIcon.src = '/addons/pop-up-onboarding-addon/bw-settings-white.svg';
        button.appendChild(gearIcon);

        button.addEventListener('pointerdown', () => {
            this.viewManager.isScanSettingsOpen = !this.viewManager.isScanSettingsOpen;
            this.viewManager.render(VIEWS.SCAN);
        });

        return button;
    }
    addSettingsCard() {
        let card = this.addCard();
        card.style.fontSize = '18px';

        let cardText = document.createElement('div');

        let descriptionText = 'Choose an upload destination for your scan:';
        descriptionText += '<br>';
        descriptionText += 'Selected IP: <select id="settingsModalServerIp">';
        for (let ip of realityEditor.network.discovery.getDetectedServerIPs({limitToWorldService: true})) {
            if (ip === this.viewManager.selectedServerIP) {
                descriptionText += `<option selected value="${ip}">${ip}</option>`;
            } else {
                descriptionText += `<option value="${ip}">${ip}</option>`;
            }
        }
        descriptionText += '</select>';
        cardText.innerHTML = descriptionText;
        cardText.style.top = '20px';
        cardText.style.position = 'absolute';
        cardText.style.width = 'calc(100% - 20px)';
        cardText.style.left = '10px';
        card.appendChild(cardText);

        // TODO: BEN finish adding the name textfield to set the name of the world object
        // let nameText = document.createElement('div');
        // nameText.innerText = 'Name: ';
        // card.appendChild(nameText);

        let serverDropdown = document.getElementById('settingsModalServerIp');
        serverDropdown.style.fontSize = '20px';
        serverDropdown.addEventListener('change', () => {
            this.viewManager.selectedServerIP = serverDropdown.value;
        });
        card.style.top = '100px';
        card.style.height = '220px';
        let acceptSettingsButton = this.addDarkButton('acceptSettings', 'Set IP', card, () => {
            this.viewManager.selectedServerIP = serverDropdown.value;
            this.viewManager.isScanSettingsOpen = false;
            this.viewManager.render(VIEWS.SCAN);
        });
        this.setupButtonVisualFeedback(acceptSettingsButton, 'introButtonPressed');
        acceptSettingsButton.style.top = '126px';
        acceptSettingsButton.style.left = '20px';
        return card;
    }
    addUnableToCaptureCard() {
        let card = this.addCard();
        card.style.fontSize = '16px';
        card.style.top = '100px';
        card.style.height = 'calc(100vh - 200px)';
        card.style.lineHeight = 'unset';

        // set margin-bottom = 30px for each paragraph
        let cardText = document.createElement('div');

        let descriptionText = `
                <h3 style='text-align: center;'>Your device does not have
                a LiDAR depth sensor.</h3>

                <p class='bottom-30'>Creating a new 3D scan requires an
                iPhone or iPad with a LiDAR sensor.</p>

                <p class='bottom-30'>Unfortunately, your device doesn’t have
                this hardware, so you are unable to create
                a new scan with this device.</p>

                <p class='bottom-30'>You can still join a metaverse session
                scanned by another device.</p>

                <p class='bottom-30'>To do so, go back to the dashboard and
                add a metaverse from a link or QR code.</p>
                `;

        cardText.innerHTML = descriptionText;
        cardText.style.top = '20px';
        cardText.style.position = 'absolute';
        cardText.style.width = 'calc(100% - 20px)';
        cardText.style.left = '10px';
        cardText.style.textAlign = 'left';
        card.appendChild(cardText);

        let exitButton = this.addDarkButton('exitScanButton', 'Return to Menu', card, () => {
            exitButton.innerText = 'Exiting...';

            setTimeout(() => {
                realityEditor.app.restartDeviceTracker();

                // check if we should go back to the metaverse-manager or just reload
                if (sharedSessionState.metaverseManagerCredentials) {
                    window.location = 'https://toolboxedge.net/metaverse-manager/';
                } else {
                    window.location.reload();
                }
            }, 500);
        });
        this.setupButtonVisualFeedback(exitButton, 'introButtonPressed');
        exitButton.style.bottom = '20px';
        exitButton.style.left = '20px';

        return card;
    }
    delete_existingMetaverse(worldId) {
        if (!sharedSessionState.metaverseManagerCredentials) {
            console.warn('we do not have a JWT from the Metaverse Manager – cannot post metaverse');
            return;
        }

        const ENDPOINT = `${MANAGER_BASE_URL}api/metaverses/toolbox/${worldId}`;
        console.log('> deleting old metaverse from manager', ENDPOINT);

        fetch(ENDPOINT, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sharedSessionState.metaverseManagerCredentials}`
            }
        })
            .then((res) => res.json())
            .then((result) => {
                console.log(`metaverse corresponding with ${worldId} was deleted from the manager`);
            })
            .catch((err) => {
                console.log(`metaverse corresponding with ${worldId} could not be deleted from the manager`);
                console.warn(err);
            });
    }
}
