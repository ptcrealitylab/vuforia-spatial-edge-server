/*
* Copyright © 2023 PTC
*/

import { UIComponent } from './UIComponent.js';
import { sharedSessionState } from './SessionState.js';

const EDGE_MARGIN = 10;
const GAP_BETWEEN_BUTTONS = 30;
const BUTTON_HEIGHT = 60;

// the "kebab" menu (named after the three vertical dots when it's collapsed) can have various
// buttons added to its expanded state in a column, and can be opened and closed.
export class KebabMenu extends UIComponent {
    constructor(parent) {
        super();
        
        this.buttons = {};
        this.callbacks = {};

        this.dom = this.constructDom();
        this.menuBackground = document.createElement('div');
        this.expandButton = document.createElement('img');
        parent.appendChild(this.dom);

        this.dom.style.transition = 'all 0.2s';
        this.menuBackground.style.transition = 'all 0.2s';

        this.isParentLocalized = false;
        this.hasExpanded = false;
        this.collapse();
    }
    constructDom() {
        let menuContainer = document.createElement('div');
        menuContainer.id = 'sessionMenuContainer';

        this.addButton({
            id: 'sessionMenuCloseButton',
            src: '/addons/pop-up-onboarding-addon/session-menu-x.svg',
            onClick: () => {
                this.collapseAnim();
            }
        });

        if (!realityEditor.device.environment.isDesktop()) {
            this.addButton({
                id: 'sessionMenuCameraButton',
                src: '/addons/pop-up-onboarding-addon/session-menu-video-on.svg',
                toggles: true,
                defaultToggleState: sharedSessionState.isSharingVideo,
                toggledOffSrc: '/addons/pop-up-onboarding-addon/session-menu-video-off.svg',
                label: 'Video'
            });
        }

        this.addButton({
            id: 'sessionMenuMicrophoneButton',
            src: '/addons/pop-up-onboarding-addon/session-menu-microphone-on.svg',
            toggles: true,
            defaultToggleState: sharedSessionState.isMicrophoneOn,
            toggledOffSrc: '/addons/pop-up-onboarding-addon/session-menu-microphone-off.svg',
            label: 'Audio'
        });

        this.addButton({
            id: 'sessionMenuInviteButton',
            src: '/addons/pop-up-onboarding-addon/session-menu-invite.svg',
            label: 'Invite'
        });

        this.addButton({
            id: 'sessionMenuEndButton',
            src: '/addons/pop-up-onboarding-addon/session-menu-end.svg',
            label: 'End Session',
            onClick: () => {
                this.collapseAnim();
            }
        });

        let NUM_BUTTONS = Object.keys(this.buttons).length;
        this.MENU_HEIGHT = NUM_BUTTONS * (BUTTON_HEIGHT + GAP_BETWEEN_BUTTONS) + 2 * EDGE_MARGIN - GAP_BETWEEN_BUTTONS;
        menuContainer.style.height = this.MENU_HEIGHT + 'px';

        return menuContainer;
    }
    addButton({id, toggles, defaultToggleState, src, toggledOffSrc, onClick, label}) {
        if (this.buttons[id]) return; // already added this button

        this.buttons[id] = {
            toggles: toggles,
            isToggled: defaultToggleState,
            src: src,
            toggledOffSrc: toggledOffSrc
        };

        let button = document.createElement('img');
        button.id = id;
        button.classList.add('sessionMenuButton');
        button.src = (!toggles || defaultToggleState) ? src : toggledOffSrc;

        let index = Object.keys(this.buttons).length - 1;
        button.style.top = (EDGE_MARGIN + (BUTTON_HEIGHT + GAP_BETWEEN_BUTTONS) * index) + 'px';

        if (label) {
            this.buttons[id].labelDom = document.createElement('div');
            this.buttons[id].labelDom.innerText = label;
            this.buttons[id].labelDom.classList.add('sessionMenuButtonLabel');
            this.buttons[id].labelDom.style.top = button.style.top;
        }

        this.setupButtonVisualFeedback(button, 'introButtonPressed');
        // Update the visual state of the button without invoking any other
        // side effects
        this.buttons[id].updateToggleVisuals = () => {
            button.src = this.buttons[id].isToggled ? src : toggledOffSrc;
        };
        this.addClickEventListener(button, () => {
            if (toggles) {
                this.buttons[id].isToggled = !this.buttons[id].isToggled;
                button.src = this.buttons[id].isToggled ? src : toggledOffSrc;
            }
            if (onClick) {
                onClick(this.buttons[id].isToggled);
            }
            this.triggerButtonCallbacks(id, { button: button, toggleState: this.buttons[id].isToggled });
        });

        this.buttons[id].dom = button;
    }
    expand() {
        if (this.hasExpanded) return;
        // console.log('%c expand!', 'color: red');

        //this.dom.innerHTML = '';

        let NUM_BUTTONS = Object.keys(this.buttons).length;
        let MENU_HEIGHT = NUM_BUTTONS * (BUTTON_HEIGHT + GAP_BETWEEN_BUTTONS) + 2 * EDGE_MARGIN - GAP_BETWEEN_BUTTONS;
        
        this.menuBackground.id = 'sessionMenuBackground';
        this.menuBackground.style.height = MENU_HEIGHT + 'px';
        this.dom.appendChild(this.menuBackground);

        Object.values(this.buttons).forEach(elt => {
            this.menuBackground.appendChild(elt.dom);
            if (elt.labelDom) {
                this.dom.appendChild(elt.labelDom);
            }
        });
        this.expandAnim();
    }
    expandAnim() {
        // console.log('%c expand anim played', 'color: red');
        this.expandButton.style.visibility = 'hidden';
        this.dom.style.height = this.MENU_HEIGHT;
        this.dom.style.visibility = 'visible';
        this.menuBackground.style.height = this.MENU_HEIGHT;
        this.menuBackground.style.visibility = 'visible';
    }
    collapse() {
        // console.log('%c collapse!', 'color: blue');

        this.dom.innerHTML = '';
        
        this.expandButton.id = 'sessionMenuExpandButton';
        this.expandButton.classList.add('expand-button');
        this.expandButton.src = '/addons/pop-up-onboarding-addon/session-menu-icon.svg';
        this.expandButton.style.visibility = 'visible';
        this.dom.appendChild(this.expandButton);
        this.setupButtonVisualFeedback(this.expandButton, 'introButtonPressed');
        this.addClickEventListener(this.expandButton, () => {
            if (this.hasExpanded || this.isParentLocalized) {
                this.expandAnim();
            } else {
                this.expand();
                this.hasExpanded = true;
            }
        });
    }
    collapseAnim() {
        // console.log('%c collapse anim played', 'color: blue');
        this.dom.style.height = '80px';
        this.dom.style.visibility = 'hidden';
        this.menuBackground.style.height = '80px';
        this.menuBackground.style.visibility = 'hidden';
        this.expandButton.style.visibility = 'visible';
    }
}
