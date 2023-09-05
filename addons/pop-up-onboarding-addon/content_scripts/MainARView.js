/*
* Copyright © 2021 PTC
*/

import { VIEWS } from './ViewManager.js';
import { MenuView } from './MenuView.js';
import { KebabMenu } from './KebabMenu.js';
import { PopUpModal } from './PopUpModal.js';
import { sharedSessionState, MANAGER_BASE_URL } from './SessionState.js';

const browser = /\.?toolboxedge.net$/.test(window.location.host) || window.location.host.endsWith(':8081');
const MESSAGES = {
    MICROPHONE_ON: 'Microphone is now on',
    MICROPHONE_OFF: 'Microphone is now off',
    VIDEO_SHARING_ON: 'Started sharing video',
    VIDEO_SHARING_OFF: 'Stopped sharing video'
};

const TRASH_ZONE_HEIGHT = 108;

/**
 * The entirety of the properties that are needed to render the UI state, at any moment in time,
 * are stored in this.state. All the properties that are part of this.state are enumerated here.
 */
const PROPS = Object.freeze({
    isEnvelopeOpen: 'isEnvelopeOpen',
    isAnyEnvelopeFocused: 'isAnyEnvelopeFocused',
    isLocalizedWithinWorld: 'isLocalizedWithinWorld',
    didRecentlyLocalizeWithinWorld: 'didRecentlyLocalizeWithinWorld',
    isExitModalOpen: 'isExitModalOpen',
    didFindWorld: 'didFindWorld',
    isReadyForLocalization: 'isReadyForLocalization',
    isTrashZoneShown: 'isTrashZoneShown',
    didUserEverCloseKebab: 'didUserEverCloseKebab',
    currentMessage: 'currentMessage',
    full2DTools: 'full2DTools',
    isToolMenuOpen: 'isToolMenuOpen'
});

