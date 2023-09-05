/*
* Copyright © 2023 PTC
*/

import { UIComponent } from './UIComponent.js';

export class PopUpModal extends UIComponent {
    constructor(innerHTML, confirmLabel, cancelLabel) {
        super();
        this.dom = this.constructDom(innerHTML, confirmLabel, cancelLabel);
    }
    constructDom(innerHTML, confirmLabel, cancelLabel) {
        let card = this.addViewCard();
        card.classList.add('center', 'popUpModal');

        let cardText = document.createElement('div');
        cardText.classList.add('popUpModalText');
        cardText.innerHTML = innerHTML;
        card.appendChild(cardText);
        
        /* Added div for 'children' and other elements for modal. In the future the input element of
         TextInputModal.js could be added here */
        let cardChildElements = document.createElement('div');
        cardChildElements.classList.add('popUpModalElementsDiv');
        card.appendChild(cardChildElements);
        
        if (confirmLabel !== null) {
            let exitButton = this.addCardDarkButton('confirmModalButton', confirmLabel, card, () => {
                this.triggerButtonCallbacks('confirmModalButton', { button: exitButton });
            });
            this.setupButtonVisualFeedback(exitButton, 'introButtonPressed');
            exitButton.style.pointerEvents = 'auto';
        }

        if (cancelLabel !== null) {
            let cancelButton = this.addCardLightButton('cancelModalButton', cancelLabel, card, () => {
                this.triggerButtonCallbacks('cancelModalButton', { button: cancelButton });
            });
            this.setupButtonVisualFeedback(cancelButton, 'introButtonPressed');
            cancelButton.style.pointerEvents = 'auto';
        }
        return card;
    }
}
