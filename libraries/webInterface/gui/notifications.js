/**
 * @fileOverview
 * Defines a Notification class and a NotificationList class for showing messages at the
 * top of the screen that disappear after a set amount of time
 *
 * Only exports showErrorNotification and showMessageNotification
 *
 * Be sure to include styles defined in notifications.css
 *
 * Example usage:
 *
 * showErrorNotification('Incorrect file format');
 * // shows a red message that disappears after default 5 seconds
 *
 * showErrorNotification('Incorrect file format', 10000);
 * // disappears after 10 seconds
 *
 * showErrorNotification('Incorrect file format', -1);
 * // never disappears until user clicks its X button
 */

(function(exports) {

    const defaultTimeToLive = 5000; // 5 seconds
    let notificationList = null; // it only makes sense to have at most 1 of these
    // it gets created and added only if the show notification API is used

    /**
     * Show an error message on the top of the screen
     * Hides when the user clicks its X button or after the timeToLive
     * If timeToLive is omitted, defaults to 5 seconds
     * If timeToLive is set to <= 0, never disappears until user clicks X
     * @param {string} displayText
     * @param {number?} timeToLive - in milliseconds
     */
    function showErrorNotification(displayText, timeToLive) {
        addNotificationListIfNecessary();
        notificationList.showErrorNotification(displayText, timeToLive);
    }

    /**
     * Show a log message on the top of the screen
     * Hides when the user clicks its X button or after the timeToLive
     * If timeToLive is omitted, defaults to 5 seconds
     * If timeToLive is set to <= 0, never disappears until user clicks X
     * @param {string} displayText
     * @param {number?} timeToLive - in milliseconds
     */
    function showMessageNotification(displayText, timeToLive) {
        addNotificationListIfNecessary();
        notificationList.showMessageNotification(displayText, timeToLive);
    }

    /**
     * Show a green success message at the top of the screen
     * See showErrorNotification for additional documentation
     * @param {string} displayText
     * @param {number?} timeToLive - in milliseconds
     */
    function showSuccessNotification(displayText, timeToLive) {
        addNotificationListIfNecessary();
        notificationList.showSuccessNotification(displayText, timeToLive);
    }

    function Notification(messageText, type, onClose) {
        this.messageText = messageText;
        this.type = type;
        this.onClose = onClose;
        this.removalTimeout = null;

        // construct the DOM element
        this.domElement = this.buildNotificationElement();
    }

    Notification.prototype.buildNotificationElement = function() {
        // add a container with the message
        let element = document.createElement('div');
        element.className = 'notification';
        if (this.type === 'error') {
            element.classList.add('notificationError');
        } else if (this.type === 'success') {
            element.classList.add('notificationSuccess');
        }
        element.innerText = this.messageText;

        // add an [X] that makes it hide
        let xButton = document.createElement('div');
        xButton.className = 'closeNotification';
        xButton.innerText = 'X';
        element.appendChild(xButton);

        xButton.addEventListener('click', function() {
            this.domElement.remove();
            if (this.onClose) {
                this.onClose();
            }
            clearTimeout(this.removalTimeout);
        }.bind(this));

        return element;
    };

    Notification.prototype.show = function(parentElement, timeToLive) {
        if (typeof timeToLive === 'undefined') { timeToLive = defaultTimeToLive; }

        parentElement.appendChild(this.domElement);
        if (timeToLive > 0) {
            this.removalTimeout = setTimeout(function () {
                parentElement.removeChild(this.domElement);
                this.onClose();
                this.removalTimeout = null;
            }.bind(this), timeToLive);
        }
    };

    function addNotificationListIfNecessary() {
        if (!notificationList) {
            notificationList = new NotificationList();
            notificationList.addToBody();
        }
    }

    function NotificationList() {
        this.element = this.buildElement();
        this.notifications = [];
    }

    NotificationList.prototype.buildElement = function() {
        // add a container
        let element = document.createElement('div');
        element.className = 'notificationList';
        return element;
    };

    NotificationList.prototype.addToBody = function() {
        document.body.appendChild(this.element);
    };

    NotificationList.prototype.showErrorNotification = function(messageText, timeToLive) {
        this.showNotification(messageText, 'error', timeToLive);
    };

    NotificationList.prototype.showMessageNotification = function(messageText, timeToLive) {
        this.showNotification(messageText, 'message', timeToLive);
    };

    NotificationList.prototype.showSuccessNotification = function(messageText, timeToLive) {
        this.showNotification(messageText, 'success', timeToLive);
    };

    NotificationList.prototype.showNotification = function(messageText, type, timeToLive) {
        let notification = new Notification(messageText, type, function() {
            console.log('notificationList removed notification with text: ' + messageText);
            let index = this.notifications.indexOf(notification);
            if (index > -1) {
                this.notifications.splice(index, 1);
            }
        }.bind(this));
        notification.show(this.element, timeToLive);
        this.notifications.push(notification);
    };

    exports.showErrorNotification = showErrorNotification;
    exports.showMessageNotification = showMessageNotification;
    exports.showSuccessNotification = showSuccessNotification;

})(window);
