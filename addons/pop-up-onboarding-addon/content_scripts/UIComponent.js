/*
* Copyright © 2023 PTC
*/

export class UIComponent {
    constructor() {
        this.callbacks = {};
        this.dom = null;
    }
    registerButtonCallback(buttonId, callback) {
        if (!this.callbacks[buttonId]) this.callbacks[buttonId] = [];

        this.callbacks[buttonId].push(callback);
    }
    triggerButtonCallbacks(buttonId, params) {
        if (!this.callbacks[buttonId]) return;
        this.callbacks[buttonId].forEach(callback => {
            callback(params);
        });
    }
    setupButtonVisualFeedback(buttonElement, classWhileActive) {
        buttonElement.addEventListener('pointerdown', () => {
            buttonElement.classList.add(classWhileActive);
        });
        buttonElement.addEventListener('pointerenter', () => {
            buttonElement.classList.add(classWhileActive);
        });
        buttonElement.addEventListener('pointerup', () => {
            buttonElement.classList.remove(classWhileActive);
        });
        buttonElement.addEventListener('pointercancel', () => {
            buttonElement.classList.remove(classWhileActive);
        });
        buttonElement.addEventListener('pointerleave', () => {
            buttonElement.classList.remove(classWhileActive);
        });
    }
    addClickEventListener(button, onClick) {
        let pointerDownInButton = false;
        let pointerStillInButton = false;

        button.addEventListener('pointerdown', () => {
            pointerDownInButton = true;
            pointerStillInButton = true;
        });
        button.addEventListener('pointerleave', () => {
            pointerStillInButton = false;
        });
        button.addEventListener('pointerenter', () => {
            pointerStillInButton = true;
        });
        button.addEventListener('pointercancel', () => {
            pointerStillInButton = false;
            pointerDownInButton = false;
        });
        button.addEventListener('pointerup', () => {
            if (pointerDownInButton && pointerStillInButton) {
                if (typeof onClick === 'function') {
                    onClick();
                }
            }
            pointerDownInButton = false;
            pointerStillInButton = false;
        });
    }
    addDarkButton(id, innerText, parent, onPointerDown) {
        let button = document.createElement('div');
        button.id = id;
        button.classList.add('introButtonDark');
        button.innerText = innerText;
        this.addClickEventListener(button, onPointerDown);
        parent.appendChild(button);
        return button;
    }
    addCardDarkButton(id, innerText, parent, onPointerDown) {
        if (innerText !== null) {
            let button = document.createElement('div');
            button.id = id;
            button.classList.add('cardButtonDark');
            button.innerText = innerText;
            this.addClickEventListener(button, onPointerDown);
            parent.appendChild(button);
            return button;
        }
    }
    addCardLightButton(id, innerText, parent, onPointerDown) {
        if (innerText !== null) {
            let button = document.createElement('div');
            button.id = id;
            button.classList.add('cardButtonLight');
            button.innerText = innerText;
            this.addClickEventListener(button, onPointerDown);
            parent.appendChild(button);
            return button;
        }
    }
    addCardUIComponent() {
        let card = document.createElement('div');
        card.classList.add('introViewCard');
        return card;
    }
    //new create card function
    addViewCard() {
        let card = document.createElement('div');
        card.classList.add('viewCard');
        return card;
    }
}
