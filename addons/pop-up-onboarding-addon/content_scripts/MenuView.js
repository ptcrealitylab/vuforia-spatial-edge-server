/*
* Copyright © 2021 PTC
*/

export class MenuView {
    constructor(viewManager) {
        this.viewManager = viewManager;
        this.isVisible = false;
        this.state = {};
        this.lastRenderedState = {};
        this.dependentElements = [];

        this.dom = document.createElement('div');
        this.dom.classList.add('fullPageView');
        viewManager.dom.appendChild(this.dom);
    }
    registerChild(domElement, dependsOn, updateCallback) {
        let child = new DependentElement(domElement, dependsOn, updateCallback);
        this.dependentElements.push(child);
    }
    render(options = { newRendering: false }) { // subclasses should first call super.render() in their own render implementations
        if (!options.newRendering) {
            while (this.dom.lastChild) {
                this.dom.lastChild.parentNode.removeChild(this.dom.lastChild);
            }
            return;
        }

        for (const [property, value] of Object.entries(this.state)) {
            if (value === this.lastRenderedState[property] ||
                JSON.stringify(value) === JSON.stringify(this.lastRenderedState[property])) continue; // skip properties that didn't experience a change

            // get all the elements that depend on this state variable
            let dependentElements = this.dependentElements.filter(element => {
                return element && element.dependsOn.includes(property);
            });
            dependentElements.forEach(child => {
                child.updateCallback(child.domElement); //, child.lastRenderedState, this.state);
                child.lastRenderedState = JSON.parse(JSON.stringify(this.state));
            });
        }

        this.lastRenderedState = JSON.parse(JSON.stringify(this.state));
    }
    addDarkButton(id, innerText, parent, onPointerDown) {
        let button = document.createElement('div');
        button.id = id;
        button.classList.add('introButtonDark'); // 'centered', 'mediumWidth'
        parent.appendChild(button);
        button.innerText = innerText;
        this.addClickEventListener(button, onPointerDown);
        return button;
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
    addBackButton(viewOnClicked) {
        let backButton = document.createElement('div');
        backButton.id = 'viewBackButton';
        backButton.classList.add('backButton');
        this.dom.appendChild(backButton);

        let img = document.createElement("img");
        img.src = '/addons/pop-up-onboarding-addon/arrow-left-white.svg';
        backButton.appendChild(img);

        backButton.addEventListener('pointerdown', () => {
            this.viewManager.render(viewOnClicked);
        });

        return backButton;
    }
    addCard() {
        let card = document.createElement('div');
        card.classList.add('introViewCard');
        this.dom.appendChild(card);
        return card;
    }
    //new create card function
    addViewCardMenuView() {
        let card = document.createElement('div');
        card.classList.add('viewCard');
        this.dom.appendChild(card);
        return card;
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
    show() {
        this.isVisible = true;
        this.dom.style.display = '';
    }
    hide() {
        this.isVisible = false;
        this.dom.style.display = 'none';
    }
}

/**
 * Within a view, you can do this.registerChild(domElement, dependsOn, updateCallback)
 * to be notified whenever the property names listed in dependsOn are changed, and to
 * update state of the domElement as a result.
 * e.g. this.registerChild(textField, ['title'], () => { textField.innerText = this.state['title']; })
 */
class DependentElement {
    constructor(domElement, dependsOn = [], updateCallback = null) {
        this.domElement = domElement;
        this.dependsOn = dependsOn;
        this.updateCallback = updateCallback;
    }
}
