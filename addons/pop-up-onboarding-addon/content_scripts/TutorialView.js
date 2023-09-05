/*
* Copyright © 2021 PTC
*/

import { VIEWS } from './ViewManager.js';
import { MenuView } from './MenuView.js';

export class TutorialView extends MenuView {
    constructor(viewManager) {
        super(viewManager);

        this.titleText = 'Welcome to the\n' +
            'Pop-Up Metaverse!';

        this.bullets = {
            'Holoportation': {
                description: 'Scan your surroundings, text a link,\n' +
                    'and start collaborating in 3D!',
                icon: '/addons/pop-up-onboarding-addon/holoportation-icon.svg'
            },
            'Join from a Web Browser': {
                description: 'Your team can join you from a laptop to\n' +
                    'see a birds-eye view of the action.',
                icon: '/addons/pop-up-onboarding-addon/remote-access-icon.svg'
            },
            'Chat, Draw, and Record': {
                description: 'Draw in AR, record 2D or 3D videos,\n' +
                    'and more!',
                icon: '/addons/pop-up-onboarding-addon/chat-draw-record-icon.svg'
            }
        };
    }
    render() {
        super.render();
        realityEditor.device.environment.variables.suppressObjectRendering = true;

        this.dom.classList.add('introViewOpaque');

        // this.addSkipButton(VIEWS.MAIN_MENU);
        this.addTitle();
        this.addBullets();
        this.addNextButton();
    }
    addSkipButton(viewOnClicked) {
        let button = document.createElement('div');
        button.id = 'viewSkipButton';
        button.classList.add('topRightCornerButton');
        this.dom.appendChild(button);
        button.innerText = 'skip';

        button.addEventListener('pointerdown', () => {
            this.viewManager.render(viewOnClicked);
        });

        return button;
    }
    addImage(currentPage) {
        let image = document.createElement('img');
        image.classList.add('tutorialImage');
        image.src = this.images[currentPage];
        image.style.top = '70px';
        image.style.height = 'calc(100vh - 70px - 320px)';
        this.dom.appendChild(image);
    }
    addTitle() {
        let title = document.createElement('div');
        title.classList.add('viewTitleText');
        title.innerText = this.titleText;
        title.style.top = '85px';
        this.dom.appendChild(title);
    }
    addBullets() {
        let container = document.createElement('div');
        container.classList.add('tutorialBulletsContainer');
        this.dom.appendChild(container);
        let top = 0;
        for (const [title, info] of Object.entries(this.bullets)) {
            container.appendChild(this.createBullet(title, info.description, info.icon, top));
            top += 160;
        }
    }
    createBullet(title, description, icon, top) {
        let bulletContainer = document.createElement('div');
        bulletContainer.classList.add('tutorialBullet');
        bulletContainer.style.top = top + 'px';

        let bulletTitle = document.createElement('div');
        bulletTitle.classList.add('bulletTitle');
        bulletTitle.innerText = title;
        bulletContainer.appendChild(bulletTitle);

        let bulletDescription = document.createElement('div');
        bulletDescription.classList.add('bulletDescription');
        bulletDescription.innerText = description;
        bulletContainer.appendChild(bulletDescription);

        let bulletIcon = document.createElement('img');
        bulletIcon.classList.add('bulletIcon');
        bulletIcon.src = icon;
        bulletContainer.appendChild(bulletIcon);

        return bulletContainer;
    }
    addNextButton() {
        let button = this.addDarkButton('nextTutorialButton', 'Start', this.dom, () => {
            this.viewManager.render(VIEWS.MAIN_MENU);
        });
        button.classList.add('introButtonColorAccent');
        button.style.bottom = '70px';
        button.style.height = '60px';
        button.style.lineHeight = '60px';
        button.style.fontSize = '22px';

        this.setupButtonVisualFeedback(button, 'introButtonPressed');

        let dontShowAgainButton = document.createElement('div');
        dontShowAgainButton.id = 'dontShowAgainButton';
        this.dom.appendChild(dontShowAgainButton);
        dontShowAgainButton.innerText = 'Don\'t Show Again';

        this.setupButtonVisualFeedback(dontShowAgainButton, 'introButtonPressed');

        this.addClickEventListener(dontShowAgainButton, () => {
            this.viewManager.render(VIEWS.MAIN_MENU);
            window.localStorage.setItem('dontShowPopUpTutorial', JSON.stringify(true));
            window.localStorage.setItem('ALWAYS_SHOW_TUTORIAL', JSON.stringify(false)); // reset the settings menu, too
        });
    }
    addProgressDots(currentPage) {
        let image = document.createElement('img');
        image.classList.add('tutorialProgressDots');
        image.src = '/addons/pop-up-onboarding-addon/progress-dots-' + currentPage + '-of-4.svg';
        image.style.bottom = '25px';
        image.style.height = '12px';
        this.dom.appendChild(image);
    }
    show() {
        super.show();
    }
}
