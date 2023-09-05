/*
* Copyright © 2021 PTC
*/

import { VIEWS } from './ViewManager.js';
import { MenuView } from './MenuView.js';

export class MainMenuView extends MenuView {
    constructor(viewManager) {
        super(viewManager);
    }
    render() {
        super.render();

        realityEditor.device.environment.variables.suppressObjectRendering = true;

        this.viewManager.selectedServerIP = null; // reset state
        this.viewManager.isActivelyScanning = false;
        this.viewManager.isScanFinishing = false;

        if (realityEditor.device.environment.variables.supportsAreaTargetCapture) {
            realityEditor.app.promises.doesDeviceHaveDepthSensor().then(supportsCapture => {
                this.renderButtons(supportsCapture);
            });
        } else {
            this.renderButtons(false);
        }
    }
    renderButtons(supportsCapture) {
        if (supportsCapture) {
            let createSpaceButton = this.addDarkButton('createSpace', 'Create a Space', this.dom, () => {
                this.viewManager.render(VIEWS.SCAN);
            });
            createSpaceButton.style.top = 'calc(50vh - 55px)';
            this.setupButtonVisualFeedback(createSpaceButton, 'introButtonPressed');
        } else {
            realityEditor.device.environment.variables.supportsAreaTargetCapture = false;
        }

        let joinSpaceButton = this.addDarkButton('joinSpace', 'Join a Space', this.dom, () => {
            this.viewManager.render(VIEWS.JOIN);
        });
        /* DEBUG BUTTON: COMMENT OUT WHEN COMPLETE */
            // let debugButton = this.addDarkButton('debugView', 'Debug View', this.dom, () => {
            //     this.viewManager.render(VIEWS.MAIN_AR);
            // });
            // debugButton.style.top = 'calc(50vh - 160px)';
        /* --------------------------------------------- */
        if (supportsCapture) {
            joinSpaceButton.style.top = 'calc(50vh + 55px)';
        } else {
            joinSpaceButton.style.top = 'calc(50vh - 36px)'; // center vertically on screen if no create button
        }
        this.setupButtonVisualFeedback(joinSpaceButton, 'introButtonPressed');
    }
}
