/*
* Copyright © 2021 PTC
*/

import { VIEWS } from './ViewManager.js';
import { MenuView } from './MenuView.js';
import { PopUpModal } from './PopUpModal.js';
import { sharedNetworkSettings } from './NetworkSettings.js';
import { sharedSessionState, MANAGER_BASE_URL } from './SessionState.js';

export class FinalizeScanView extends MenuView {
    constructor(viewManager) {
        super(viewManager);
        this.STATES = Object.freeze({
            START_SETUP: 'START_SETUP',
            SET_NAME: 'SET_NAME',
            UPLOAD_IMAGE: 'UPLOAD_IMAGE',
            CONFIRM_IMAGE: 'CONFIRM_IMAGE',
            COMPLETE_SETUP: 'COMPLETE_SETUP'
        });
        this.COMPRESS_IMAGE = true;

        this.currentState = this.STATES.START_SETUP;
        this.imageFile = null;

        this.networkSettings = null;
        sharedNetworkSettings.addOnChange((settings) => {
            this.networkSettings = settings;
        });
    }
    show() {
        super.show();

        realityEditor.network.discovery.resumeObjectDetections();
    }
    render() {
        super.render();

        realityEditor.device.environment.variables.suppressObjectRendering = true;

        this.dom.classList.add('popUpModalBackground');

        if (this.currentState === this.STATES.START_SETUP) {
            this.addStartSetupCard();
        } else if (this.currentState === this.STATES.SET_NAME) {
            this.addInputNameCard();
        } else if (this.currentState === this.STATES.UPLOAD_IMAGE) {
            this.addUploadImageCard();
        } else if (this.currentState === this.STATES.CONFIRM_IMAGE) {
            this.addImagePreviewCard(this.imageFile);
            this.addBackButton(this.STATES.UPLOAD_IMAGE);
        } else if (this.currentState === this.STATES.COMPLETE_SETUP) {
            this.addCompleteSetupCard();
        }
    }
    //can remove as addBackButton shares this functionality 
    addCardBackButton(stateWhenPressed) {
        let backButton = document.createElement('div');
        backButton.id = 'viewBackButton';
        backButton.classList.add('topLeftCornerButton');
        this.dom.appendChild(backButton);
        backButton.innerText = 'Back';

        backButton.addEventListener('pointerdown', () => {
            this.currentState = stateWhenPressed;
            this.render();
        });
    }
    addStartSetupCard() {
        let innerHTML = `
            <h3>Finish Setup</h3>
            <p>Would you like to customise your metaverse or use the default settings?</p>
        `;
        const defaultName = this.getDefaultName();
        let card = new PopUpModal(innerHTML, 'Setup Metaverse', 'Use Default Settings');
        card.registerButtonCallback('confirmModalButton', () => {
            this.currentState = this.STATES.SET_NAME;
            this.render();
        });
        card.registerButtonCallback('cancelModalButton', () => {
            this.tryUpload(defaultName);
            this.viewManager.render(VIEWS.MAIN_AR);
        });
        this.dom.appendChild(card.dom);
    }
    addInputNameCard() {
        let innerHTML = `
            <h3>Metaverse Name</h3>
            <p>Set a name to identify this metaverse.</p>
        `;
        const defaultName = this.getDefaultName();
        let card = new PopUpModal(innerHTML, 'Set Metaverse Name', 'Use Default Name');

        //Create an input element
        let input = document.createElement('input');
        input.setAttribute('type', 'text');
        input.setAttribute('placeholder', 'Set Name');
        input.classList.add('popUpModalTextInput');

        //Add the input element to the child elements div in PopUpModal.js
        let cardBody = card.dom.getElementsByClassName('popUpModalElementsDiv');
        cardBody[0].appendChild(input);
        
        card.registerButtonCallback('confirmModalButton', () => {
            if (input.value.length > 0) {
                this.tryUpload(input.value);
                this.currentState = this.STATES.UPLOAD_IMAGE;
                this.render();
            }
        });
        card.registerButtonCallback('cancelModalButton', () => {
            if (input.value === defaultName) {
                this.tryUpload(input.value);
                this.currentState = this.STATES.UPLOAD_IMAGE;
                this.render();
            } else {
                input.value = defaultName;
            }
        });
        this.dom.appendChild(card.dom);
    }
    getDefaultName() {
        let date = new Date();
        let dateString = date.toLocaleDateString();
        let hours = date.getHours();
        let suffix = hours < 12 ? "AM" : "PM";
        hours = ((hours + 11) % 12 + 1);
        let minutes = date.getMinutes().toString();
        if (minutes.length < 2) {
            minutes = `0${minutes}`;
        }
        let timeString = `${hours}:${minutes} ${suffix}`;
        return `Metaverse ${dateString} ${timeString}`;
    }
    tryUpload(name) {
        try {
            console.log('upload metaverse to manager!');
            this.post_addMetaverse(name);
        } catch (e) {
            console.warn('error posting to metaverse manager', e);
        }
    }
    addUploadImageCard() {
        // the form is hidden but is necessary to trigger the video/photo upload
        let formContainer = this.createForm();
        this.dom.appendChild(formContainer);

        let innerHTML = `
                <h3>Upload Photo</h3>
                <p>Choose a thumbnail image to identify this metaverse. You can take or upload a photo, or use the default grapic.</p>
                <p>It's recommended to take a photo of the focus of your scan.</p>
                `;

        let card = new PopUpModal(innerHTML, 'Select Image', 'Use Default Image');
        card.registerButtonCallback('confirmModalButton', ({button}) => {
            button.innerText = 'Selecting...';
            // when photo button is pressed, programatically click the hidden image-upload form
            this.hiddenFileUpload.click();
        });
        card.registerButtonCallback('cancelModalButton', () => {
            this.viewManager.render(VIEWS.MAIN_AR);
        });
        this.dom.appendChild(card.dom);
    }
    addImagePreviewCard(imageFile) {
        let innerHTML = '<h3>Image Preview</h3>';
        let card = new PopUpModal(innerHTML, 'Upload Image', null);
        this.dom.appendChild(card.dom)

        let imageContainer = document.createElement('div');
        imageContainer.classList.add('popUpModalImagePreview');
        imageContainer.style.overflow = 'hidden';
        
        //Add the imageContainer div to the child elements div in PopUpModal.js
        let cardBody = card.dom.getElementsByClassName('popUpModalElementsDiv');
        cardBody[0].appendChild(imageContainer);

        let mask = document.createElement('div');
        mask.classList.add('mask');
        imageContainer.appendChild(mask);

        let imagePreview = document.createElement('img');
        imagePreview.src = URL.createObjectURL(imageFile);
        mask.appendChild(imagePreview);

        card.registerButtonCallback('confirmModalButton', ({button}) => {

            button.innerText = 'Uploading...';

            setTimeout(() => {
                this.currentState = this.STATES.COMPLETE_SETUP;
                this.render();
            }, 300);

            // todo: add a button that triggers the following
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (evt) => {
                    resolve(evt.target.result);

                    if (this.COMPRESS_IMAGE) {
                        let blob = this.compressImage(imagePreview.src);
                        const compressedReader = new FileReader();
                        compressedReader.onload = () => {
                            this.handleSubmit(evt, compressedReader.result, sharedSessionState.metaverse_id);
                        }
                        compressedReader.readAsArrayBuffer(blob);
                    } else {
                        this.handleSubmit(evt, evt.target.result, sharedSessionState.metaverse_id);
                    }
                };
                reader.onerror = (err) => {
                    reject(err);
                };
                reader.readAsArrayBuffer(this.imageFile);
            });
        });
        // This returns the user to the previous modal instead of needing a back button at the top of the screen
        // card.registerButtonCallback('cancelModalButton', () => {
        //     this.currentState = this.STATES.UPLOAD_IMAGE;
        //     this.render();
        // })
    }
    addCompleteSetupCard() {
        let innerHTML = `<h3>Metaverse Setup Complete!</h3>`;
        let card = new PopUpModal(innerHTML, 'Enter Metaverse', null);
        card.registerButtonCallback('confirmModalButton', () => {
            this.viewManager.render(VIEWS.MAIN_AR);
        });
        this.dom.appendChild(card.dom);
    }
    compressImage(imageSrc) {
        const img = new Image();
        img.src = imageSrc;

        let imagePreviewCanvas = document.createElement('canvas');
        imagePreviewCanvas.width = 400;
        imagePreviewCanvas.height = (img.height / img.width) * imagePreviewCanvas.width;
        const ctx = imagePreviewCanvas.getContext('2d');
        ctx.drawImage(img, 0, 0, imagePreviewCanvas.width, imagePreviewCanvas.height);

        const dataUrl = imagePreviewCanvas.toDataURL('image/jpeg', 0.7);
        console.log(dataUrl);

        // convert the data URI to a Blob object
        const base64Data = dataUrl.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: 'image/jpeg' }); // set your desired format
    }
    createForm() {
        let formContainer = document.createElement('div');
        let hiddenFileUpload = document.createElement('input');
        hiddenFileUpload.setAttribute('type', 'file');
        hiddenFileUpload.setAttribute('accept', 'image/*');
        hiddenFileUpload.id = 'hiddenFileUpload';
        this.hiddenFileUpload = hiddenFileUpload;

        hiddenFileUpload.addEventListener('change', (e) => {
            console.log('upload media to server');

            const image = e.target.files[0];
            if (!image) return;

            this.imageFile = image;
            this.currentState = this.STATES.CONFIRM_IMAGE;
            this.render();
        });

        formContainer.appendChild(hiddenFileUpload);
        return formContainer;
    }
    handleSubmit(evt, img, metaverseId) {
        evt.preventDefault();

        const ENDPOINT = `${MANAGER_BASE_URL}api/metaverses/${metaverseId}/upload-image`;
        console.log('posting image to ' + ENDPOINT);

        fetch(ENDPOINT, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/octet-stream',
                'Authorization': `Bearer ${sharedSessionState.metaverseManagerCredentials}`
            },
            body: img,
        })
            .then((res) => {
                //console.log(res);
                //console.log(res.json());
                return res.json();
            })
            .then((response) => {
                //console.log(response); //response object is a large base64 blob
                console.log('image successfully uploaded');
            })
            .catch((error) => {
                console.log('image upload was not successful',);
                console.warn(error);
            });
    };
    post_addMetaverse(name) {
        if (!this.networkSettings) {
            console.warn('we do not have a network ID or secret – cannot post metaverse');
            return;
        }

        if (!sharedSessionState.metaverseManagerCredentials) {
            console.warn('we do not have a JWT from the Metaverse Manager – cannot post metaverse');
            return;
        }

        // TODO: get actual geocoordinates from native API (accessing through navigator.geolocation doesn't seem to have permission)
        let latitude = ((Math.random() * 180) - 90).toFixed(8); // random, for now
        let longitude = ((Math.random() * 360) - 180).toFixed(8);

        const body = {
            net_id: this.networkSettings.networkUUID,
            net_code: this.networkSettings.networkSecret,
            location_name: name,
            location_latlong: `${latitude}, ${longitude}`,
            toolbox_world_id: realityEditor.gui.ar.areaTargetScanner.getSessionObjectId() // the world object id that you just scanned
        };

        const ENDPOINT = `${MANAGER_BASE_URL}api/metaverses`;
        console.log('> uploading metaverse to manager, posting to ' + ENDPOINT);
        console.log('> auth is', sharedSessionState.metaverseManagerCredentials);
        console.log('> body is', body);

        fetch(ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sharedSessionState.metaverseManagerCredentials}`
            },
            body: JSON.stringify(body),
        })
            .then((res) => res.json())
            .then((result) => {
                console.log('metaverse successfully added to the manager');
                //console.log(result);

                sharedSessionState.setMetaverseId(result.metaverse_id); // also contains result.toolbox_world_id but we already have that
            })
            .catch((err) => {
                console.log('metaverse was not added to the manager');
                console.warn(err);
            });
    }
}
