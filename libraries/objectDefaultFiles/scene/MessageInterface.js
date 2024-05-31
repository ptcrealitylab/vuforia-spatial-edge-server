/**
 * @callback onMessageFunc
 * @param {MessageEvent} message
 * @returns {void}
 */

/**
 * Generalized postMessage interface
 * It enables us to send messages to scripts executing in the same or a different thread
 */
class MessageInterface {
    constructor() {
    }

    /**
     * send a message to the object
     * @param {Object} _
     */
    postMessage(_) {
        throw new Error("Interface Messageinterface not implemented");
    }

    /**
     * set function to receive messages from the object
     * @param {onMessageFunc} _
     */
    setOnMessage(_) {
        throw new Error("Interface MessageInterface not implemented");
    }
}

/**
 * enables a page to communicate with an IFrame page
 */
class IFrameMessageInterface extends MessageInterface {
    /**
     *
     * @param {HTMLIFrameElement} iframe
     * @param {string} targetOrigin
     */
    constructor(iframe, targetOrigin) {
        super();
        /**
         * @type {HTMLIFrameElement}
         */
        this.iframe = iframe;
        /**
         * @type {string}
         */
        this.targetOrigin = targetOrigin;
        /**
         * @type {onMessageFunc|null}
         */
        this.func = null;
    }

    /**
     *
     * @param {Object} message
     */
    postMessage(message) {
        if (this.iframe.contentWindow) {
            this.iframe.contentWindow.postMessage(message, this.targetOrigin);
        } else {
            throw new Error("IFrameMessageInterface no contentWindow");
        }
    }

    /**
     * @param {onMessageFunc} func
     */
    setOnMessage(func) {
        this.func = func;
        if (self) {
            self.addEventListener("message", func);
        } else {
            throw new Error("IFrameMessageInterface no contentWindow");
        }
    }

    onDelete() {
        if (this.func) {
            self.removeEventListener("message", this.func);
        }
    }
}

/**
 * enables an IFrame to communicate with its parent page
 */
class ParentMessageInterface extends MessageInterface {
    /**
     *
     * @param {string} targetOrigin
     */
    constructor(targetOrigin) {
        super();
        /**
         * @type {string}
         */
        this.targetOrigin = targetOrigin;
    }

    /**
     *
     * @param {Object} message
     */
    postMessage(message) {
        if (self.parent) {
            self.parent.postMessage(message, this.targetOrigin);
        } else {
            throw new Error("ParentMessageInterface no parent window");
        }
    }

    /**
     * @param {onMessageFunc} func
     */
    setOnMessage(func) {
        if (self) {
            self.onmessage = func;
        } else {
            throw new Error("ParentMessageInterface no parent window");
        }
    }
}

export { IFrameMessageInterface, ParentMessageInterface, MessageInterface };
