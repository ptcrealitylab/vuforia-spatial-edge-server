/* global Envelope, SpatialInterface */
import { VideoUI, VideoUIStates } from './scripts/VideoUI.js';

const MAX_RECORDING_DURATION = 20000;

let videoUI;
let videoPlayback;
let recordingActive = false;
let virtualizerRecordingTimeout = null;
let defaultUrls;

// The following timeout and interval allow for one instance of the tool to declare itself the leader and be in charge of synchronizing state
// Heartbeat-style status updates are necessary to allow for new connections to know the current state rather than an outdated one
let selfNominateTimeout;
const selfNominateTimeoutDuration = 5000 + Math.random() * 1000; // Seconds before self-nomination
let leaderBroadcastInterval;
let leaderBroadcastIntervalDuration = 1000;
let leaderId = 0;

let spatialInterface;

if (!spatialInterface) {
    spatialInterface = new SpatialInterface();
}

const launchButton = document.querySelector('#launchButton');
launchButton.addEventListener('pointerup', function () {
    envelope.open();
}, false);

// add random init gradient for the tool icon
const randomDelay = -Math.floor(Math.random() * 100);
launchButton.style.animationDelay = `${randomDelay}s`;

const envelopeContainer = document.querySelector('#envelopeContainer');
const envelope = new Envelope(spatialInterface, [], envelopeContainer, launchButton, true, false);
envelope.onClose(() => {
    if (videoPlayback) {
        videoPlayback.dispose();
        videoPlayback = null;
    }
    if (videoUI.state === VideoUIStates.RECORDING) {
        spatialInterface.stopVirtualizerRecording(() => {});
        recordingActive = false;
        virtualizerRecordingTimeout = null;
    }
    if (selfNominateTimeout) {
        clearTimeout(selfNominateTimeout);
    }
    if (leaderBroadcastInterval) {
        clearInterval(leaderBroadcastInterval);
    }
    if (defaultUrls) {
        videoUI.setState(VideoUIStates.WAITING_FOR_USER);
    } else {
        videoUI.setState(VideoUIStates.EMPTY);
    }
});
envelope.onBlur(() => {
    envelopeContainer.style.display = 'none'; // hide the 2D UI
});
envelope.onFocus(() => {
    envelopeContainer.style.display = ''; // show the UI
});

const leaderBroadcast = () => {
    spatialInterface.writePublicData('storage', 'status', {
        state: videoUI.state,
        currentTime: videoPlayback.currentTime,
        id: videoPlayback.id
    });
};

const waitForNomination = () => {
    selfNominateTimeout = setTimeout(() => {
        selfNominateTimeout = null;
        leaderBroadcast();
        leaderBroadcastInterval = setInterval(() => {
            leaderBroadcast();
        }, leaderBroadcastIntervalDuration);
    }, selfNominateTimeoutDuration);
};

const loadFromURLs = (urls) => {
	console.log('loadFromURLs', urls);
    if (!videoPlayback) {
        videoUI.setState(VideoUIStates.LOADING);
        videoPlayback = spatialInterface.createVideoPlayback(urls);
        videoPlayback.onStateChange(state => {
            if (videoUI.state === VideoUIStates.LOADING && state !== VideoUIStates.LOADING) {
                waitForNomination();
            }
            videoUI.setState(state);
        });
    }
};

const startRecording = () => {
    if (!recordingActive) {
        recordingActive = true;
        spatialInterface.startVirtualizerRecording();
        virtualizerRecordingTimeout = setTimeout(() => {
            stopRecording();
        }, MAX_RECORDING_DURATION); // Max recording of 20 seconds
    }
};

const stopRecording = () => {
    clearTimeout(virtualizerRecordingTimeout);
    virtualizerRecordingTimeout = null;
    if (recordingActive) {
        spatialInterface.stopVirtualizerRecording((baseUrl, recordingId, deviceId) => {
            setTimeout(() => {
                const urls = {
                    color: `${baseUrl}/virtualizer_recordings/${deviceId}/color/${recordingId}.mp4`,
                    rvl: `${baseUrl}/virtualizer_recordings/${deviceId}/depth/${recordingId}.dat`
                };
                loadFromURLs(urls);
                spatialInterface.writePublicData('storage', 'urls', JSON.stringify(urls));
            }, 15000); // TODO (extra feature request): don't use timeout, call stopVirtualizerRecording from userinterface once video is ready on toolboxedge
        });
    }
    recordingActive = false;
};

spatialInterface.onSpatialInterfaceLoaded(function() {
    spatialInterface.setVisibilityDistance(100);
    spatialInterface.setMoveDelay(300);
    spatialInterface.setAlwaysFaceCamera(true);
    videoUI = new VideoUI(envelopeContainer, {onButtonPress: () => {
        if (videoUI.state === VideoUIStates.EMPTY) {
            if (!window.isDesktop()) {
                videoUI.setState(VideoUIStates.RECORDING);
                startRecording();
            } else {
                console.log('Spatial Video tool cannot record on desktop.');
            }
        } else if (videoUI.state === VideoUIStates.WAITING_FOR_USER) {
            loadFromURLs(defaultUrls);
        } else if (videoUI.state === VideoUIStates.RECORDING) {
            videoUI.setState(VideoUIStates.SAVING);
            stopRecording();
        } else if (videoUI.state === VideoUIStates.PAUSED) {
            videoPlayback.play();
            spatialInterface.writePublicData('storage', 'status', {
                state: VideoUIStates.PLAYING,
                currentTime: videoPlayback.currentTime,
                id: videoPlayback.id
            });
        } else if (videoUI.state === VideoUIStates.PLAYING) {
            videoPlayback.pause();
            spatialInterface.writePublicData('storage', 'status', {
                state: VideoUIStates.PAUSED,
                currentTime: videoPlayback.currentTime,
                id: videoPlayback.id
            });
        } else {
            console.log(`Spatial Video button is not enabled during '${videoUI.state}' state.`);
        }
    }});

    spatialInterface.initNode('storage', 'storeData');
    spatialInterface.addReadPublicDataListener('storage', 'urls', data => {
        defaultUrls = JSON.parse(data);
        if (videoUI.state === VideoUIStates.EMPTY) {
            videoUI.setState(VideoUIStates.WAITING_FOR_USER);
        }
    });
    spatialInterface.addReadPublicDataListener('storage', 'status', status => {
        if (videoPlayback && (videoUI.state === VideoUIStates.PAUSED || videoUI.state === VideoUIStates.PLAYING)) {
            if (status.id !== leaderId || videoPlayback.state === VideoUIStates.PAUSED) { // Do not resync with same leader during playback, causes stutters due to lag
                videoPlayback.currentTime = status.currentTime;
                videoUI.setCurrentTime(status.currentTime);
            }
            if (status.state === 'PLAYING') {
                videoPlayback.play();
            } else if (status.state === 'PAUSED') {
                videoPlayback.pause();
            } else {
                console.error(`Received invalid update status state: ${status.state}`);
            }
            if (selfNominateTimeout) {
                clearTimeout(selfNominateTimeout);
            }
            if (leaderBroadcastInterval) {
                clearInterval(leaderBroadcastInterval);
            }
            waitForNomination();
            leaderId = status.id;
        }
    });
});
