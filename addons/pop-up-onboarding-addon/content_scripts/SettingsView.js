/*
* Copyright © 2021 PTC
*/

import { VIEWS } from './ViewManager.js';
import { MenuView } from './MenuView.js';
import { sharedSessionState } from './SessionState.js';

const SETTINGS = Object.freeze({
    VIRTUALIZER_MODE: 'Share Video',
    MICROPHONE_MODE: 'Share Audio',
    HUMAN_TRACKING_MODE: 'Track Humans',
    STATIONARY_DEVICE_MODE: 'Stationary Device',
    ALWAYS_SHOW_TUTORIAL: 'Show Tutorial Screen',
    ADVANCED_MODE: 'Advanced Mode', // not implemented yet
});

export class SettingsView extends MenuView {
    constructor(viewManager) {
        super(viewManager);
        this.rowsAdded = 0;
        this.currentState = {};
    }
    render() {
        super.render();
        realityEditor.device.environment.variables.suppressObjectRendering = true;

        this.rowsAdded = 0;

        this.dom.classList.add('introViewOpaque');
        this.dom.classList.add('aboveButtons');

        this.addBackButton(VIEWS.MAIN_AR);
        this.addSettingsTitle();
        let container = this.addScrollContainer();

        // this.addToggle(SETTINGS.ADVANCED_MODE, this.currentState[SETTINGS.ADVANCED_MODE], container, (value) => {
        //     console.log('toggled, advanced mode', value);
        // });

        let micToggle = this.addToggle(SETTINGS.MICROPHONE_MODE, sharedSessionState.isMicrophoneOn, container, (newValue) => {
            if (newValue) {
                sharedSessionState.turnOnMicrophone();
            } else {
                sharedSessionState.turnOffMicrophone();
            }
        });

        if (!realityEditor.device.environment.isDesktop()) {
            this.addToggle(SETTINGS.VIRTUALIZER_MODE, sharedSessionState.isSharingVideo, container, (newValue) => {
                if (newValue) {
                    sharedSessionState.turnOnVideo();
                } else {
                    sharedSessionState.turnOffVideo();
                }
                // also update the mic toggle to reflect the current state
                this.updateToggle(micToggle, sharedSessionState.isMicrophoneOn);
            });

            this.addToggle(SETTINGS.HUMAN_TRACKING_MODE, sharedSessionState.humanTrackingEnabled, container, (newValue) => {
                if (newValue) {
                    sharedSessionState.enableHumanTracking();
                } else {
                    sharedSessionState.disableHumanTracking();
                }
            });
            this.addToggle(SETTINGS.STATIONARY_DEVICE_MODE, sharedSessionState.stationaryDeviceEnabled, container, (newValue) => {
                if (newValue) {
                    sharedSessionState.enableStationaryDevice();
                } else {
                    sharedSessionState.disableStationaryDevice();
                }
            });
        }

        // let savedTutorialState = JSON.parse(window.localStorage.getItem('ALWAYS_SHOW_TUTORIAL') || 'false');
        // this.addToggle(SETTINGS.ALWAYS_SHOW_TUTORIAL, savedTutorialState, container, (value) => {
        //     window.localStorage.setItem('ALWAYS_SHOW_TUTORIAL', JSON.stringify(value));
        // });
    }
    addSettingsTitle() {
        let title = document.createElement('div');
        title.classList.add('viewTitleText');
        title.innerText = 'Settings';
        title.style.top = '100px';
        this.dom.appendChild(title);
    }
    addScrollContainer() {
        let container = document.createElement('div');
        container.classList.add('settingsScrollContainer');
        this.dom.appendChild(container);
        return container;
    }
    addToggle(labelText, defaultValue, parent, callback) {
        let container = document.createElement('div');
        container.classList.add('settingsViewToggleContainer');
        parent.appendChild(container);

        if (this.rowsAdded % 2 === 1) {
            container.classList.add('settingsRowOdd');
        }
        this.rowsAdded++;

        let label = document.createElement('div');
        label.classList.add('settingsViewToggleLabel');
        label.innerText = labelText;
        container.appendChild(label);

        let toggleState = defaultValue;
        let toggle = document.createElement('img');
        if (toggleState) {
            toggle.src = '/addons/pop-up-onboarding-addon/settings-toggle-on.svg';
        } else {
            toggle.src = '/addons/pop-up-onboarding-addon/settings-toggle-off.svg';
        }
        toggle.classList.add('settingsViewToggle');
        container.appendChild(toggle);
        toggle.addEventListener('pointerdown', () => {
            toggleState = !toggleState;
            if (toggleState) {
                toggle.src = '/addons/pop-up-onboarding-addon/settings-toggle-on.svg';
            } else {
                toggle.src = '/addons/pop-up-onboarding-addon/settings-toggle-off.svg';
            }
            this.currentState[labelText] = toggleState;
            if (typeof callback === 'function') {
                callback(toggleState);
            }
        });
        return container;
    }
    updateToggle(toggleContainer, newState) {
        if (!toggleContainer) return;
        let toggle = toggleContainer.querySelector('.settingsViewToggle');
        if (!toggle) return;
        if (newState) {
            toggle.src = '/addons/pop-up-onboarding-addon/settings-toggle-on.svg';
        } else {
            toggle.src = '/addons/pop-up-onboarding-addon/settings-toggle-off.svg';
        }
    }
}