export class MainARView extends MenuView {
    constructor(viewManager) {
        super(viewManager);

        // each button added should enable pointerevents, so that the fullpage div doesn't block touches from hitting the AR elements
        this.dom.style.pointerEvents = 'none';

        // set the default values of the state props
        this.state[PROPS.isEnvelopeOpen] = false;
        this.state[PROPS.isAnyEnvelopeFocused] = false;
        this.state[PROPS.isLocalizedWithinWorld] = false;
        this.state[PROPS.didRecentlyLocalizeWithinWorld] = false;
        this.state[PROPS.didUserEverCloseKebab] = false;
        this.state[PROPS.isExitModalOpen] = false;
        this.state[PROPS.didFindWorld] = false;
        this.state[PROPS.isReadyForLocalization] = false;
        this.state[PROPS.isTrashZoneShown] = false;
        this.state[PROPS.currentMessage] = {
            text: null,
            startTime: null,
            lifeTime: null
        };
        this.state[PROPS.full2DTools] = {};
        this.state[PROPS.isToolMenuOpen] = false;

        // not directly used by rendered components, just processed to extract the currentMessage, so not part of state
        this.queuedMessages = [];

        // create all of the DOM elements, even the ones that shouldn't be visible yet, so that we can register them
        // to show and hide and update based on the changing state of the props listed above
        this.setupKebabMenu();
        if (!realityEditor.device.environment.isDesktop()) {
            this.addSettingsMenuButton();
        }
        //plus button for adding tools initialized 
        this.setupAddToolButton()
        this.setupToolButtons();
        this.setupCustomTrashZone();
        this.setupExitCard();
        this.setupHelpAnimation();
        this.setupHelpText();
        this.setupQueuedMessageText();

        this.render(); // process the UI with the default state to ensure hidden elements are hidden when first loads

        setInterval(() => {
            this.processQueuedMessages();
        }, 500);

        realityEditor.network.discovery.onObjectDetected(objectInfo => {
            if (objectInfo.heartbeat.id === realityEditor.worldObjects.getLocalWorldId()) return;
            if (objectInfo.metadata.type === 'world' || objectInfo.heartbeat.id.includes('_WORLD_')) {
                if (!this.state[PROPS.didFindWorld]) {
                    this.state[PROPS.didFindWorld] = true;
                    this.render();
                }
            }
        });

        realityEditor.worldObjects.onLocalizedWithinWorld((objectKey) => {
            if (objectKey === realityEditor.worldObjects.getLocalWorldId()) return; // skip local world

            this.state[PROPS.isLocalizedWithinWorld] = true;
            this.state[PROPS.didRecentlyLocalizeWithinWorld] = true;
            setTimeout(() => {
                this.state[PROPS.didRecentlyLocalizeWithinWorld] = false;
                this.render();
            }, 3000);
            this.render(); // refresh the UI when we localize within a world
        });

        // automatically close the session dropdown menu if an envelope opens
        realityEditor.envelopeManager.onExitButtonShown((exitButton, minimizeButton) => {
            exitButton.style.top = '55px';
            this.state[PROPS.isAnyEnvelopeFocused] = false;
            if (minimizeButton) {
                minimizeButton.style.top = '55px';
                // simple trick to determine if any envelope has focus – check if the minimize button is visible
                if (minimizeButton.style.display === 'inline') {
                    this.state[PROPS.isAnyEnvelopeFocused] = true;
                }
            }
            this.state[PROPS.isEnvelopeOpen] = true;
            this.render() // refresh the UI
        });

        // show the session dropdown again when the envelope closes
        realityEditor.envelopeManager.onExitButtonHidden(() => {
            this.state[PROPS.isEnvelopeOpen] = false;
            this.state[PROPS.isAnyEnvelopeFocused] = false;
            this.render()  // refresh the UI
        });

        realityEditor.envelopeManager.onFullscreenFull2DToggled(({frameId, isFull2D}) => {
            if (isFull2D) {
                this.state[PROPS.full2DTools][frameId] = true;
            } else {
                delete this.state[PROPS.full2DTools][frameId];
            }
            this.render();
        })
    }
    show(previousViewName) {
        super.show();

        realityEditor.network.discovery.resumeObjectDetections();

        // make sure the state of the video/mic buttons reflects their state if changed on the settings screen
        if (this.videoAudioKebabMenu) {
            const micButton = this.videoAudioKebabMenu.buttons['sessionMenuMicrophoneButton'];
            if (micButton) {
                micButton.isToggled = sharedSessionState.isMicrophoneOn;
                micButton.updateToggleVisuals();
            }
            const cameraButton = this.videoAudioKebabMenu.buttons['sessionMenuCameraButton'];
            if (cameraButton) {
                cameraButton.isToggled = sharedSessionState.isSharingVideo;
                cameraButton.updateToggleVisuals();
            }
        }

        // let scannedWorldId = realityEditor.gui.ar.areaTargetScanner.getSessionObjectId();
        let primaryWorldInfo = realityEditor.network.discovery.getPrimaryWorldInfo();
        if (primaryWorldInfo && primaryWorldInfo.id) {
            console.log('add markerAdded callback for ' + primaryWorldInfo.id);
            realityEditor.app.targetDownloader.addMarkerAddedCallback(primaryWorldInfo.id, (success, targetDownloadInfo) => {
                console.log(primaryWorldInfo.id + ' is added to vuforia...', targetDownloadInfo);
                if (success) { // && !this.isReadyForLocalization) {
                    this.state[PROPS.isReadyForLocalization] = true;
                    this.render() // refresh the UI when the world object is ready
                }
            });
        }
    }
    render() {
        super.render({ newRendering: true });
        realityEditor.device.environment.variables.suppressObjectRendering = false;
    }
    setupKebabMenu() {
        this.videoAudioKebabMenu = new KebabMenu(this.dom);
        this.videoAudioKebabMenu.registerButtonCallback('sessionMenuCameraButton', ({toggleState}) => {
            if (toggleState) {
                sharedSessionState.turnOnVideo();
            } else {
                sharedSessionState.turnOffVideo();
            }
            // the mic state updates when camera button is pressed, so update button too
            const micButton = this.videoAudioKebabMenu.buttons['sessionMenuMicrophoneButton'];
            micButton.isToggled = sharedSessionState.isMicrophoneOn;
            micButton.updateToggleVisuals();

            let message = toggleState ? MESSAGES.VIDEO_SHARING_ON : MESSAGES.VIDEO_SHARING_OFF;
            this.addQueuedMessage(message, 1000);
            let secondMessage = toggleState ? MESSAGES.MICROPHONE_ON : MESSAGES.MICROPHONE_OFF;
            this.addQueuedMessage(secondMessage, 1000);
            this.render();
        });
        this.videoAudioKebabMenu.registerButtonCallback('sessionMenuMicrophoneButton', ({toggleState}) => {
            if (toggleState) {
                sharedSessionState.turnOnMicrophone();
            } else {
                sharedSessionState.turnOffMicrophone();
            }

            let message = toggleState ? MESSAGES.MICROPHONE_ON : MESSAGES.MICROPHONE_OFF;
            this.addQueuedMessage(message, 1000);
            this.render();
        });
        this.videoAudioKebabMenu.registerButtonCallback('sessionMenuInviteButton', () => {
            if (realityEditor.device.environment.isDesktop()) {
                this.viewManager.render(VIEWS.SHARE);
            } else {
                if (!sharedSessionState.shareUrl && !sharedSessionState.shareUrlListening) {
                    sharedSessionState.getShareUrl(() => {
                        this.render();
                    });
                }
                if (sharedSessionState.shareUrl) {
                    navigator.share({
                        title: 'Pop-up Metaverse Access',
                        text: 'Pop-up Metaverse Access',
                        url: sharedSessionState.shareUrl,
                    });
                }
            }
        });
        this.videoAudioKebabMenu.registerButtonCallback('sessionMenuEndButton', () => {
            this.state[PROPS.isExitModalOpen] = true;
            this.render();
        });
        this.videoAudioKebabMenu.registerButtonCallback('sessionMenuCloseButton', () => {
            if (!this.state[PROPS.didUserEverCloseKebab]) {
                this.state[PROPS.didUserEverCloseKebab] = true;
                this.render();
            }
        })

        this.registerChild(this.videoAudioKebabMenu.dom, [
            PROPS.isEnvelopeOpen,
            PROPS.isLocalizedWithinWorld,
            PROPS.didUserEverCloseKebab,
            PROPS.full2DTools
        ], ((element) => {
            if (Object.keys(this.state[PROPS.full2DTools]).length > 0) {
                this.videoAudioKebabMenu.dom.classList.add('hiddenByFull2D');
            } else {
                this.videoAudioKebabMenu.dom.classList.remove('hiddenByFull2D');
            }
            if (!this.state[PROPS.didUserEverCloseKebab] && this.state[PROPS.isLocalizedWithinWorld]) {
                this.videoAudioKebabMenu.isParentLocalized = true;
                this.videoAudioKebabMenu.expand(); // default it open the first time you localize, until you collapse it
            }
        }));
    }
    setupAddToolButton() {
        let src = '/addons/pop-up-onboarding-addon/add-tool-icon.svg';
        let addToolButton = this.addToolButton('addToolButton', src, 0, this.dom, () => {
            if (!this.state[PROPS.isToolMenuOpen]) {
                this.state[PROPS.isToolMenuOpen] = true;
            } else {
                this.state[PROPS.isToolMenuOpen] = false;
            }
            this.render();
        });
        if (realityEditor.device.environment.isDesktop()) {
            addToolButton.classList.add('desktop-position');
        } else {
            addToolButton.classList.add('mobile-position');
        }
        this.registerChild(addToolButton, [PROPS.isToolMenuOpen, PROPS.isLocalizedWithinWorld], (element) => {
            if (this.state[PROPS.isToolMenuOpen]) {
                this.toolsContainer.classList.add('visibleTools');
            } else {
                this.toolsContainer.classList.remove('visibleTools');
            }
            if (this.state[PROPS.isLocalizedWithinWorld]) {
                addToolButton.classList.remove('addToolButtonDisabled');
                addToolButton.style.pointerEvents = 'auto';
            } else {
                addToolButton.classList.add('addToolButtonDisabled');
                addToolButton.style.pointerEvents = 'none';
            }
        });
        return addToolButton;
    }
    setupToolButtons() {
        this.toolsContainer = document.createElement('div');
        if (realityEditor.device.environment.isDesktop()) {
            this.toolsContainer.classList.add('toolsDivDesktop');
        } else {
            this.toolsContainer.classList.add('toolsDivMobile');
        }
        this.dom.appendChild(this.toolsContainer);

        let src = {
            draw: '/addons/pop-up-onboarding-addon/add-draw-tool-icon.svg',
            chat: '/addons/pop-up-onboarding-addon/add-chat-tool-icon.svg',
            video: '/addons/pop-up-onboarding-addon/add-video-tool-icon.svg',
            analytics: '/addons/pop-up-onboarding-addon/add-analytics-tool-icon.svg',
            search: '/addons/pop-up-onboarding-addon/add-search-tool-icon.svg'
        };
        let drawButton = this.newToolButton('addDrawToolButton', 'spatialDraw', src.draw, 1, this.toolsContainer, () => {
            console.log('add draw tool');
            this.state[PROPS.isToolMenuOpen] = false;
            this.render();
        });
        let chatButton = this.newToolButton('addChatToolButton', 'communication', src.chat, 2, this.toolsContainer, () => {
            console.log('add chat tool');
            this.state[PROPS.isToolMenuOpen] = false;
            this.render();
        });
        let videoButton = this.newToolButton('addVideoToolButton', 'spatialVideo', src.video, 3, this.toolsContainer, () => {
            console.log('add video tool');
            this.state[PROPS.isToolMenuOpen] = false;
            this.render();
        });
        let analyticsButton = this.newToolButton('addAnalyticsToolButton', 'spatialAnalytics', src.analytics, 4, this.toolsContainer, () => {
            console.log('add analytics tool');
            this.state[PROPS.isToolMenuOpen] = false;
            this.render();
        });
        let searchButton = this.newToolButton('addSearchToolButton', 'searchDigitalThread', src.search, 5, this.toolsContainer, () => {
            console.log('add search tool');
            this.state[PROPS.isToolMenuOpen] = false;
            this.render();
        });

        this.registerChild(this.toolsContainer, [
            PROPS.isLocalizedWithinWorld,
            PROPS.isEnvelopeOpen,
            PROPS.isToolMenuOpen,
            PROPS.isAnyEnvelopeFocused,
            PROPS.isTrashZoneShown,
            PROPS.isExitModalOpen
        ], (element) => {
            element.style.display = this.state[PROPS.isTrashZoneShown] ? 'none' : '';
            [drawButton, chatButton, videoButton, analyticsButton, searchButton].forEach(elt => {
                if (!elt) return;
                if (this.state[PROPS.isLocalizedWithinWorld] && !this.state[PROPS.isExitModalOpen]) {
                    elt.classList.remove('addToolButtonDisabled');
                } else {
                    elt.classList.add('addToolButtonDisabled');
                }
            });
        });
    }
    //element parent added to function so both plus button and tool buttons could share code
    
