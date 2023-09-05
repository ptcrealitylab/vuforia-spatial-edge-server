/*
* Copyright © 2021 PTC
*/

import { VIEWS } from './ViewManager.js';
import { MenuView } from './MenuView.js';
import { PopUpModal } from './PopUpModal.js';
import { sharedSessionState } from './SessionState.js';

export class ShareView extends MenuView {
    constructor(viewManager) {
        super(viewManager);
    }
    render() {
        super.render();
        realityEditor.device.environment.variables.suppressObjectRendering = true;

        this.dom.classList.add('popUpModalBackground');
        this.addShareModal();

        if (!sharedSessionState.shareUrl && !sharedSessionState.shareUrlListening) {
            sharedSessionState.getShareUrl(() => {
                this.render();
            });
        }
    }
    addShareModal() {
        let innerHTML = `
            <h3>Invite Collaborators</h3>
            <p>Send this link to anyone in the world.</p>
            <p>If they open this link in a web browser, they can view your Pop-Up Metaverse, see your annotations and add their own to collaborate with you.</p>
        `;
        
        let card = new PopUpModal(innerHTML, 'Generating Share URL...', 'Cancel');
        let shareLink = this.addURLText();
        
        let shareButton = card.dom.querySelector('#confirmModalButton');
        if (sharedSessionState.shareUrl) {
            shareButton.innerText = 'Share'
        } else {
            shareButton.innerText = 'Generating Share URL...';
            shareButton.classList.replace('cardButtonDark', 'introButtonDisabled');
        }

        //Add the input element to the child elements div in PopUpModal.js
        let cardBody = card.dom.getElementsByClassName('popUpModalElementsDiv');
        cardBody[0].appendChild(shareLink);

        card.registerButtonCallback('confirmModalButton', () => {
            if (sharedSessionState.shareUrl) {
                navigator.share({
                    title: 'Pop-up Metaverse Access',
                    text: 'Pop-up Metaverse Access',
                    url: sharedSessionState.shareUrl,
                });
            }
        });
        card.registerButtonCallback('cancelModalButton', () => {
            this.viewManager.render(VIEWS.MAIN_AR);
        });
        this.dom.appendChild(card.dom);
    }
    addURLText() {
        let urlText = document.createElement('div');
        urlText.classList.add('viewDescriptionText');
        urlText.classList.add('underlined');
        urlText.innerText = sharedSessionState.shareUrl;
        return urlText;
    }
}
