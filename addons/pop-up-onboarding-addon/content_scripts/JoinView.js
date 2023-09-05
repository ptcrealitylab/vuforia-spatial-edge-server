/*
* Copyright © 2021 PTC
*/

import { VIEWS } from './ViewManager.js';
import { MenuView } from './MenuView.js';
import { sharedSessionState } from './SessionState.js';

/**
 * The entirety of the properties that are needed to render the UI state, at any moment in time,
 * are stored in this.state. All the properties that are part of this.state are enumerated here.
 */
const PROPS = Object.freeze({
    scrollY: 'scrollY',
    isSearching: 'isSearching',
    firstSecondPassed: 'firstSecondPassed',
    spaceFound: 'spaceFound',
    spacesFound: 'spacesFound',
    numberOfSearchesLeft: 'numberOfSearchesLeft'
});

export class JoinView extends MenuView {
    constructor(viewManager) {
        super(viewManager);
        this.timeouts = [];
        this.isScrolling = false;
        this.prevY = null;

        this.state[PROPS.scrollY] = 0;
        this.state[PROPS.isSearching] = true;
        this.state[PROPS.firstSecondPassed] = false;
        this.state[PROPS.spaceFound] = false;
        this.state[PROPS.spacesFound] = [];
        this.state[PROPS.numberOfSearchesLeft] = 10;
        
        this.createDom();

        // refresh the UI if we detect a new server
        realityEditor.network.discovery.onServerDetected(() => {
            if (!this.isVisible) { return; }
            this.viewManager.render(VIEWS.JOIN);
        });
    }
    createDom() {
        this.setupScrollView();
        let backButton = this.addBackButton(VIEWS.MAIN_MENU);
        backButton.addEventListener('pointerdown', () => {
            if (this.backButtonExitsEntirely) {
                window.location = 'https://toolboxedge.net/metaverse-manager/';
            }
        });

        let searchCard = this.addSearchCard();
        this.scrollView.appendChild(searchCard);
        this.registerChild(searchCard, [PROPS.isSearching, PROPS.firstSecondPassed], () => {
            if (this.state[PROPS.isSearching] || !this.state[PROPS.firstSecondPassed]) {
                searchCard.style.display = '';
            } else {
                searchCard.style.display = 'none';
            }
        });

        let noSpacesCard = this.addNoSpacesCard();
        this.scrollView.appendChild(noSpacesCard);
        this.registerChild(searchCard, [PROPS.isSearching, PROPS.spaceFound], () => {
            if (this.state[PROPS.isSearching] || this.state[PROPS.spaceFound]) {
                noSpacesCard.style.display = 'none';
            } else {
                noSpacesCard.style.display = '';
            }
        });

        let createCard = this.addCreateCard();
        this.scrollView.appendChild(createCard);
        this.registerChild(searchCard, [PROPS.isSearching, PROPS.spaceFound], () => {
            if (this.state[PROPS.isSearching] || this.state[PROPS.spaceFound]) {
                createCard.style.display = 'none';
            } else {
                createCard.style.display = '';
            }
        });
    }
    show(previousViewName) {
        super.show();

        this.state[PROPS.isSearching] = true;
        this.state[PROPS.firstSecondPassed] = false;
        this.state[PROPS.spaceFound] = false;
        this.state[PROPS.spacesFound] = [];
        this.state[PROPS.numberOfSearchesLeft] = 10;

        this.backButtonExitsEntirely = previousViewName === VIEWS.APP_ENTRY_POINT;

        this.timeouts.push(setTimeout(() => {
            this.updateSearch();
        }, 1000));

    }
    setupScrollView() {
        let scrollView = document.createElement('div');
        scrollView.id = 'joinScrollView';
        this.dom.appendChild(scrollView);
        this.scrollView = scrollView;

        let topGap = document.createElement('div');
        topGap.style.height = '115px';
        this.scrollView.appendChild(topGap);

        let bottomGap = document.createElement('div');
        bottomGap.style.height = '30px';
        this.scrollView.appendChild(bottomGap);

        this.registerChild(scrollView, [PROPS.scrollY, PROPS.spaceFound, PROPS.spacesFound], () => {
            scrollView.scrollTop = this.state[PROPS.scrollY];
            
            // TODO: separate this logic from the scrollY logic
            // scrollView.innerHTML = '';
            // remove and re-add all join cards
            let existingJoinCards = scrollView.getElementsByClassName('joinCard');
            while (existingJoinCards[0]) {
                existingJoinCards[0].parentNode.removeChild(existingJoinCards[0]);
            }

            if (this.state[PROPS.spaceFound]) {
                let detectedWorldObjects = this.getDetectedWorldObjects();
                let includeIdentifiers = true; // detectedWorldObjects.length > 1;
                detectedWorldObjects.forEach((objectInfo, index) => {
                    let name = objectInfo.metadata.name;
                    let id = objectInfo.heartbeat.id;
                    let ip = objectInfo.heartbeat.ip;
                    this.addJoinCard(name, id, ip, index, includeIdentifiers);
                });
            }

            this.scrollView.appendChild(bottomGap); // make sure bottom gap stays at the bottom
        });

        scrollView.addEventListener('pointerdown', (e) => {
            this.isScrolling = true;
            this.prevY = e.pageY;
        });

        scrollView.addEventListener('pointerup', () => {
            this.isScrolling = false
        });

        scrollView.addEventListener('pointercancel', () => {
            this.isScrolling = false;
        });

        document.addEventListener('pointermove', (e) => {
            if (this.isScrolling) {
                let dY = e.pageY - this.prevY;
                this.state[PROPS.scrollY] -= dY;
                // scrollView.scrollTop -= dY;
                this.prevY = e.pageY;
                this.render();
                // this.updateScrollShadows(scrollView);
            }
        });

        // scrollView.addEventListener('scroll', () => {
        //     console.log('scrollView was scrolled');
        // });
    }
    hide() {
        super.hide();
        this.timeouts.forEach((timeout) => {
            clearTimeout(timeout);
        });
    }
    getDetectedWorldObjects() {
        let designatedWorld = sharedSessionState.designatedEdgeServerIp;
        return realityEditor.network.discovery.getDetectedObjectsOfType('world').filter(objectInfo => {
            if (designatedWorld && objectInfo.heartbeat.ip !== designatedWorld) {
                return false; // if the metaverse manager is configured with a specific IP, only consider those
            }
            let isLocalWorld = objectInfo.heartbeat.id === realityEditor.worldObjects.getLocalWorldId();
            let isDeviceWorld = objectInfo.heartbeat.ip === '127.0.0.1';
            return !isLocalWorld && !isDeviceWorld;
        });
    }
    updateSearch() {
        let detectedWorldObjects = this.getDetectedWorldObjects();
        this.state[PROPS.spaceFound] = detectedWorldObjects.length > 0;
        this.state[PROPS.spacesFound] = detectedWorldObjects;

        this.state[PROPS.firstSecondPassed] = true;

        this.state[PROPS.numberOfSearchesLeft] -= 1;
        if (this.state[PROPS.numberOfSearchesLeft] > 0) {
            this.timeouts.push(setTimeout(() => {
                this.updateSearch();
            }, 1000));
            this.state[PROPS.isSearching] = true;
        } else {
            this.state[PROPS.isSearching] = false;
        }

        this.render();
    }
    render() {
        super.render({ newRendering: true });
    }
    addSearchCard() {
        let searchCard = this.addCard();
        let searchCardText = document.createElement('div');
        searchCardText.innerHTML =
            'Searching local Wi-Fi Network' + '<br>' +
            'for possible Spaces to join...';
        searchCard.classList.add('searchCard');
        searchCardText.style.paddingTop = '20px';
        searchCard.appendChild(searchCardText);
        let searchCardLoaderContainer = document.createElement('div');
        searchCardLoaderContainer.style.paddingTop = '20px';
        let searchCardLoader = document.createElement('div');
        searchCardLoader.classList.add('loader');
        searchCardLoaderContainer.appendChild(searchCardLoader);
        searchCard.appendChild(searchCardLoaderContainer);
        // searchCard.style.top = '130px';
        return searchCard;
    }
    addJoinCard(name, id, ip, index, includeIdentifier) {
        const HEIGHT = 220;
        const MARGIN = 30;
        let joinCard = this.addCard();
        joinCard.classList.add('joinCard');
        this.scrollView.appendChild(joinCard);
        let joinCardText = document.createElement('div');
        joinCardText.innerHTML = 'Space Found!';
        if (includeIdentifier) {
            let identifier = (ip === '127.0.0.1' || ip === 'localhost') ? 'Local Scan' : ip;
            joinCardText.innerHTML += '<br/>';
            joinCardText.innerHTML += '(' + identifier + ')';
        }
        joinCardText.style.top = '15px';
        joinCardText.style.position = 'absolute';
        joinCardText.style.width = 'calc(100% - 20px)';
        joinCardText.style.left = '10px';
        joinCard.appendChild(joinCardText);
        // joinCard.style.top = 130 + (index * (MARGIN + HEIGHT)) + 'px';
        joinCard.style.height = HEIGHT + 'px';
        let joinSpaceButton = this.addDarkButton('joinSpace', 'Join', joinCard, () => {
            realityEditor.network.discovery.setPrimaryWorld(ip, id);
            this.viewManager.render(VIEWS.MAIN_AR);
        });
        this.setupButtonVisualFeedback(joinSpaceButton, 'introButtonPressed');
        joinSpaceButton.style.top = '126px';
        joinSpaceButton.style.left = '20px';
        return joinCard;
    }
    addNoSpacesCard() {
        let noSpacesCard = this.addCard();
        noSpacesCard.classList.add('searchCard');
        this.scrollView.appendChild(noSpacesCard);
        let noSpacesText = document.createElement('div');
        noSpacesText.innerHTML =
            'No Spaces were found in this' + '<br>' +
            'Wi-Fi Network.';
        noSpacesText.style.top = '15px';
        noSpacesText.style.position = 'absolute';
        noSpacesText.style.width = 'calc(100% - 20px)';
        noSpacesText.style.left = '10px';
        noSpacesCard.appendChild(noSpacesText);
        // noSpacesCard.style.top = '130px';
        // noSpacesCard.style.height = '130px';
        return noSpacesCard;
    }
    addCreateCard() {
        let createCard = this.addCard();
        createCard.classList.add('createCard');
        this.scrollView.appendChild(createCard);
        let createCardText = document.createElement('div');
        createCardText.innerHTML =
            'Would you like to create a' + '<br>' +
            'Space instead?';
        createCardText.style.top = '15px';
        createCardText.style.position = 'absolute';
        createCardText.style.width = 'calc(100% - 20px)';
        createCardText.style.left = '10px';
        createCard.appendChild(createCardText);
        // createCard.style.top = '275px';
        createCard.classList.add('searchCard');
        createCard.style.height = '220px';
        let createSpaceButton = this.addDarkButton('createSpace', 'Create', createCard, () => {
            this.viewManager.render(VIEWS.SCAN);
        });
        this.setupButtonVisualFeedback(createSpaceButton, 'introButtonPressed');
        createSpaceButton.style.top = '126px';
        createSpaceButton.style.left = '20px';
        return createCard;
    }
}
