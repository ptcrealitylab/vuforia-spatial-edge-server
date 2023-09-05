(function(exports) {
    let spatialInterface;
    let envelope;
    let isFirstCreated = false;
    let titleFromStorage = null;
    let labelTitle;

    const MINIMIZED_TOOL_WIDTH = 900;
    const MINIMIZED_TOOL_HEIGHT = 600;
    
    let screenDimensions = null;

    function init() {
        try {
            let uiWhenClosed = document.getElementById('label');
            let uiWhenOpen = document.getElementById('viewContainer');
            spatialInterface = new SpatialInterface();
            envelope = new Envelope(spatialInterface, [], uiWhenOpen, uiWhenClosed, false, false, true);
            uiWhenClosed.addEventListener('pointerup', (e) => {
                envelope.open();
            });
            
            envelope.onClose((e) => {
                spatialInterface.changeFrameSize(MINIMIZED_TOOL_WIDTH, MINIMIZED_TOOL_HEIGHT);
            });
            
            envelope.onOpen((e) => {
                if (!screenDimensions) return;
                spatialInterface.changeFrameSize(screenDimensions.width, screenDimensions.height);

                let searchDiv = document.getElementById('searchView');
                let embeddedContentDiv = document.getElementById('embeddedContentView');

                let resultTitle = window.storage.getCachedValue('resultTitle');
                let fileData = window.storage.getCachedValue('fileData');
                if (resultTitle) {
                    let embeddedContentView = new EmbeddedContentView(embeddedContentDiv, spatialInterface);
                    embeddedContentView.loadResult(resultTitle, fileData);
                    
                    searchDiv.style.display = 'none';
                    embeddedContentDiv.style.display = '';
                } else {
                    // let searchView = document.getElementById('searchView');
                    // searchView.style.display = '';
                    window.searchView = new SearchView(spatialInterface, (e, pickedResult) => {
                        if (e.getAttribute('fileData')) {
                            let fileData = JSON.parse(e.getAttribute('fileData'));
                            console.log(fileData.path);
                            // console.log('got file data', window.sendFileData(fileData));
                            window.storage.write('fileData', fileData);
                        }
                        console.log(pickedResult);
                        setLabelTitle(pickedResult, true);
                        window.storage.write('resultTitle', pickedResult);
                        if (window.selectedAppIconSrc) {
                            window.storage.write('iconSrc', window.selectedAppIconSrc);
                        }
                        setMinimizedIcon(window.selectedAppIconSrc);
                        envelope.close();
                    });

                    embeddedContentDiv.style.display = 'none';
                    searchDiv.style.display = '';
                }

            });
        } catch (e) {
            console.warn('Cannot initialize SpatialInterface outside of the Spatial Toolbox');
        }

        if (!spatialInterface) {
            return;
        }

        // document.getElementById('viewContainer').style.display = 'none';
        // document.getElementById('label').style.display = 'none';

        labelTitle = document.getElementById('labelTitle');
        // label = document.getElementById('label');

        spatialInterface.wasToolJustCreated((result) => {
            isFirstCreated = result;

            // if (!isFirstCreated) {
            //     document.getElementById('viewContainer').style.display = '';
            //     document.getElementById('label').style.display = '';
            // }

            spatialInterface.setMoveDelay(300);
            spatialInterface.setAlwaysFaceCamera(true);
            spatialInterface.initNode('storage', 'storeData');
            // spatialInterface.setPinned(false); // unpinned by default, unlike most other tools
            spatialInterface.setPinned(true); // pinned by default
            window.initStorage(spatialInterface, 'storage');
            // window.initMediaAttachments(spatialInterface);

            window.storage.listen('resultTitle', (titleText) => {
                if (typeof titleText === 'string') {
                    titleFromStorage = titleText;
                    setLabelTitle(titleText, true);
                }
            });

            window.storage.listen('iconSrc', (iconSrc) => {
                if (typeof iconSrc === 'string') {
                    // titleFromStorage = titleText;
                    setMinimizedIcon(iconSrc, true);
                }
            });

            window.storage.listen('fileData', (fileData) => {
                console.log('found fileData', fileData);
            });

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

                // document.getElementById('layout').style.position = 'absolute';
                // document.getElementById('layout').style.width = innerWidth + 'px';
                // document.getElementById('layout').style.left = innerMargin + 'px';

                // spatialInterface.changeFrameSize(width, height);
                spatialInterface.changeFrameSize(width, height);
                
                // let dimensions = {
                //     open: {
                //         width: width,
                //         height: height
                //     },
                //     closed: {
                //         width: MINIMIZED_TOOL_WIDTH,
                //         height: MINIMIZED_TOOL_HEIGHT
                //     }
                // }

                // modules.distanceHandler.init(spatialInterface, dimensions.open, dimensions.closed, innerWidth);

                if (isFirstCreated) {
                    envelope.open();
                }

                //     modules.distanceHandler.transitionToFullscreen(false);
                //
                //     setTimeout(function() {
                //         document.getElementById('viewContainer').style.display = '';
                //         document.getElementById('label').style.display = '';
                //     }, 100);
                // }

                // spatialInterface.subscribeToDeviceDistance(function(distance) {
                //     modules.distanceHandler.onDistanceToTool(distance);
                // });
            });
        });
    }

    function setLabelTitle(titleText, dontWrite) {
        labelTitle.innerText = titleText;
        // if (titleText && titleText.length > 0) {
        //     label.classList.remove('noTitle');
        // }
        // write to storage node unless this is being triggered by reading the node
        if (!dontWrite) {
            spatialInterface.writePublicData('storage', 'resultTitle', titleText);
        }
    }
    function setMinimizedIcon(iconSrc) {
        document.getElementById('minimizedIcon').src = iconSrc;
    }

    window.onload = function() {
        init();
    };
})(window);
