import { PersistentStorage } from './PersistentStorage.js';
import { MediaAttachments } from './MediaAttachments.js';
import { ConversationView, TEMP_DISABLE_PIN_FUNCTIONALITY } from './ConversationView.js';

(function(exports) {
    let spatialInterface;
    let envelope;
    let isFirstCreated = false;
    let screenDimensions = null;
    const MINIMIZED_TOOL_WIDTH = 900;
    const MINIMIZED_TOOL_HEIGHT = 600;
    let conversationView = null;
    let titleFromStorage = null;
    let pinnedFromStorage = true; // default
    let resolvedFromStorage = false; // default
    const DEFAULT_MESSAGE_TITLE = 'Message';

    function init() {
        try {
            let uiWhenClosed = document.getElementById('layout');
            let uiWhenOpen = document.getElementById('viewContainer');
            spatialInterface = new SpatialInterface();
            envelope = new Envelope(spatialInterface, [], uiWhenOpen, uiWhenClosed, false, false, true);
            uiWhenClosed.addEventListener('pointerup', (e) => {
                envelope.open();
            });
            envelope.onClose((_e) => {
                spatialInterface.changeFrameSize(MINIMIZED_TOOL_WIDTH, MINIMIZED_TOOL_HEIGHT);
                
                if (conversationView) {
                    conversationView.hide();
                }
            });
            envelope.onOpen((_e) => {
                if (!screenDimensions) return;
                spatialInterface.changeFrameSize(screenDimensions.width, screenDimensions.height);

                if (!conversationView) {
                    conversationView = new ConversationView(uiWhenOpen, spatialInterface, titleFromStorage, pinnedFromStorage, resolvedFromStorage);
                    
                    conversationView.onTitleUpdated((titleText) => {
                        setLabelTitle(titleText)
                    });
                    conversationView.onPinnedUpdated((isPinned) => {
                        setPinned(isPinned);
                    });
                    conversationView.onResolvedUpdated((isResolved) => {
                        setResolved(isResolved);
                    });
                }
                conversationView.show(false); // param adds a delay if waiting for CSS animation
            });
        } catch (e) {
            console.warn('Cannot initialize SpatialInterface outside of the Spatial Toolbox');
        }

        if (!spatialInterface) return;

        spatialInterface.wasToolJustCreated((result) => {
            isFirstCreated = result;

            if (spatialInterface.getEnvironmentVariables) {
                spatialInterface.getEnvironmentVariables().then(environmentVariables => {
                    window.environmentVariables = environmentVariables;

                    if (conversationView) {
                        conversationView.updateUIForEnvironmentVariables();
                    }
                });
            }

            if (spatialInterface.getUserDetails) {
                spatialInterface.getUserDetails().then(userDetails => {
                    console.log(userDetails);
                    window.userDetails = userDetails;
                });
            }

            spatialInterface.setMoveDelay(300);
            spatialInterface.setAlwaysFaceCamera(true);
            spatialInterface.initNode('storage', 'storeData');

            if (!TEMP_DISABLE_PIN_FUNCTIONALITY) {
                // spatialInterface.setPinned(false); // unpinned by default, unlike most other tools
                spatialInterface.setPinned(true); // pinned by default
            }

            setLabelTitle(DEFAULT_MESSAGE_TITLE, true);

            window.storage = new PersistentStorage(spatialInterface, 'storage');
            window.mediaAttachments = new MediaAttachments(spatialInterface);

            window.storage.listen('title', function(titleText) {
                if (typeof titleText === 'string') {
                    titleFromStorage = titleText;
                    setLabelTitle(titleText, true);
                }
            });
            window.storage.listen('pinned', function(isPinned) {
                console.log('distanceHandler view got pinned ' + isPinned);
                pinnedFromStorage = isPinned;
                setPinned(isPinned);
            }.bind(this));
            window.storage.listen('resolved', function(isResolved) {
                console.log('distanceHandler view got resolved ' + isResolved);
                resolvedFromStorage = isResolved;
                setResolved(isResolved);
            }.bind(this));
            window.storage.load();

            spatialInterface.getScreenDimensions((width, height) => {
                let innerWidth = width;
                let innerMargin = 0;
                if (width > height) {
                    innerMargin = (width - height) / 2; // so we can center it
                    innerWidth = height; // if not in portrait mode (e.g. remote operator), change aspect ratio
                }

                screenDimensions = {
                    width: width,
                    height: height
                }

                document.body.width = width + 'px';
                document.body.height = height + 'px';
                document.body.style.width = width + 'px';
                document.body.style.height = height + 'px';

                // spatialInterface.changeFrameSize(width, height);

                if (isFirstCreated) {
                    envelope.open();
                }
            });
        });
    }

    function calculateFontSize(stringLength, pixelWidth) {
        return (pixelWidth / stringLength * 2);
    }

    function setLabelTitle(titleText, dontWrite) {
        let labelTitle = document.getElementById('labelTitle');
        let label = document.getElementById('label');

        labelTitle.innerText = titleText;
        if (titleText && titleText.length > 0) {
            label.classList.remove('noTitle');
        }

        let labelFontSize = 100;
        if (titleText.length > 6) {
            let labelWidth = label.getBoundingClientRect().width || MINIMIZED_TOOL_WIDTH;
            labelFontSize = calculateFontSize(titleText.length,  labelWidth - 180);
            labelFontSize = Math.max(40, Math.min(100, labelFontSize));
        }
        if (titleText.length > 20) {
            labelTitle.classList.add('longTitle');
        } else {
            labelTitle.classList.remove('longTitle');
        }
        labelTitle.style.fontSize = `${labelFontSize}px`;
        labelTitle.style.lineHeight = `${labelFontSize}px`;

        // write to storage node unless this is being triggered by reading the node
        if (!dontWrite) {
            spatialInterface.writePublicData('storage', 'title', titleText);
        }
    }

    function setPinned(isPinned) {
        if (isPinned) {
            document.getElementById('labelPinnedIcon').classList.remove('labelIconHidden');
        } else {
            document.getElementById('labelPinnedIcon').classList.add('labelIconHidden');
        }
    }

    function setResolved(isResolved) {
        let blob = document.getElementById('blob');

        if (isResolved) {
            blob.style.backgroundColor = 'rgba(0,255,0,1.0)';
        } else {
            blob.style.backgroundColor = 'rgba(255,255,0,1.0)';
        }
    }

    window.onload = function() {
        init();
    };
})(window);
