import { Compose } from './Compose.js';
import { Message } from './Message.js';

const SMALL_UI_WIDTH_THRESHOLD = 1000;
export const TEMP_DISABLE_PIN_FUNCTIONALITY = true; // pinning isn't fully implemented, so dont bother with API calls

export class ConversationView {
    constructor(parentElement, spatialInterface, titleFromStorage, pinnedFromStorage, resolvedFromStorage) {
        this.parentElement = parentElement;
        if (spatialInterface) {
            this.spatialInterface = spatialInterface;
        }
        this.isScrolling = false;
        this.prevY = null;
        this.textfieldSubmitCallbacks = {};
        this.textfieldChangeCallbacks = {};
        this.textfieldWriteFunctions = {};
        this.titleUpdatedCallbacks = [];
        this.pinnedUpdatedCallbacks = [];
        this.resolvedUpdatedCallbacks = [];
        if (titleFromStorage) {
            this.titleFromStorage = titleFromStorage;
        }
        if (typeof pinnedFromStorage !== 'undefined') {
            this.pinnedFromStorage = pinnedFromStorage;
        }
        if (typeof resolvedFromStorage !== 'undefined') {
            this.resolvedFromStorage = resolvedFromStorage;
        }
        this.KEYBOARD_HEIGHT = 300; // this is an assumption, should get programmatically
        if (window.isDesktop()) {
            this.KEYBOARD_HEIGHT = 0;
        }
        this.isPinned = true;
        this.isResolved = false;
        this.messages = [];

        this.createDomElements();
        this.setupKeyboardEvents();
        this.setupPersistentData();

        this.tags = [];
        this.mentions = [];
        this.setupToolboxEvents();
    }
    updateUIForEnvironmentVariables() {
        let screenTopOffset = 0;
        if (window.environmentVariables) {
            screenTopOffset = window.environmentVariables.screenTopOffset;
            if (window.environmentVariables.layoutUIForPortrait) {
                let viewContainer = document.getElementById('viewContainer');
                viewContainer.style.height = 'calc(100% - 130px)';
            }
        }

        let titleField = document.getElementById('titleField');

        let envelopeButtonOffset = 0;
        let headerHeight;
        if (window.innerWidth < SMALL_UI_WIDTH_THRESHOLD) {
            envelopeButtonOffset = 32;
            this.pinButton.style.top = '0';
            this.resolvedButton.style.top = '0';
            titleField.style.width = 'calc(100% - 50px)';
        } else {
            this.pinButton.style.top = '30px';
            this.resolvedButton.style.top = '30px';
            titleField.style.top = '30px';
        }

        let totalOffset = screenTopOffset + envelopeButtonOffset;

        let header = document.getElementById('header');
        let scrollView = document.getElementById('scrollView');
        header.style.top = totalOffset + 'px';
        scrollView.style.top = totalOffset + 'px';

        // header.style.height = headerHeight + 'px';
        // let composeViewHeight = 120;
        // scrollView.style.height = `calc(100% - ${totalOffset + headerHeight + composeViewHeight}px)`;
    }
    createDomElements() {
        this.dom = document.createElement('div');
        this.dom.style.opacity = 0;
        this.dom.id = 'conversation';
        this.parentElement.appendChild(this.dom);

        let header = document.createElement('div');
        header.id = 'header';
        this.dom.appendChild(header);

        const defaultTitle = 'Enter Title';
        let titleField = document.createElement('div');
        if (this.titleFromStorage) {
            titleField.innerText = this.titleFromStorage;
        } else {
            titleField.innerText = defaultTitle;
            titleField.classList.add('placeholderText');
        }
        titleField.id = 'titleField';
        titleField.setAttribute('contenteditable', '');
        header.appendChild(titleField);

        let pinButton = document.createElement('img');
        pinButton.src = './resources/pinned-button.svg';
        pinButton.id = 'pinButton';
        header.appendChild(pinButton);
        this.pinButton = pinButton;
        pinButton.addEventListener('pointerup', this.togglePinned.bind(this));
        if (!this.pinnedFromStorage) {
            this.togglePinned(null, true); // defaults to true, so toggle if false
        }

        let resolvedButton = document.createElement('img');
        resolvedButton.src = './resources/unresolved-button.svg';
        resolvedButton.id = 'resolvedButton';
        header.appendChild(resolvedButton);
        this.resolvedButton = resolvedButton;
        resolvedButton.addEventListener('pointerup', this.toggleResolved.bind(this));
        if (this.resolvedFromStorage) {
            this.toggleResolved(null, true); // defaults to false, so toggle if true
        }

        let scrollView = document.createElement('div');
        scrollView.id = 'scrollView';
        scrollView.classList.add('.scrollable');
        this.dom.appendChild(scrollView);
        this.scrollView = scrollView;
        this.setupScrollView(scrollView);

        this.setupTextfield(titleField, defaultTitle, function(e) {
            console.log('title field changed', e);
            if (titleField.innerText === defaultTitle || titleField.innerText.length === 0) {
                titleField.classList.add('placeholderText');
            } else {
                titleField.classList.remove('placeholderText');
            }
            this.titleUpdatedCallbacks.forEach(function(callback) {
                callback(titleField.innerText);
            });
        }.bind(this), function(e) {
            console.log('title field submitted', e);
            this.resetTextfieldSelection();
            this.titleUpdatedCallbacks.forEach(function(callback) {
                callback(titleField.innerText);
            });
        }.bind(this));

        this.addComposeView();

        this.setupButtonVisualFeedback(pinButton);
        this.setupButtonVisualFeedback(resolvedButton);
        // this.setupButtonVisualFeedback(titleField);

        this.updateUIForEnvironmentVariables();
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
    setupScrollView(scrollView) {
        scrollView.addEventListener('scroll', () => {
            this.updateScrollShadows(scrollView);
        });
    }
    updateScrollShadows(scrollView) {
        let margin = 5;

        scrollView.classList.remove('shadowTopAndBottom');

        if (scrollView.scrollTop > margin) {
            scrollView.classList.add('shadowTopOnly');
        } else {
            scrollView.classList.remove('shadowTopOnly');
        }

        if (scrollView.scrollTop < scrollView.scrollHeight - scrollView.clientHeight - margin) {
            if (scrollView.classList.contains('shadowTopOnly')) {
                scrollView.classList.add('shadowTopAndBottom');
            } else {
                scrollView.classList.add('shadowBottomOnly');
            }
        } else {
            scrollView.classList.remove('shadowBottomOnly');
        }
    }
    adjustForKeyboard() {
        // this.scrollView.classList.add('scrollViewKeyboard');
        this.compose.onKeyboardShown();
        this.scrollToBottom();
    }
    scrollToBottom() {
        skrollTop.scrollTo({
            element: this.scrollView,
            from: this.scrollView.scrollTop,
            to: this.scrollView.scrollHeight,
            easing: window.easings.easeOutBounce,
            duration: 1000,
            callback: function() {
                console.log("finished!");
                this.updateScrollShadows(this.scrollView);
            }.bind(this)
        });
    }
    addMessage(messageText, messageId = null, timestamp = null, author = null) {
        // exclude the messageId if you are creating a new message, include it if you're adding a loaded message
        if (!timestamp) timestamp = Date.now();
        if (!author) author = 'Anonymous User';
        let newMessage = new Message(this.scrollView, messageText, messageId, timestamp, author);
        this.messages.push(newMessage);

        let tagsAndMentions = newMessage.extractData();
        if (tagsAndMentions.textMention) {
            tagsAndMentions.textMention.forEach(function(match) {
                this.mentions.push(match);
            }.bind(this));
        }
        if (tagsAndMentions.textHashtag) {
            tagsAndMentions.textHashtag.forEach(function(match) {
                this.tags.push(match);
            }.bind(this));
        }

        console.log('Tags:', this.tags);
        console.log('Mentions:', this.mentions);

        // scroll to bottom only if this is a new message
        if (!messageId) {
            this.scrollToBottom();
        }

        let dontWrite = !!messageId;
        if (!dontWrite) {
            // this.spatialInterface.writePublicData('storage', 'messages', this.messages);
            window.storage.write('messages', this.messages);

            // writing to storage so that userinterface can access them as properties, not so that they can be
            // loaded in persistently, since they are entirely derived from messages
            window.storage.write('tags', this.tags);
            window.storage.write('mentions', this.mentions);
        }
    }
    addPhotoMessage(imageUrl, messageId) {
        // exclude the messageId if you are creating a new message, include it if you're adding a loaded message
        this.messages.push(new PhotoMessage(this.scrollView, imageUrl, messageId));

        skrollTop.scrollTo({
            element: this.scrollView,
            from: this.scrollView.scrollTop,
            to: this.scrollView.scrollHeight,
            easing: window.easings.easeOutBounce,
            duration: 1000,
            callback: function() {
                console.log("finished!");
                this.updateScrollShadows(this.scrollView);
            }.bind(this)
        });

        let dontWrite = !!messageId;
        if (!dontWrite) {
            // this.spatialInterface.writePublicData('storage', 'messages', this.messages);
            window.storage.write('messages', this.messages);
        }
    }
    addComposeView() {
        this.compose = new Compose(this.dom);
        this.compose.onSubmit(function(messageText) {
            let author = window.userDetails ? window.userDetails.name : null;
            this.addMessage(messageText, null, Date.now(), author);

            // first prototype to send push notification
            let userIdRe = /@([^\s!?.])+/g;
            for (let userIdMatch of messageText.matchAll(userIdRe)) {
                let userId = userIdMatch[0].substring(1);
                fetch('https://jhobin.test.lab.ptc.io/notify', {
                    method: 'POST',
                    headers: {
                        'Content-type': 'application/json',
                    },
                    body: JSON.stringify({
                        // This will have chatId in proper use
                        userId,
                        notification: {
                            chatId: 'the cool one',
                            mentioningUserId: this.userId,
                            message: messageText,
                        },
                    }),
                }).catch(e => {
                    console.warn('unable to notify', e);
                });
            }
        }.bind(this));

        this.compose.onPhotoSubmit(function(imageUrl) {
            this.addPhotoMessage(imageUrl);
        }.bind(this));

        this.setupTextfield(this.compose.getDom().querySelector('#composeTextfield'), 'Compose a new message',
            function(e) {
                console.log('compose field changed', e);
                this.compose.onTextUpdated();
            }.bind(this),
            function(e) {
                console.log('compose textfield submitted', e);
                if (this.compose.getText() === this.compose.DEFAULT_TEXT || this.compose.getText().length === 0) {
                    return;
                }
                this.addMessage(this.compose.getText());
                this.compose.onMessageSent();
            }.bind(this), () => {
                console.log('custom write function');
                // this.compose.handleKeyInput.bind(this.compose)
            });
    }

    setupTextfield(element, defaultText, changeCallback, submitCallback, customWriteFunction) {
        if (!this.registeredTextboxIds) {
            this.registeredTextboxIds = [];
        }
        this.registeredTextboxIds.push(element.id);
        element.addEventListener('pointerup', function(e) {
            if (element.innerText === defaultText) {
                element.innerText = '';
            }
            this.selectedTextboxId = e.target.id;
            e.target.classList.add('selectedTextfield');
            if (this.spatialInterface) {
                // this.spatialInterface.openKeyboard();
                // if (e.target.getClientRects()[0].y > (window.innerHeight - this.KEYBOARD_HEIGHT)) {
                if (e.target.id === 'composeTextfield') {
                    this.adjustForKeyboard();
                }
                // }
            }
        }.bind(this));

        element.addEventListener('keydown', this.onKeyDown.bind(this));
        element.addEventListener('keyup', this.onKeyUp.bind(this));

        this.setChangeListener(element, function(e) {
            // console.log('on change', e);
            // document.getElementById('iamSubmitButton').classList.remove('hidden');
            if (changeCallback) {
                changeCallback(e);
            }
        });

        if (submitCallback) {
            this.textfieldSubmitCallbacks[element.id] = submitCallback;
        }

        if (changeCallback) {
            this.textfieldChangeCallbacks[element.id] = changeCallback;
        }

        if (customWriteFunction) {
            this.textfieldWriteFunctions[element.id] = customWriteFunction;
        }
    }
    setupKeyboardEvents() {
        document.addEventListener('pointerup', function(e) {
            if (this.selectedTextboxId && e.target.id !== this.selectedTextboxId) {
                console.log('close keyboard');
                this.resetTextfieldSelection();
            }
        }.bind(this));

        if (this.spatialInterface) {
            this.spatialInterface.onKeyboardClosed(function() {
                this.resetTextfieldSelection();
                this.scrollView.classList.remove('scrollViewKeyboard');
                this.compose.onKeyboardClosed();
            }.bind(this));
        }
        // this.spatialInterface.onKeyboardClosed doesn't necessarily work anymore if fullscreenFull2D is enabled,
        // but this method seems to detect keyboard opens/closes based on any element being focused/blurred
        this.detectKeyboard();
    }
    // Function to properly detect keyboard show/hide
    detectKeyboard() {
        var isKeyboardVisible = false; // Flag to track keyboard visibility

        // Event listener for focus on input fields
        document.addEventListener('focus', function(event) {
            var _element = event.target;

            // Check if the focused element is an input field
            // if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                // Keyboard is visible
                if (!isKeyboardVisible) {
                    console.log('Keyboard shown');
                    isKeyboardVisible = true;
                }
            // }
        }, true); // Use capture phase to detect events earlier

        // Event listener for blur on input fields
        document.addEventListener('blur', function(event) {
            var _element = event.target;

            // Check if the blurred element is an input field
            // if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                // Keyboard is hidden
                if (isKeyboardVisible) {
                    console.log('Keyboard hidden');
                    isKeyboardVisible = false;
                    this.compose.onKeyboardClosed();

                    // Revert to original vertical offset by scrolling to the top
                    window.scroll(0, 0);
                }
            // }
        }, true); // Use capture phase to detect events earlier
    }
    onKeyDown(e) {
        // console.log('selectedTextboxId: (' + this.selectedTextboxId + '( received key: (' + e.key + ')');

        if (!this.registeredTextboxIds.includes(this.selectedTextboxId)) {
            return;
        }

        if (e.key === "Enter") {
            e.preventDefault();
        }
    }
    onKeyUp(e) {
        // console.log('selectedTextboxId: (' + this.selectedTextboxId + '( received key: (' + e.key + ')');

        if (!this.registeredTextboxIds.includes(this.selectedTextboxId)) {
            return;
        }

        if (e.key === "Enter") {
            e.preventDefault();
            if (!window.isDesktop()) {
                this.resetTextfieldSelection();
            }

            if (this.textfieldSubmitCallbacks[this.selectedTextboxId]) {
                this.textfieldSubmitCallbacks[this.selectedTextboxId](e);
            }
        }
    }
    resetTextfieldSelection() {
        if (!this.selectedTextboxId) return;

        var activeElement = document.getElementById(this.selectedTextboxId);
        if (activeElement) {
            activeElement.classList.remove('selectedTextfield');
            activeElement.blur();
        }
        this.selectedTextboxId = ''; // stop listening once the keyboard closes
        console.log('reset textbox selection');
    }
    // taken from https://stackoverflow.com/a/33064789/1190267
    setChangeListener(div, listener) {
        // div.addEventListener("blur", listener);
        div.addEventListener("keyup", listener);
        div.addEventListener("paste", listener);
        // div.addEventListener("copy", listener);
        div.addEventListener("cut", listener);
        div.addEventListener("delete", listener);
        // div.addEventListener("mouseup", listener);
    }
    show(wait) {
        let delay = wait ? 300 : 10;
        this.getDom().style.display = '';
        setTimeout(function() {
            this.dom.style.opacity = 1;
        }.bind(this), delay);
    }
    hide() {
        this.dom.style.opacity = 0;
        setTimeout(function() {
            this.getDom().style.display = 'none';
        }.bind(this), 50);
    }
    getDom() {
        return this.dom;
    }
    togglePinned(_e, dontWrite) {
        this.isPinned = !this.isPinned;
        this.pinButton.src = this.isPinned ? './resources/pinned-button.svg' :'./resources/unpinned-button.svg';
        if (!dontWrite) {
            // this.spatialInterface.writePublicData('storage', 'pinned', this.isPinned);
            window.storage.write('pinned', this.isPinned);
            if (!TEMP_DISABLE_PIN_FUNCTIONALITY) {
                this.spatialInterface.setPinned(this.isPinned);
            }

            this.pinnedUpdatedCallbacks.forEach(function(callback) {
                callback(this.isPinned);
            }.bind(this));
        }
    }
    toggleResolved(_e, dontWrite) {
        this.isResolved = !this.isResolved;
        this.resolvedButton.src = this.isResolved ? './resources/resolved-button.svg' :'./resources/unresolved-button.svg';
        if (!dontWrite) {
            // this.spatialInterface.writePublicData('storage', 'resolved', this.isResolved);
            window.storage.write('resolved', this.isResolved);

            this.resolvedUpdatedCallbacks.forEach(function(callback) {
                callback(this.isResolved);
            }.bind(this));
        }
    }
    onTitleUpdated(callback) {
        this.titleUpdatedCallbacks.push(callback);
    }
    onPinnedUpdated(callback) {
        this.pinnedUpdatedCallbacks.push(callback);
    }
    onResolvedUpdated(callback) {
        this.resolvedUpdatedCallbacks.push(callback);
    }

    setupToolboxEvents() {
        window.addEventListener('message', (e) => {
            if (!e.data) {
                return;
            }
            let msg;
            try {
                msg = JSON.parse(e.data);
            } catch (_) {
                return;
            }

            if (msg.hasOwnProperty('getCommunicationUserId')) {
                this.userId = msg.getCommunicationUserId;
            }
        });

        window.parent.postMessage(JSON.stringify({
            version: spatialObject.version,
            node: spatialObject.node,
            frame: spatialObject.frame,
            object: spatialObject.object,
            getCommunicationUserId: true,
        }), '*');
    }

    setupPersistentData() {
        window.storage.listen('title', function(titleText) {
            console.log('conversation view got title ' + titleText);
        }.bind(this));
        window.storage.listen('pinned', function(isPinned) {
            console.log('conversation view got pinned ' + isPinned);
            if (!TEMP_DISABLE_PIN_FUNCTIONALITY) {
                spatialInterface.setPinned(isPinned);
            }
            if (isPinned && !this.isPinned) {
                this.togglePinned(null, true);
            }
        }.bind(this));
        window.storage.listen('resolved', function(isResolved) {
            console.log('conversation view got resolved ' + isResolved);
            if (isResolved && !this.isResolved) {
                this.toggleResolved(null, true);
            }
        }.bind(this));
        window.storage.listen('messages', function(messages) {
            console.log('conversation view got messages', messages);
            this.loadMessages(messages);
        }.bind(this));

        window.storage.load();
    }
    loadMessages(messages) {
        messages.forEach(function(message) {
            // load messages to right or left based on if author is the same as logged in user
            if (this.messages.map(e => e.persistentId).includes(message.persistentId)) {
                return; // skip messages we already have
            }

            if (message.messageText) {
                this.addMessage(message.messageText, message.persistentId, message.timestamp, message.author);
            } else if (message.imageUrl) {
                this.addPhotoMessage(message.imageUrl, message.persistentId);
            }
        }.bind(this));
        this.scrollToBottom();
    }
}
