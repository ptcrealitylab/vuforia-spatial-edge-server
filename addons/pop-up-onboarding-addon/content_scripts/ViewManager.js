/*
* Copyright © 2021 PTC
*/

import { MenuView } from './MenuView.js';
import { JoinView } from './JoinView.js';
import { MainARView } from './MainARView.js';
import { MainMenuView } from './MainMenuView.js';
import { ScanView } from './ScanView.js';
import { FinalizeScanView } from './FinalizeScanView.js';
import { SettingsView } from './SettingsView.js';
import { ShareView } from './ShareView.js';
import { TutorialView } from './TutorialView.js';

export const VIEWS = Object.freeze({
    APP_ENTRY_POINT: 'APP_ENTRY_POINT',
    MAIN_MENU: 'MAIN_MENU',
    SCAN: 'SCAN',
    FINALIZE_SCAN: 'FINALIZE_SCAN',
    JOIN: 'JOIN',
    MAIN_AR: 'MAIN_AR',
    SETTINGS: 'SETTINGS',
    SHARE: 'SHARE',
    TUTORIAL: 'TUTORIAL'
});

export class ViewManager {
    constructor(parent) {
        this.currentView = VIEWS.APP_ENTRY_POINT;
        this.viewInstances = {};

        this.dom = document.createElement('div');
        this.dom.id = 'viewManagerContainer';
        this.dom.style.position = 'absolute';
        this.dom.style.left = '0';
        this.dom.style.top = '0';
        this.dom.style.zIndex = '1100';
        parent.appendChild(this.dom);
    }
    render(viewName) {
        let previousView = this.getViewInstance(this.currentView);
        let newView = this.getViewInstance(viewName);
        this.currentView = viewName;

        if (previousView && previousView.isVisible && newView !== previousView) {
            previousView.hide(newView);
        }
        if (newView) {
            if (!newView.isVisible) {
                newView.show(previousView.VIEW_NAME);
            }
            newView.render();
        }
    }
    getViewInstance(viewName) {
        let existingView = this.viewInstances[viewName];
        if (existingView) {
            return existingView;
        }

        if (viewName === VIEWS.MAIN_MENU) {
            this.viewInstances[viewName] = new MainMenuView(this);
        } else if (viewName === VIEWS.SCAN) {
            this.viewInstances[viewName] = new ScanView(this);
        } else if (viewName === VIEWS.FINALIZE_SCAN) {
            this.viewInstances[viewName] = new FinalizeScanView(this);
        } else if (viewName === VIEWS.JOIN) {
            this.viewInstances[viewName] = new JoinView(this);
        } else if (viewName === VIEWS.MAIN_AR) {
            this.viewInstances[viewName] = new MainARView(this);
        } else if (viewName === VIEWS.SETTINGS) {
            this.viewInstances[viewName] = new SettingsView(this);
        } else if (viewName === VIEWS.SHARE) {
            this.viewInstances[viewName] = new ShareView(this);
        } else if (viewName === VIEWS.TUTORIAL) {
            this.viewInstances[viewName] = new TutorialView(this);
        } else if (viewName === VIEWS.APP_ENTRY_POINT) {
            this.viewInstances[viewName] = new MenuView(this); // we add a blank view to serve as the entry point
            this.viewInstances[viewName].dom.style.pointerEvents = 'none'; // make sure this is never interactable
        }

        // enables show(previousViewName), to check which view you transitioned from
        this.viewInstances[viewName].VIEW_NAME = viewName;

        this.viewInstances[viewName].dom.id = 'MenuView_' + viewName;

        return this.viewInstances[viewName];
    }
}
