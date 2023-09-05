import { MessageParser } from './MessageParser.js';

const DISABLE_PHOTO_BUTTON = true;
export class Compose {
    constructor(parentElement) {
        this.parentElement = parentElement;

        this.DEFAULT_TEXT = 'Compose a new message';
        this.photoSubmitCallbacks = [];

        this.parser = new MessageParser();
        this.parser.addRule(/@([^\s!?.])+/g, 'textMention');
        this.parser.addRule(/#([^\s!?.])+/g, 'textHashtag');
        
        // do this after all state has been initialized
        this.createDomElements();
    }
    createDomElements() {
        this.dom = document.createElement('div');
        this.dom.id = 'composeContainer';
        this.parentElement.appendChild(this.dom);

        let composeTextfield = document.createElement('div');
        composeTextfield.id = 'composeTextfield';
        composeTextfield.setAttribute('contenteditable', '');
        this.dom.appendChild(composeTextfield);
        this.composeTextfield = composeTextfield;
        
        let sendButton = document.createElement('img');
        sendButton.id = 'sendButton';
        sendButton.src = './resources/send-button.svg';
        this.dom.appendChild(sendButton);
        this.sendButton = sendButton;

        if (!DISABLE_PHOTO_BUTTON) {
            let photoButton = document.createElement('img');
            photoButton.id = 'photoButton';
            photoButton.classList.add('disabledButton');
            photoButton.src = './resources/photo-button.svg';
            this.dom.appendChild(photoButton);
            this.photoButton = photoButton;
            this.setupButtonVisualFeedback(photoButton);
        }

        // the form is hidden but is necessary to trigger the video/photo upload
        let formContainer = this.createForm();
        this.dom.appendChild(formContainer);

        // this.setupButtonVisualFeedback(composeTextfield);
        this.setupButtonVisualFeedback(sendButton);

        this.setChangeListener(composeTextfield, (e) => {
            console.log(e);
            if (e.type === 'keyup' && e.code === 'Enter') {
                // submit
                if (this.getText() === this.DEFAULT_TEXT || this.getText().length === 0) {
                    return;
                }
                if (this.submitCallback) {
                    this.submitCallback(this.composeTextfield.innerText);
                }
                this.onMessageSent();
            }
            this.onTextUpdated();
        })
    }
    setChangeListener(div, listener) {
        // div.addEventListener("blur", listener);
        div.addEventListener("keyup", listener);
        div.addEventListener("paste", listener);
        // div.addEventListener("copy", listener);
        div.addEventListener("cut", listener);
        div.addEventListener("delete", listener);
        // div.addEventListener("mouseup", listener);
    }
    // renderText() {
    //     let displayString = this.textString;
    //     if (displayString.length === 0) {
    //         displayString = this.DEFAULT_TEXT;
    //     }
    //     this.composeTextfield.innerHTML = this.parser.formatText(displayString);
    //     // let matches = this.parser.parseText(displayString);
    //     // console.log(matches);
    //     this.onTextUpdated();
    // }
    getDom() {
        return this.dom;
    }
    onKeyboardShown() {
        // this.dom.classList.add('composeViewKeyboard');
    }
    onKeyboardClosed() {
        // this.dom.classList.remove('composeViewKeyboard');
    }
    onSubmit(callback) {
        this.submitCallback = callback;

        this.sendButton.addEventListener('pointerup', function() {
            if (this.getText() === this.DEFAULT_TEXT || this.getText().length === 0) {
                return;
            }
            callback(this.composeTextfield.innerText);
            // callback(this.textString);
            this.onMessageSent();
        }.bind(this));
    }
    onTextUpdated() {
        if (this.getText() === this.DEFAULT_TEXT || this.getText().length === 0) {
            this.composeTextfield.classList.add('placeholderText');
            this.sendButton.classList.add('disabledButton');
        } else {
            this.composeTextfield.classList.remove('placeholderText');
            this.sendButton.classList.remove('disabledButton');
        }
    }
    onMessageSent() {
        console.log('send message: ' + this.composeTextfield.innerText); //this.textString);

        this.composeTextfield.innerText = '';
    }
    onPhotoSubmit(callback) {
        if (DISABLE_PHOTO_BUTTON) {
            console.warn('Photo attachment button is disabled.');
            return;
        }
        this.photoSubmitCallbacks.push(callback);

        // when photo button is pressed, programatically click the hidden image-upload form
        this.photoButton.addEventListener('pointerup', function() {
            this.hiddenFileUpload.click();
        }.bind(this));
    }
    getText() {
        return this.composeTextfield.innerText; // this.textString;
    }
    setupButtonVisualFeedback(buttonElement) {
        buttonElement.addEventListener('pointerdown', function() {
            buttonElement.classList.add('buttonActive');
        });
        buttonElement.addEventListener('pointerup', function() {
            buttonElement.classList.remove('buttonActive');
        });
        buttonElement.addEventListener('pointercancel', function() {
            buttonElement.classList.remove('buttonActive');
        });
    }
    createForm() {
        let formContainer = document.createElement('div');
        let hiddenFileUpload = document.createElement('input');
        hiddenFileUpload.setAttribute('type', 'file');
        hiddenFileUpload.id = 'hiddenFileUpload';
        this.hiddenFileUpload = hiddenFileUpload;

        hiddenFileUpload.addEventListener('change', function(e) {
            console.log('upload media to server');
            window.mediaAttachments.uploadFilesToServer(hiddenFileUpload.files, function(imagePath) {
                this.photoSubmitCallbacks.forEach(function(cb) {
                    cb(imagePath);
                });
            }.bind(this));
        }.bind(this));

        formContainer.appendChild(hiddenFileUpload);
        return formContainer;
    }
}
