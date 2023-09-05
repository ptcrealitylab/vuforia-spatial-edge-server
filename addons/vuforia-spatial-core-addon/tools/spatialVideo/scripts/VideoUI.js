const VideoUIStates = {
    EMPTY: 'EMPTY', // No recording yet
    WAITING_FOR_USER: 'WAITING_FOR_USER', // URL has been set, but waiting until user starts the load manually
    RECORDING: 'RECORDING', // Currently recording
    SAVING: 'SAVING', // Saving the recording
    LOADING: 'LOADING', // Loading the recording
    PAUSED: 'PAUSED', // Video paused
    PLAYING: 'PLAYING', // Playing video
};

class VideoUI {
    constructor(parentElement, callbacks) {
        this.parentElement = parentElement;
        this.callbacks = callbacks;
        this.button = document.getElementById('imageContainer');
        this.icons = ['empty', 'emptyBlocked', 'paused', 'recording', 'playing', 'loading', 'saving', 'waitingForUser'].map(iconName => {
            const imageElement = document.createElement('img');
            if (iconName === 'saving' || iconName === 'waitingForUser' || iconName === 'loading') {
                imageElement.src = `sprites/${iconName}.svg`;
            } else  {
                imageElement.src = `sprites/${iconName}.png`;
                if (iconName === 'playing') {
                    imageElement.style.padding = '18px 13px 18px 19px';
                } else if (iconName === 'recording' || iconName === 'paused') {
                    imageElement.style.padding = '18px';
                }
            };
            imageElement.iconName = iconName;
            this.parentElement.appendChild(imageElement);
            imageElement.hidden = true;
            imageElement.addEventListener('pointerup', e => {
                if (e.button === 0) {
                    this.callbacks.onButtonPress(this);
                }
            });
            return imageElement;
        });
        this.icons.getByName = (name) => {
            return this.icons.find(icon => icon.iconName.toLowerCase() === name.toLowerCase());
        };

        this.setState(VideoUIStates.EMPTY);
    }
    setIconByName(iconName) {
        this.icons.forEach(icon => icon.hidden = true);
        this.icons.getByName(iconName).hidden = false;
    }
    setState(state) {
        this.state = state;
        if (this.state === VideoUIStates.EMPTY) {
            if (window.isDesktop()) {
                this.setIconByName('emptyBlocked'); // Recording disabled on desktop
            } else {
                this.setIconByName('empty');
            }
        } else if (this.state === VideoUIStates.WAITING_FOR_USER) {
            this.setIconByName('waitingForUser');
        } else if (this.state === VideoUIStates.RECORDING) {
            this.setIconByName('recording');
            this.button.classList.add('recording')
        } else if (this.state === VideoUIStates.SAVING) {
            this.setIconByName('saving');
            this.button.classList.remove('recording');
        } else if (this.state === VideoUIStates.LOADING) {
            this.setIconByName('loading');
        } else if (this.state === VideoUIStates.PAUSED) {
            this.setIconByName('playing');
        } else if (this.state === VideoUIStates.PLAYING) {
            this.setIconByName('paused');
        }
    }
    setCurrentTime(_currentTime) {
        // TODO: add scrubber and show playback time in UI
    }
}

export { VideoUI, VideoUIStates };
