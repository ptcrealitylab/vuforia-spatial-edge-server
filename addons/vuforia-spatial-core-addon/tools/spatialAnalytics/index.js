/* global Envelope, SpatialInterface, isDesktop */

let spatialInterface;

let startTime = Date.now(); // 1675809876408 - 20
let endTime = -1; // 1675809963335 + 3 * 60 * 60 * 1000;
let knownRegionCards = [];
let regionCardStartTime = -1;

if (!spatialInterface) {
    spatialInterface = new SpatialInterface();
}

const launchButton = document.getElementById('launchButton');
launchButton.addEventListener('pointerup', function () {
    envelope.open();
}, false);

// add random init gradient for the tool icon
const randomDelay = -Math.floor(Math.random() * 100);
launchButton.style.animationDelay = `${randomDelay}s`;

const envelopeContainer = document.querySelector('#envelopeContainer');
const envelope = new Envelope(spatialInterface, [], envelopeContainer, launchButton, true, false);
const iconContainer = document.getElementById('iconContainer');
const recordingIcon = document.querySelector('.recordingIcon');
const markStepIcon = document.querySelector('.markStepIcon');
const recIconBackground = document.querySelector('#analyticsRecordingIcon');
const msIconBackground = document.querySelector('#analyticsMarkStepIcon');

const RecordingState = {
    empty: 'empty',
    recording: 'recording',
    done: 'done',
};
let recordingState = RecordingState.empty;

function setRecordingState(newState) {
    recordingState = newState;
    switch (recordingState) {
    case RecordingState.empty:
        recordingIcon.src = 'sprites/empty.png';
        markStepIcon.style.display = 'none';
        break;
    case RecordingState.recording:
        recordingIcon.src = 'sprites/recording.png';
        markStepIcon.style.display = 'inline';
        recIconBackground.classList.add('recording');
        break;
    case RecordingState.done:
        recordingIcon.style.display = 'none';
        markStepIcon.style.display = 'none';
        msIconBackground.style.display = 'none';
        recIconBackground.style.display = 'none';
        iconContainer.style.display = 'none';
        break;
    }

    if (recordingState === RecordingState.done && !isDesktop()) {
        const message = document.createElement('p');
        message.textContent = 'Recording Done';
        message.classList.add('recordingDone');
        envelopeContainer.appendChild(message);
    }
}

recordingIcon.addEventListener('pointerup', function() {
    switch (recordingState) {
    case RecordingState.empty:
        setRecordingState(RecordingState.recording);
        startTime = Date.now();
        regionCardStartTime = startTime;
        spatialInterface.analyticsSetDisplayRegion({
            startTime,
            endTime,
        });
        writePublicData();
        break;
    case RecordingState.recording:
        setRecordingState(RecordingState.done);
        endTime = Date.now();
        spatialInterface.analyticsSetDisplayRegion({
            startTime,
            endTime,
        });
        writePublicData();
        // user pressed the mark split button during this recording
        if (regionCardStartTime !== startTime) {
            appendRegionCard({
                startTime: regionCardStartTime,
                endTime,
            });
        }
        break;
    case RecordingState.done:
        break;
    }
});

markStepIcon.addEventListener('pointerdown', function() {
    markStepIcon.classList.add('pressed');
});

markStepIcon.addEventListener('pointerleave', function() {
    markStepIcon.classList.remove('pressed');
});

markStepIcon.addEventListener('pointerup', function() {
    markStepIcon.classList.remove('pressed');
    if (recordingState !== RecordingState.recording) {
        return;
    }
    let regionCardEndTime = Date.now();
    appendRegionCard({
        startTime: regionCardStartTime,
        endTime: regionCardEndTime,
    });
    regionCardStartTime = regionCardEndTime;
});

let lastSetDisplayRegion = {};

envelope.onOpen(() => {
    spatialInterface.analyticsOpen();
    if (lastSetDisplayRegion.startTime !== startTime ||
        lastSetDisplayRegion.endTime !== endTime) {
        spatialInterface.analyticsSetDisplayRegion({
            startTime,
            endTime,
        });
        lastSetDisplayRegion.startTime = startTime;
        lastSetDisplayRegion.endTime = endTime;
    }
    if (knownRegionCards.length > 0) {
        spatialInterface.analyticsHydrateRegionCards(knownRegionCards);
    }
});

let focused = false;
envelope.onFocus(() => {
    focused = true;
    iconContainer.style.display = 'block';
    spatialInterface.analyticsFocus();
    if (lastSetDisplayRegion.startTime !== startTime ||
        lastSetDisplayRegion.endTime !== endTime) {
        spatialInterface.analyticsSetDisplayRegion({
            startTime,
            endTime,
        });
        lastSetDisplayRegion.startTime = startTime;
        lastSetDisplayRegion.endTime = endTime;
    }
    if (knownRegionCards.length > 0) {
        spatialInterface.analyticsHydrateRegionCards(knownRegionCards);
    }
});

envelope.onBlur(() => {
    focused = false;
    iconContainer.style.display = 'none';
    spatialInterface.analyticsBlur();
});

envelope.onClose(() => {
    if (!focused) {
        return;
    }
    spatialInterface.analyticsClose();
    if (recordingState === RecordingState.recording) {
        endTime = Date.now();
        writePublicData();
    }
});

const writePublicData = () => {
    spatialInterface.writePublicData('storage', 'status', {
        startTime,
        endTime,
    });
};

function appendRegionCard(regionCard) {
    knownRegionCards.push(regionCard);
    spatialInterface.writePublicData('storage', 'cards', knownRegionCards);
    spatialInterface.analyticsHydrateRegionCards(knownRegionCards);
}

spatialInterface.onSpatialInterfaceLoaded(function() {
    spatialInterface.setVisibilityDistance(100);
    spatialInterface.setMoveDelay(300);
    spatialInterface.setAlwaysFaceCamera(true);

    spatialInterface.initNode('storage', 'storeData');

    spatialInterface.addReadPublicDataListener('storage', 'status', status => {
        if (status && status.hasOwnProperty('startTime')) {
            startTime = status.startTime;
            endTime = status.endTime;
            if (startTime < 0) {
                setRecordingState(RecordingState.empty);
            } else if (endTime < 0) {
                setRecordingState(RecordingState.recording);
            } else {
                setRecordingState(RecordingState.done);
            }
            if (status.summary) {
                const container = document.createElement('div');
                container.id = 'summaryContainer';
                // TODO if the socket io connection is compromised then this is
                // compromised too
                container.innerHTML = status.summary;
                launchButton.appendChild(container);
                launchButton.style.width = '2400px';
                launchButton.style.height = '1600px';
                spatialInterface.changeFrameSize(2400, 1600);
                const card = container.querySelector('.analytics-region-card');
                card.setAttribute('style', '');
                // card.classList.add('minimized');
                // card.addEventListener('pointermove', () => { // should be `over`
                //     card.classList.remove('minimized');
                // });
                // card.addEventListener('pointerout', () => {
                //     card.classList.add('minimized');
                // });
                let pin = container.querySelector('.analytics-region-card-pin');
                pin.parentNode.removeChild(pin);
                let enter = container.querySelector('.analytics-region-card-enter');
                enter.parentNode.removeChild(enter);

                const launchIcon = document.getElementById('launchIcon');
                launchIcon.parentNode.removeChild(launchIcon);
            }
        }
    });

    spatialInterface.addReadPublicDataListener('storage', 'cards', cards => {
        knownRegionCards = cards;
        if (knownRegionCards.length > 0) {
            spatialInterface.analyticsHydrateRegionCards(knownRegionCards);
        }
    });
});
