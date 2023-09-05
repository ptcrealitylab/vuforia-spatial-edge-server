/*
* Copyright © 2023 PTC
*/

import { UIComponent } from './UIComponent.js';

export class TextInputModal extends UIComponent {
    constructor(innerHTML, textInputPlaceholder, confirmLabel, cancelLabel) {
        super();
        this.input = null;
        this.dom = this.constructDom(innerHTML, textInputPlaceholder, confirmLabel, cancelLabel);
    }
    constructDom(innerHTML, textInputPlaceholder, confirmLabel, cancelLabel) {
        let card = this.addViewCard();
        card.classList.add('center', 'popUpModal');

        let cardText = document.createElement('div');
        cardText.classList.add('popUpModalText');
        cardText.innerHTML = innerHTML;
        card.appendChild(cardText);
        
        let input = document.createElement('input');
        input.setAttribute('type', 'text');
        if (textInputPlaceholder) {
            input.setAttribute('placeholder', textInputPlaceholder);
        }
        input.classList.add('popUpModalTextInput');
        this.input = input;
        card.appendChild(input);

        let exitButton = this.addCardDarkButton('confirmModalButton', confirmLabel, card, () => {
            this.triggerButtonCallbacks('confirmModalButton', { button: exitButton });
        });
        this.setupButtonVisualFeedback(exitButton, 'introButtonPressed');
        exitButton.style.pointerEvents = 'auto';

        if (cancelLabel) {
            let cancelButton = this.addCardLightButton('cancelModalButton', cancelLabel, card, () => {
                this.triggerButtonCallbacks('cancelModalButton', { button: cancelButton });
            });
            this.setupButtonVisualFeedback(cancelButton, 'introButtonPressed');
            cancelButton.style.pointerEvents = 'auto';
        }

        return card;
    }
}
