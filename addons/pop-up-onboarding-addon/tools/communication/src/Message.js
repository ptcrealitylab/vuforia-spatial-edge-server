import { MessageParser } from './MessageParser.js';

export class Message {
    constructor(parentElement, messageText, messageId, timestamp, author) {
        this.parentElement = parentElement;
        this.persistentId = messageId || this.generatePersistentId();

        this.parser = new MessageParser();
        this.parser.addRule(/@([^\s!?.])+/g, 'textMention');
        this.parser.addRule(/#([^\s!?.])+/g, 'textHashtag');

        this.messageText = messageText;
        this.timestamp = timestamp;
        this.author = author;
        this.createDomElements();
    }
    createDomElements() {
        this.dom = document.createElement('div');
        this.parentElement.appendChild(this.dom);

        let messageContainer = document.createElement('div');
        messageContainer.classList.add('messageView');

        let authorDiv = document.createElement('div');
        authorDiv.classList.add('messageAuthor');
        authorDiv.innerText = this.author || '';
        messageContainer.appendChild(authorDiv);

        let messageText = document.createElement('div');
        messageText.classList.add('messageText');
        messageText.innerHTML = this.parser.formatText(this.messageText);
        messageContainer.appendChild(messageText);

        let timestampDiv = document.createElement('div');
        timestampDiv.classList.add('messageTimestamp');
        timestampDiv.innerText = this.timestamp ? this.formatDate(this.timestamp) : '';
        messageContainer.appendChild(timestampDiv);

        this.dom.appendChild(messageContainer);
    }
    // Formats it like: "3:02PM on March 26, 2023"
    formatDate(timestamp) {
        const date = new Date(timestamp);
        const hours = date.getHours() % 12 || 12;
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const amOrPm = date.getHours() < 12 ? 'AM' : 'PM';
        const month = date.toLocaleString('default', { month: 'long' });
        const day = date.getDate();
        const year = date.getFullYear();

        return `${hours}:${minutes}${amOrPm} on ${month} ${day}, ${year}`;
    }
    extractData() {
        return this.parser.parseText(this.messageText);
    }
    getDom() {
        return this.dom;
    }
    generatePersistentId() {
        var dateUuidTime = new Date();
        var abcUuidTime = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        var stampUuidTime = parseInt(Math.floor((Math.random() * 199) + 1) + "" + dateUuidTime.getTime()).toString(36);
        while (stampUuidTime.length < 12) stampUuidTime = abcUuidTime.charAt(Math.floor(Math.random() * abcUuidTime.length)) + stampUuidTime;
        return stampUuidTime;
    }
}

// A PhotoMessage can be distinguished from a Message by having a imageUrl instead of a messageText
// PhotoMessage also works for videos, because CSS backgroundImage supports videos
class PhotoMessage {
    constructor(parentElement, imageUrl, messageId) {
        this.parentElement = parentElement;
        this.persistentId = messageId || this.generatePersistentId();
        this.imageUrl = imageUrl;
        this.createDomElements();
    }
    createDomElements() {
        this.dom = document.createElement('div');
        this.parentElement.appendChild(this.dom);

        let messageContainer = document.createElement('div');
        messageContainer.classList.add('messageView');
        messageContainer.classList.add('photoMessageView');
        messageContainer.style.backgroundImage = 'url(' + this.imageUrl + ')';
        this.dom.appendChild(messageContainer);
    }
    extractData() {
        return null;
    }
    getDom() {
        return this.dom;
    }
    generatePersistentId() {
        var dateUuidTime = new Date();
        var abcUuidTime = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        var stampUuidTime = parseInt(Math.floor((Math.random() * 199) + 1) + "" + dateUuidTime.getTime()).toString(36);
        while (stampUuidTime.length < 12) stampUuidTime = abcUuidTime.charAt(Math.floor(Math.random() * abcUuidTime.length)) + stampUuidTime;
        return stampUuidTime;
    }
}