    createToolButton(id, src, toolName) {
        let button = document.createElement('div');
        button.classList.add('addToolButton');
        button.style.pointerEvents = 'auto';
        if (toolName) {
            button.setAttribute('name', toolName);
        }
        if (id) {
            button.setAttribute('id', id);
        }
        let icon = document.createElement('img');
        icon.src = src;
        icon.classList.add('addToolButtonIcon');
        button.appendChild(icon);

        return button;
    }
    addToolButton(id, src, index, parent, onPressed) {
        let button = this.createToolButton(id, src);
        parent.appendChild(button);

        this.setupButtonVisualFeedback(button, 'introButtonPressed');

        button.addEventListener('click', (e) => {
            if (typeof onPressed === 'function') {
                onPressed(e);
            }
        });
        return button;
    }
    //add tool button for elements in tool container so click-and-dragging is possible
    newToolButton(id, toolName, src, index, parent, onPressed) {
        let button = this.createToolButton(id, src, toolName);
        parent.appendChild(button);
        
        //pointer boolean initialized here
        let isPointerDown = false;
        let startX = 0, startY = 0, startLeft = 0, startTop = 0;

        button.addEventListener('pointerdown', evt => {
            isPointerDown = true;

            //create ghost of button
            let draggedIcon = this.createToolButton(null, src, parent);
            draggedIcon.style.position = 'absolute';
            draggedIcon.style.opacity = '.75';
            draggedIcon.style.top = `${button.offsetTop}`;
            draggedIcon.style.left = `${button.offsetLeft}`;
            
            startX = evt.clientX;
            startY = evt.clientY;
            startLeft = button.offsetLeft;
            startTop = button.offsetTop;
            
            const pointermoveListener = evt => {
                evt.preventDefault();
                if (isPointerDown) {
                    parent.appendChild(draggedIcon);
                    draggedIcon.style.left = `${startLeft + evt.clientX - startX}px`;
                    draggedIcon.style.top = `${startTop + evt.clientY - startY}px`;
                }
            }
            const pointerupListener = evt => {
                evt.preventDefault();
                isPointerDown = false;
                if (startX === evt.clientX && startY === evt.clientY) {
                    realityEditor.spatialCursor.addToolAtScreenCenter(`${button.getAttribute('name')}`);
                } else {
                    realityEditor.spatialCursor.addToolAtSpecifiedCoords(`${button.getAttribute('name')}`, { screenX: evt.clientX, screenY: evt.clientY });
                }
                if (typeof onPressed === 'function') {
                    onPressed(evt);
                }
                document.removeEventListener('pointerup', pointerupListener);
                document.removeEventListener('pointermove', pointermoveListener);
                isPointerDown = false;
                parent.removeChild(draggedIcon);
            };
            document.addEventListener('pointermove', pointermoveListener);
            document.addEventListener('pointerup', pointerupListener);
        });
        return button;
    };
    setupCustomTrashZone() {
        let trashRect = {
            x: 0,
            y: window.innerHeight - TRASH_ZONE_HEIGHT,
            width: window.innerWidth,
            height: TRASH_ZONE_HEIGHT
        };
        realityEditor.device.layout.setTrashZoneRect(trashRect.x, trashRect.y, trashRect.width, trashRect.height);
        realityEditor.device.layout.onWindowResized(({width, height}) => {
            trashRect = {
                x: 0,
                y: window.innerHeight - TRASH_ZONE_HEIGHT,
                width: window.innerWidth,
                height: TRASH_ZONE_HEIGHT
            };
            realityEditor.device.layout.setTrashZoneRect(trashRect.x, trashRect.y, trashRect.width, trashRect.height);
        });

        const showTrashZone = () => {
            this.state[PROPS.isTrashZoneShown] = true;
            this.render()
        }
        const hideTrashZone = () => {
            this.state[PROPS.isTrashZoneShown] = false;
            this.render()
        }

        realityEditor.device.registerCallback('beginTouchEditing', showTrashZone);
        realityEditor.device.registerCallback('resetEditingState', hideTrashZone);
        realityEditor.gui.recentlyUsedBar.callbacks.onIconStartDrag.push(showTrashZone);
        realityEditor.gui.recentlyUsedBar.callbacks.onIconStopDrag.push(hideTrashZone);
        realityEditor.gui.envelopeIconRenderer.callbacks.onIconStartDrag.push(showTrashZone);
        realityEditor.gui.envelopeIconRenderer.callbacks.onIconStopDrag.push(hideTrashZone);

        let trashZoneBackdrop = document.createElement('div');
        let trashZoneIcon = document.createElement('img');
        trashZoneIcon.src = '/addons/pop-up-onboarding-addon/trash-zone-icon.svg';
        trashZoneIcon.style.width = TRASH_ZONE_HEIGHT + 'px';
        trashZoneIcon.style.height = TRASH_ZONE_HEIGHT + 'px';
        trashZoneBackdrop.appendChild(trashZoneIcon);
        trashZoneBackdrop.style.height = TRASH_ZONE_HEIGHT + 'px';
        trashZoneBackdrop.id = 'popupTrashZone';
        this.dom.appendChild(trashZoneBackdrop);

        this.registerChild(trashZoneBackdrop, [PROPS.isTrashZoneShown], (element) => {
            element.style.display = this.state[PROPS.isTrashZoneShown] ? '' : 'none';

            let addToolButton = document.querySelector('.addToolButton');
            let visibleToolMenu = document.querySelector('.visibleTools');
            let recentlyUsedToolIcons = document.querySelector('.ru-container');
            if (this.state[PROPS.isTrashZoneShown]) {
                // hide the tool adding and recently used bar
                if (addToolButton) addToolButton.classList.add('hiddenByTrash');
                if (visibleToolMenu) visibleToolMenu.classList.add('hiddenByTrash');
                if (recentlyUsedToolIcons) recentlyUsedToolIcons.classList.add('hiddenByTrash');
            } else {
                // stop hiding the tool adding and recently used bar
                if (addToolButton) addToolButton.classList.remove('hiddenByTrash');
                if (visibleToolMenu) visibleToolMenu.classList.remove('hiddenByTrash');
                if (recentlyUsedToolIcons) recentlyUsedToolIcons.classList.remove('hiddenByTrash');
            }
        });
    }
    addSettingsMenuButton() {
        let button = document.createElement('img');
        button.id = 'viewMenuButton';
        if (this.isEnvelopeOpen) {
            button.classList.add('offsetButtonForEnvelope');
        } else {
            button.classList.remove('offsetButtonForEnvelope');
        }
        button.src = '/addons/pop-up-onboarding-addon/settings-menu-icon.svg';
        this.dom.appendChild(button);
        this.setupButtonVisualFeedback(button, 'introButtonPressed');
        this.addClickEventListener(button, () => {
            this.viewManager.render(VIEWS.SETTINGS);
        });
        this.registerChild(button, [PROPS.isEnvelopeOpen], (element) => {
            element.style.display = this.state[PROPS.isEnvelopeOpen] ? 'none' : '';
        });
    }
    setupExitCard() {
        let innerHTML = `
                <h3 style='text-align: center;'>Are you sure?</h3>

                ${realityEditor.device.environment.isDesktop() ? '' :
                `<p class='bottom-30'>If you end a session that you've scanned,
                it may go offline for all other users until you open the session again.</p>`}
                `;

        let card = new PopUpModal(innerHTML, 'End Session', 'Cancel');

        if (realityEditor.device.environment.isDesktop()) {
            card.dom.style.height = '255px';
        }

        card.registerButtonCallback('confirmModalButton', ({button}) => {
            button.innerText = 'Ending...';

            // stop the Audio and Video streams
            sharedSessionState.turnOffVideo();
            sharedSessionState.turnOffMicrophone();

            setTimeout(() => {
                realityEditor.app.restartDeviceTracker();

                // check if we should go back to the metaverse-manager or just reload
                if (sharedSessionState.metaverseManagerCredentials) {
                    window.location = 'https://toolboxedge.net/metaverse-manager/';
                } else {
                    window.location = MANAGER_BASE_URL;
                }
            }, 500);
        });
        card.registerButtonCallback('cancelModalButton', () => {
            this.state[PROPS.isExitModalOpen] = false;
            this.render();
        });
        this.dom.appendChild(card.dom);

        this.registerChild(card.dom, [PROPS.isExitModalOpen], (element) => {
            element.style.display = this.state[PROPS.isExitModalOpen] ? '' : 'none';
        });
    }
    setupHelpAnimation() {
        let helpAnimationContainer = document.createElement('div');
        helpAnimationContainer.classList.add('dimmerView');
        this.dom.appendChild(helpAnimationContainer);

        let leftRightArrow = document.createElement('img');
        leftRightArrow.src = '/addons/pop-up-onboarding-addon/left-right-arrow-path-center.svg';
        leftRightArrow.classList.add('introScanHelpImage');
        leftRightArrow.classList.add('helpAnimationPath');
        helpAnimationContainer.appendChild(leftRightArrow);

        let phoneImage = document.createElement('img');
        phoneImage.src = '/addons/pop-up-onboarding-addon/hand-holding-phone.svg';
        phoneImage.classList.add('introScanHelpImage');
        phoneImage.classList.add('helpAnimationPhone');
        helpAnimationContainer.appendChild(phoneImage);

        this.registerChild(helpAnimationContainer, [
            PROPS.isReadyForLocalization,
            PROPS.isLocalizedWithinWorld,
            PROPS.isExitModalOpen
        ], (element) => {
            if (this.state[PROPS.isReadyForLocalization] && !this.state[PROPS.isLocalizedWithinWorld] && !this.state[PROPS.isExitModalOpen]) {
                element.style.display = '';
            } else {
                element.style.display = 'none';
            }
        });
    }
    setupHelpText() {
        let div = document.createElement('div');
        div.classList.add('introScanHelpText');
        this.dom.appendChild(div);

        this.registerChild(div, [
            PROPS.isReadyForLocalization,
            PROPS.isLocalizedWithinWorld,
            PROPS.isExitModalOpen,
            PROPS.didRecentlyLocalizeWithinWorld
        ], (element) => {
            if (!this.state[PROPS.isLocalizedWithinWorld] && !this.state[PROPS.isExitModalOpen]) {
                if (this.state[PROPS.isReadyForLocalization]) {
                    if (!browser) {
                        element.style.display = '';
                        element.innerText = 'Look Around To Localize';
                    }
                } else if (this.state[PROPS.didFindWorld]) {
                    element.style.display = '';
                    element.innerHTML = `Scan Is Loading...<br/>Please Wait.`;
                }
            } else if (!browser && this.state[PROPS.isLocalizedWithinWorld] && !this.state[PROPS.isExitModalOpen] && this.state[PROPS.didRecentlyLocalizeWithinWorld]) {
                element.style.display = '';
                element.innerText = `Successfully Localized!`;
            } else {
                element.style.display = 'none';
            }
        });
    }
    setupQueuedMessageText() {
        let div = document.createElement('div');
        div.id = 'queuedMessageText';
        div.classList.add('introScanHelpText');
        div.style.top = '90px';
        div.style.lineHeight = '54px';
        div.style.height = '54px';
        div.style.fontSize = '16px';
        div.style.verticalAlign = 'middle';
        this.dom.appendChild(div);

        this.registerChild(div, [PROPS.currentMessage], (element) => {
            if (this.state[PROPS.currentMessage].text) {
                element.style.display = '';
                div.innerText = this.state[PROPS.currentMessage].text;
            } else {
                element.style.display = 'none';
            }
        });
    }
    addQueuedMessage(text, lifeTime) {
        this.queuedMessages.push({
            text,
            lifeTime
        });
    }
    // periodically check if we should expire the current message and show the next one
    processQueuedMessages() {
        let readyForNextMessage = !this.state[PROPS.currentMessage] ||
            !this.state[PROPS.currentMessage].text ||
            !this.state[PROPS.currentMessage].startTime ||
            this.state[PROPS.currentMessage].startTime + this.state[PROPS.currentMessage].lifeTime < Date.now();

        if (readyForNextMessage) {
            this.state[PROPS.currentMessage] = {
                text: null,
                startTime: null,
                lifeTime: null
            }
            if (this.queuedMessages && this.queuedMessages.length > 0) {
                let nextMessage = this.queuedMessages.shift();
                this.state[PROPS.currentMessage] = {
                    text: nextMessage.text,
                    startTime: Date.now(),
                    lifeTime: nextMessage.lifeTime || 3000
                }
            }
            this.render();
        }
    }
}
