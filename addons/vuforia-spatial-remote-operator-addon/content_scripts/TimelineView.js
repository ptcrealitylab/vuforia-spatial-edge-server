createNameSpace('realityEditor.videoPlayback');

(function (exports) {
    const ZOOM_EXPONENT = 0.5; // the zoom bar doesn't zoom linearly with position
    const MAX_ZOOM_FACTOR = 96; // 96 means maximum zoom narrows down 24 hours to 15 minutes
    const SUPPORTED_SPEEDS = [1, 2, 4, 8, 16, 32, 64, 128, 256]; // only have these SVGs for now
    const TRACK_HEIGHT_PERCENT = 80.0; // other 20% of container is split among margins between each track
    // constants that need to be updated if SVG size or CSS is updated:
    const PLAYHEAD_WIDTH = 20;
    const TRACK_CONTAINER_MARGIN = 20;
    const VIDEO_PREVIEW_CONTAINER_OFFSET = 160;
    const PLAYHEAD_DOT_WIDTH = 10;
    const ZOOM_BAR_MARGIN = 20;

    // The TimelineView is responsible for creating and updating the DOM elements to match the TimelineModel
    // It's main input is the render function, which can be triggered to update the UI with the state passed in
    // It contains a few callbacks that the Controller can subscribe to in order to update the model in response to interactions
    class TimelineView {
        constructor(parent) {
            this.playButton = null;
            this.speedButton = null;
            this.calendarButton = null;
            this.callbacks = {
                onZoomHandleChanged: [],
                onPlayheadSelected: [],
                onPlayheadChanged: [],
                onScrollbarChanged: [],
                onVideoElementAdded: []
            };
            this.videoElements = {};
            this.buildDomElement(parent);
        }
        onZoomHandleChanged(callback) {
            this.callbacks.onZoomHandleChanged.push(callback);
        }
        onPlayheadSelected(callback) {
            this.callbacks.onPlayheadSelected.push(callback);
        }
        onPlayheadChanged(callback) {
            this.callbacks.onPlayheadChanged.push(callback);
        }
        onScrollbarChanged(callback) {
            this.callbacks.onScrollbarChanged.push(callback);
        }
        buildDomElement(parent) {
            // create a timeline, a playhead on the timeline for scrolling, and play/pause/controls
            this.timelineContainer = this.createTimelineElement();
            parent.appendChild(this.timelineContainer);

            // create containers for two preview videos
            let videoPreviewContainer = document.getElementById('timelineVideoPreviewContainer');

            let colorPreviewContainer = document.createElement('div');
            colorPreviewContainer.classList.add('videoPreviewContainer');
            colorPreviewContainer.id = 'timelineColorPreviewContainer';

            let depthPreviewContainer = document.createElement('div');
            depthPreviewContainer.classList.add('videoPreviewContainer');
            depthPreviewContainer.id = 'timelineDepthPreviewContainer';
            depthPreviewContainer.style.left = 256 + 'px';

            videoPreviewContainer.appendChild(colorPreviewContainer);
            // videoPreviewContainer.appendChild(depthPreviewContainer);
        }
        createTimelineElement() {
            let container = document.createElement('div');
            container.id = 'timelineContainer';
            // container has a left box to hold date/time, a center box for the timeline, and a right box for playback controls
            let leftBox = document.createElement('div');
            let centerBox = document.createElement('div');
            let rightBox = document.createElement('div');
            [leftBox, centerBox, rightBox].forEach(elt => {
                elt.classList.add('timelineBox');
                container.appendChild(elt);
            });
            leftBox.id = 'timelineVisibilityBox';
            centerBox.id = 'timelineTrackBox';
            rightBox.id = 'timelineControlsBox';

            // extra div added to box with slightly different dimensions, to hide the horizontal overflow
            let centerScrollBox = document.createElement('div');
            centerScrollBox.id = 'timelineTrackScrollBox';
            centerBox.appendChild(centerScrollBox);

            let innerScrollBox = document.createElement('div');
            innerScrollBox.id = 'timelineTrackScrollBoxInner';
            centerScrollBox.appendChild(innerScrollBox);

            // the element that will actually hold the data tracks and segments
            let timelineTracksContainer = document.createElement('div');
            timelineTracksContainer.id = 'timelineTracksContainer';
            innerScrollBox.appendChild(timelineTracksContainer);

            let timestampDisplay = document.createElement('div');
            timestampDisplay.id = 'timelineTimestampDisplay';
            timestampDisplay.innerText = this.getFormattedTime(new Date(0));
            leftBox.appendChild(timestampDisplay);

            let dateDisplay = document.createElement('div');
            dateDisplay.id = 'timelineDateDisplay';
            dateDisplay.innerText = this.getFormattedDate(Date.now());
            leftBox.appendChild(dateDisplay);

            let calendarButton = document.createElement('img');
            calendarButton.id = 'timelineCalendarButton';
            calendarButton.src = '/addons/vuforia-spatial-remote-operator-addon/calendarButton.svg';
            leftBox.appendChild(calendarButton);
            this.calendarButton = calendarButton;

            let zoomBar = this.createZoomBar();
            zoomBar.id = 'timelineZoomBar';
            leftBox.appendChild(zoomBar);

            let playhead = document.createElement('img');
            playhead.id = 'timelinePlayhead';
            playhead.src = '/addons/vuforia-spatial-remote-operator-addon/timelinePlayhead.svg';
            innerScrollBox.appendChild(playhead);
            this.playhead = playhead;

            let playheadDot = document.createElement('div');
            playheadDot.id = 'timelinePlayheadDot';
            innerScrollBox.appendChild(playheadDot);

            let videoPreviewContainer = document.createElement('div');
            videoPreviewContainer.id = 'timelineVideoPreviewContainer';
            videoPreviewContainer.classList.add('timelineBox');
            videoPreviewContainer.classList.add('timelineVideoPreviewNoTrack'); // need to click on timeline to select
            innerScrollBox.appendChild(videoPreviewContainer);
            // left = -68px is most left as possible
            // width = 480px for now, to show both, but should change to 240px eventually

            let scrollBar = this.createScrollBar();
            scrollBar.id = 'timelineScrollBar';
            innerScrollBox.appendChild(scrollBar);

            let playButton = document.createElement('img');
            playButton.id = 'timelinePlayButton';
            playButton.src = '/addons/vuforia-spatial-remote-operator-addon/playButton.svg';
            this.playButton = playButton;

            // let seekButton = document.createElement('img');
            // seekButton.id = 'timelineSeekButton';
            // seekButton.src = '/addons/vuforia-spatial-remote-operator-addon/seekButton.svg';

            let speedButton = document.createElement('img');
            speedButton.id = 'timelineSpeedButton';
            speedButton.src = '/addons/vuforia-spatial-remote-operator-addon/speedButton_1x.svg';
            this.speedButton = speedButton;

            [playButton, speedButton].forEach(elt => {
                elt.classList.add('timelineControlButton');
                rightBox.appendChild(elt);
            });

            this.setupPlayhead();

            return container;
        }
        createZoomBar() {
            let container = document.createElement('div');
            let slider = document.createElement('img');
            slider.id = 'zoomSliderBackground';
            slider.src = '/addons/vuforia-spatial-remote-operator-addon/zoomSliderBackground.svg';
            container.appendChild(slider);
            let handle = document.createElement('img');
            handle.id = 'zoomSliderHandle';
            handle.src = '/addons/vuforia-spatial-remote-operator-addon/zoomSliderHandle.svg';
            container.appendChild(handle);
            let isDown = false;
            handle.addEventListener('pointerdown', _e => {
                isDown = true;
            });
            document.addEventListener('pointerup', _e => {
                isDown = false;
            });
            document.addEventListener('pointercancel', _e => {
                isDown = false;
            });
            document.addEventListener('pointermove', e => {
                if (!isDown) { return; }
                let pointerX = e.pageX;
                let leftMargin = ZOOM_BAR_MARGIN;
                let rightMargin = ZOOM_BAR_MARGIN;
                let sliderRect = slider.getBoundingClientRect();
                let handleWidth = handle.getBoundingClientRect().width;

                if (pointerX < (sliderRect.left + leftMargin)) {
                    handle.style.left = leftMargin - (handleWidth / 2) + 'px';
                } else if (pointerX > (sliderRect.right - rightMargin)) {
                    handle.style.left = (sliderRect.width - rightMargin - handleWidth / 2) + 'px';
                } else {
                    handle.style.left = pointerX - sliderRect.left - (handleWidth / 2) + 'px';
                }

                // we scale from linear to sqrt so that it zooms in faster when it is further zoomed out than when it is already zoomed in a lot
                let linearZoom = (parseFloat(handle.style.left) - handleWidth / 2) / ((sliderRect.right - rightMargin) - (sliderRect.left + leftMargin));
                let percentZoom = Math.pow(Math.max(0, linearZoom), ZOOM_EXPONENT);
                let MAX_ZOOM = 1.0 - (1.0 / MAX_ZOOM_FACTOR); // max zoom level is 96x (15 minutes vs 1 day)

                // trigger callbacks to respond to the updated GUI
                this.callbacks.onZoomHandleChanged.forEach(cb => {
                    cb(Math.max(0, Math.min(MAX_ZOOM, percentZoom)));
                });

                // update the scrollbar, which in return will update the model dataview
            });
            return container;
        }
        onZoomChanged(zoomPercent, playheadTimePercent, scrollbarLeftPercent) { // TODO: make use of render functions to simplify
            // make the zoom bar handle fill 1.0 - zoomPercent of the overall bar
            let scrollBar = document.getElementById('timelineScrollBar');
            let handle = scrollBar.querySelector('.timelineScrollBarHandle');
            let playheadDot = document.getElementById('timelinePlayheadDot');
            let trackBox = document.getElementById('timelineTrackBox');
            handle.style.width = (1.0 - zoomPercent) * 100 + '%';

            if (zoomPercent < 0.01) {
                scrollBar.classList.add('timelineScrollBarFadeout');
                playheadDot.classList.add('timelineScrollBarFadeout');
            } else {
                scrollBar.classList.remove('timelineScrollBarFadeout');
                playheadDot.classList.remove('timelineScrollBarFadeout');
            }

            let handleRect = handle.getBoundingClientRect();
            let scrollBarRect = scrollBar.getBoundingClientRect();
            let trackBoxRect = trackBox.getBoundingClientRect();
            let newWidth = handleRect.width;
            let maxLeft = scrollBarRect.width - newWidth;

            if (typeof scrollbarLeftPercent === 'undefined') {
                // keep the timeline playhead at the same timestamp and zoom around that
                let containerWidth = trackBoxRect.width;
                let playheadElement = document.getElementById('timelinePlayhead');
                let leftMargin = 20;
                let rightMargin = 20;
                let halfPlayheadWidth = 10;
                let playheadLeft = parseInt(playheadElement.style.left) || halfPlayheadWidth;
                let playheadTimePercentWindow = (playheadLeft + halfPlayheadWidth - leftMargin) / (containerWidth - halfPlayheadWidth - leftMargin - rightMargin);

                // let absoluteTime = this.dayBounds.min + playheadTimePercentDay * this.DAY_LENGTH;

                // TODO: separate metadata time from window time from day length so we can perform these calculations
                // let playheadTimePercent = (this.playheadTimestamp - this.trackInfo.metadata.minTime) / (this.trackInfo.metadata.maxTime - this.trackInfo.metadata.minTime);
                // console.log('timepercent = ' + playheadTimePercent);

                // reposition the scrollbar handle left so that it would keep the playhead at the same spot.

                // if previous leftPercent is 0, new leftPercent is 0
                // move scrollbar handle to playheadTimePercent, then move it so playhead is playheadTimePercent within the handle width
                let newLeft = (playheadTimePercent * scrollBarRect.width) - (playheadTimePercentWindow * handleRect.width);
                // TODO: this is off if you scroll in halfway, move playhead sideways, then continue scrolling
                handle.style.left = Math.max(0, Math.min(maxLeft, newLeft)) + 'px';

            } else {
                let newLeft = scrollbarLeftPercent * scrollBar.getBoundingClientRect().width;
                handle.style.left = Math.max(0, Math.min(maxLeft, newLeft)) + 'px';
            }
            handleRect = handle.getBoundingClientRect(); // recompute after moving handle

            let startPercent = (handleRect.left - scrollBarRect.left) / scrollBarRect.width;
            let endPercent = (handleRect.right - scrollBarRect.left) / scrollBarRect.width;
            // this.onTimelineWindowChanged(zoomPercent, startPercent, endPercent);

            this.callbacks.onScrollbarChanged.forEach(cb => {
                cb(zoomPercent, startPercent, endPercent);
            });
        }
        createScrollBar() {
            let container = document.createElement('div');
            let handle = document.createElement('div');
            container.appendChild(handle);
            // container.classList.add('hiddenScrollBar'); // TODO: add this after a few seconds of not interacting or hovering over the scrollable panel
            container.classList.add('timelineScrollBarContainer');
            handle.classList.add('timelineScrollBarHandle');
            let isDown = false;
            let pointerOffset = 0;
            handle.addEventListener('pointerdown', e => {
                isDown = true;
                let handleRect = handle.getBoundingClientRect();
                pointerOffset = e.pageX - (handleRect.left + handleRect.width / 2);
            });
            document.addEventListener('pointerup', _e => {
                isDown = false;
            });
            document.addEventListener('pointercancel', _e => {
                isDown = false;
            });
            document.addEventListener('pointermove', e => {
                if (!isDown) { return; }
                let pointerX = e.pageX;
                let containerRect = container.getBoundingClientRect();
                let handleRect = handle.getBoundingClientRect();

                if (pointerX < containerRect.left + handleRect.width / 2) {
                    handle.style.left = '0px';
                } else if (pointerX > containerRect.right - handleRect.width / 2) {
                    handle.style.left = (containerRect.width - handleRect.width) + 'px';
                } else {
                    handle.style.left = (pointerX - pointerOffset) - (containerRect.left + handleRect.width / 2) + 'px';
                }

                handleRect = handle.getBoundingClientRect(); // recompute handleRect after moving handle
                let startPercent = (handleRect.left - containerRect.left) / containerRect.width;
                let endPercent = (handleRect.right - containerRect.left) / containerRect.width;
                let zoomPercent = 1.0 - handleRect.width / containerRect.width;

                this.callbacks.onScrollbarChanged.forEach(cb => {
                    cb(zoomPercent, startPercent, endPercent);
                });
            });
            return container;
        }
        setupPlayhead() {
            let playheadElement = this.playhead;
            document.addEventListener('pointermove', e => {
                this.onDocumentPointerMove(e);
            });
            playheadElement.addEventListener('pointerdown', _e => {
                this.playheadClickedDown = true;
                playheadElement.classList.add('timelinePlayheadSelected');

                let playheadDot = document.getElementById('timelinePlayheadDot');
                playheadDot.classList.add('timelinePlayheadSelected');

                let videoPreview = document.getElementById('timelineVideoPreviewContainer');
                videoPreview.classList.add('timelineVideoPreviewSelected');

                this.callbacks.onPlayheadSelected.forEach(cb => {
                    cb();
                });
            });
            document.addEventListener('pointerup', e => {
                this.onDocumentPointerUp(e);
            });
            document.addEventListener('pointercancel', e => {
                this.onDocumentPointerUp(e);
            });
        }
        onDocumentPointerUp(_e) {
            // reset playhead selection
            this.playheadClickedDown = false;
            let playheadElement = document.getElementById('timelinePlayhead');
            playheadElement.classList.remove('timelinePlayheadSelected');

            let playheadDot = document.getElementById('timelinePlayheadDot');
            playheadDot.classList.remove('timelinePlayheadSelected');

            let videoPreview = document.getElementById('timelineVideoPreviewContainer');
            videoPreview.classList.remove('timelineVideoPreviewSelected');
        }
        onDocumentPointerMove(e) {
            if (this.playheadClickedDown) {
                this.onPointerMovePlayhead(e);
            }
        }
        onPointerMovePlayhead(e) {
            let playheadElement = document.getElementById('timelinePlayhead');

            // calculate new X position to follow mouse, constrained to trackBox element
            let pointerX = e.pageX;

            let trackBox = document.getElementById('timelineTrackBox');
            let trackBoxRect = trackBox.getBoundingClientRect();

            let relativeX = pointerX - trackBoxRect.left;
            let leftMargin = 20;
            let rightMargin = 20;
            let halfPlayheadWidth = 10;
            playheadElement.style.left = Math.min(trackBoxRect.width - halfPlayheadWidth - rightMargin, Math.max(leftMargin, relativeX)) - halfPlayheadWidth + 'px';
            let playheadLeft = parseInt(playheadElement.style.left) || halfPlayheadWidth;
            // move timelineVideoPreviewContainer to correct spot (constrained to -68px < left < (innerWidth - 588)
            this.displayPlayheadVideoPreview(playheadLeft, halfPlayheadWidth);

            let playheadTimePercentWindow = (playheadLeft + halfPlayheadWidth - leftMargin) / (trackBoxRect.width - halfPlayheadWidth - leftMargin - rightMargin);

            this.callbacks.onPlayheadChanged.forEach(cb => {
                cb(playheadTimePercentWindow);
            });
        }
        /**
         * Update the GUI in response to new data from the model/controller
         * @param {{playheadTimePercent: number, timestamp: number, zoomPercent: number, scrollLeftPercent: number,
         * isPlaying: boolean, playbackSpeed: number, tracks: {}}} props
         */
        render(props) {
            // don't render if the timeline view is hidden
            if (this.timelineContainer.classList.contains('hiddenTimeline')) {
                return;
            }

            if (typeof props.playheadTimePercent !== 'undefined') {
                this.displayPlayhead(props.playheadTimePercent);
            }
            if (typeof props.playheadWithoutZoomPercent !== 'undefined') {
                this.displayPlayheadDot(props.playheadWithoutZoomPercent);
            }
            if (typeof props.timestamp !== 'undefined') {
                this.displayTime(props.timestamp);
            }
            if (typeof props.zoomPercent !== 'undefined') {
                this.displayZoom(props.zoomPercent);
                if (typeof props.scrollLeftPercent !== 'undefined') {
                    this.displayScroll(props.scrollLeftPercent, props.zoomPercent);
                }
            }
            if (typeof props.isPlaying !== 'undefined') {
                this.displayIsPlaying(props.isPlaying);
            }
            if (typeof props.playbackSpeed !== 'undefined') {
                this.displayPlaybackSpeed(props.playbackSpeed);
            }
            // TODO: add a more optimized pathway if we know the filtered database hasn't changed
            // e.g. (no new tracks/segments, just repositioning them within the changing window)
            if (typeof props.tracks !== 'undefined') {
                let fullUpdate = props.tracksFullUpdate;
                if (fullUpdate) {
                    this.fullUpdateTracks(props.tracks);
                } else {
                    this.updateTracks(props.tracks);
                }
                // this.displayTracks(props.tracks, fullUpdate);
            }
            if (typeof props.videoElements !== 'undefined') {
                this.displayVideoElements(props.videoElements);
            }
        }
        /**
         * @param {{colorOrDepth: string, trackId: string, src: string}[]} videoElements
         */
        displayVideoElements(videoElements) {
            // hide video preview if no elements in array
            if (videoElements.length === 0) {
                let videoPreviewContainer = document.getElementById('timelineVideoPreviewContainer');
                videoPreviewContainer.classList.add('timelineVideoPreviewNoTrack');
                let colorContainer = document.getElementById('timelineColorPreviewContainer');
                while (colorContainer.firstChild) {
                    colorContainer.removeChild(colorContainer.firstChild);
                }
            }

            videoElements.forEach(info => {
                // it is necessary to update the color and depth video elements with the correct src for this segment
                // since the point cloud rendering depends on reading pixel data from these video elements
                let videoElement = this.getOrCreateVideoElement(info.trackId, info.colorOrDepth, info.src);

                if (info.colorOrDepth !== 'color') { return; }

                // add color video to preview container
                let colorContainer = document.getElementById('timelineColorPreviewContainer');
                while (colorContainer.firstChild) {
                    colorContainer.removeChild(colorContainer.firstChild);
                }
                colorContainer.appendChild(videoElement);
                let videoPreviewContainer = document.getElementById('timelineVideoPreviewContainer');
                videoPreviewContainer.classList.remove('timelineVideoPreviewNoTrack');
                console.log('videoElement added to video preview container');
            });
        }
        getOrCreateVideoElement(trackId, colorOrDepth, src) {
            if (colorOrDepth !== 'color' && colorOrDepth !== 'depth') { console.warn('colorOrDepth is invalid in getVideoElement'); }

            if (typeof this.videoElements[trackId] === 'undefined') {
                this.videoElements[trackId] = { color: null, depth: null };
            }

            let videoElement = this.videoElements[trackId][colorOrDepth];
            if (!videoElement) {
                videoElement = this.createVideoElement(trackId, colorOrDepth);
            }

            // updates the src of this videoElement. there is one videoElement per track, but each time the segment changes this will update
            if (typeof src !== 'undefined') {
                let filename = src.replace(/^.*[\\\/]/, '');
                if (!videoElement.querySelector('source').src.includes(filename)) {
                    videoElement.querySelector('source').src = '/virtualizer_recording/' + trackId + '/' + colorOrDepth + '/' + filename;
                    videoElement.load();
                    this.callbacks.onVideoElementAdded.forEach(cb => {
                        cb(videoElement, colorOrDepth);
                    });
                }
            }
            return videoElement;
        }
        getVideoElementsForTrack(trackId) {
            if (!this.videoElements[trackId]) { return { color: null, depth: null }; }
            return {
                color: this.videoElements[trackId].color,
                depth: this.videoElements[trackId].depth
            };
        }
        createVideoElement(trackId, colorOrDepth) {
            const id = colorOrDepth + '_video_' + trackId;
            let video = document.createElement('video');
            video.id = id;
            video.classList.add('videoPreview');
            video.setAttribute('width', '256');
            // video.setAttribute('controls', 'controls');
            video.setAttribute('muted', 'muted');
            let source = document.createElement('source');
            video.appendChild(source);

            if (colorOrDepth === 'color') {
                this.videoElements[trackId].color = video;
            } else if (colorOrDepth === 'depth') {
                this.videoElements[trackId].depth = video;
            }
            return video;
        }
        onVideoElementAdded(callback) {
            this.callbacks.onVideoElementAdded.push(callback);
        }
        displayPlayhead(percentInWindow) {
            let trackBox = document.getElementById('timelineTrackBox');
            let containerWidth = trackBox.getBoundingClientRect().width;
            let halfPlayheadWidth = PLAYHEAD_WIDTH / 2;
            let leftMargin = TRACK_CONTAINER_MARGIN;
            let rightMargin = TRACK_CONTAINER_MARGIN;
            let playheadLeft = (percentInWindow * (containerWidth - halfPlayheadWidth - leftMargin - rightMargin)) - (halfPlayheadWidth - leftMargin);
            let playheadElement = document.getElementById('timelinePlayhead');
            playheadElement.style.left = playheadLeft + 'px';

            this.displayPlayheadVideoPreview(playheadLeft, halfPlayheadWidth);
        }
        displayPlayheadVideoPreview(playheadLeft, halfPlayheadWidth) {
            let videoPreviewContainer = document.getElementById('timelineVideoPreviewContainer');
            let videoPreviewContainerRect = videoPreviewContainer.getBoundingClientRect();
            if (videoPreviewContainer && videoPreviewContainerRect) {
                let previewWidth = videoPreviewContainerRect.width;
                let previewRelativeX = playheadLeft + halfPlayheadWidth - previewWidth / 2;
                let timelineTracksRight = document.getElementById('timelineTracksContainer').getBoundingClientRect().right;
                let clampMin = 0;
                let clampMax = (timelineTracksRight - previewWidth) - VIDEO_PREVIEW_CONTAINER_OFFSET;
                videoPreviewContainer.style.left = Math.min(clampMax, Math.max(clampMin, previewRelativeX)) + 'px';
            }
        }
        displayPlayheadDot(percentInDay) {
            // put a little dot on the scrollbar showing the currentWindow-agnostic position of the playhead
            let playheadDot = document.getElementById('timelinePlayheadDot');
            let trackBox = document.getElementById('timelineTrackBox');
            let containerWidth = trackBox.getBoundingClientRect().width;
            let leftMargin = TRACK_CONTAINER_MARGIN;
            let rightMargin = TRACK_CONTAINER_MARGIN;
            let halfPlayheadWidth = PLAYHEAD_WIDTH / 2;
            let halfDotWidth = PLAYHEAD_DOT_WIDTH / 2;
            playheadDot.style.left = (leftMargin - halfDotWidth) + percentInDay * (containerWidth - halfPlayheadWidth - leftMargin - rightMargin) + 'px';
        }
        displayTime(timestamp) {
            let textfield = document.getElementById('timelineTimestampDisplay');
            textfield.innerText = this.getFormattedTime(timestamp);
            let dateTextfield = document.getElementById('timelineDateDisplay');
            dateTextfield.innerText = this.getFormattedDate(timestamp);
        }
        displayZoom(zoomPercent) {
            let slider = document.getElementById('zoomSliderBackground');
            let handle = document.getElementById('zoomSliderHandle');
            let leftMargin = ZOOM_BAR_MARGIN;
            let sliderRect = slider.getBoundingClientRect();
            let handleWidth = handle.getBoundingClientRect().width;

            // percentZoom = Math.pow(Math.max(0, linearZoom), 0.25)
            let linearZoom = Math.pow(zoomPercent, 1.0 / ZOOM_EXPONENT);
            let handleLeft = linearZoom * ((sliderRect.right - leftMargin) - (sliderRect.left + leftMargin)) + (handleWidth / 2);
            handle.style.left = handleLeft + 'px';
        }
        displayScroll(scrollLeftPercent, zoomPercent) {
            // make the zoom bar handle fill 1.0 - zoomPercent of the overall bar
            let scrollBar = document.getElementById('timelineScrollBar');
            let handle = scrollBar.querySelector('.timelineScrollBarHandle');
            let trackBox = document.getElementById('timelineTrackBox');
            let containerWidth = trackBox.getBoundingClientRect().width;
            let leftMargin = TRACK_CONTAINER_MARGIN;
            let rightMargin = TRACK_CONTAINER_MARGIN;
            let halfPlayheadWidth = PLAYHEAD_WIDTH / 2;

            handle.style.width = (1.0 - zoomPercent) * 100 + '%';
            handle.style.left = scrollLeftPercent * (containerWidth - halfPlayheadWidth - leftMargin - rightMargin) + 'px';

            if (zoomPercent < 0.01) {
                scrollBar.classList.add('timelineScrollBarFadeout');
            } else {
                scrollBar.classList.remove('timelineScrollBarFadeout');
            }
        }
        displayIsPlaying(isPlaying) {
            let playButton = document.getElementById('timelinePlayButton');
            let playheadElement = document.getElementById('timelinePlayhead');
            let playheadDot = document.getElementById('timelinePlayheadDot');
            if (isPlaying) {
                playButton.src = '/addons/vuforia-spatial-remote-operator-addon/pauseButton.svg';
                playheadElement.classList.add('timelinePlayheadPlaying');
                playheadDot.classList.add('timelinePlayheadPlaying');
            } else {
                playButton.src = '/addons/vuforia-spatial-remote-operator-addon/playButton.svg';
                playheadElement.classList.remove('timelinePlayheadPlaying');
                playheadDot.classList.remove('timelinePlayheadPlaying');
            }
        }
        displayPlaybackSpeed(playbackSpeed) {
            if (!SUPPORTED_SPEEDS.includes(playbackSpeed)) {
                console.warn('no SVG button for playback speed ' + playbackSpeed);
            }
            let speedButton = document.getElementById('timelineSpeedButton');
            speedButton.src = '/addons/vuforia-spatial-remote-operator-addon/speedButton_' + playbackSpeed + 'x.svg';
        }
        getFormattedTime(relativeTimestamp) {
            return new Date(relativeTimestamp).toLocaleTimeString();
        }
        getFormattedDate(timestamp) { // Format: 'Mon, Apr 18, 2022'
            return new Date(timestamp).toLocaleDateString('en-us', {
                weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
            });
        }
        // completely deletes and re-creates tracks and segments
        fullUpdateTracks(tracks) {
            console.log('fullUpdate tracks');
            let numTracks = Object.keys(tracks).length;
            let container = document.getElementById('timelineTracksContainer');
            while (container.firstChild) {
                container.removeChild(container.firstChild);
            }
            Object.entries(tracks).forEach(([trackId, track]) => {
                let index = Object.keys(tracks).indexOf(trackId); // get a consistent index across both for-each loops
                console.log('creating elements for track: ' + trackId);
                let trackElement = document.createElement('div');
                trackElement.classList.add('timelineTrack');
                trackElement.id = this.getTrackElementId(trackId);
                container.appendChild(trackElement);
                this.positionAndScaleTrack(trackElement, track, index, numTracks);

                Object.entries(track.segments).forEach(([segmentId, segment]) => {
                    let segmentElement = document.createElement('div');
                    segmentElement.classList.add('timelineSegment');
                    segmentElement.id = this.getSegmentElementId(trackId, segmentId);
                    trackElement.appendChild(segmentElement);
                    this.positionAndScaleSegment(segmentElement, segment);
                });
            });
        }
        // doesn't delete tracks/segments, just moves them around (use this if scrolling/zooming, use fullUpdate if changing dataset)
        updateTracks(tracks) {
            let numTracks = Object.keys(tracks).length;
            let container = document.getElementById('timelineTracksContainer');

            // compute a quick checksum to ensure we have the right data to update
            let childrenChecksum = Array.from(container.children).map(elt => elt.id).join('');
            let tracksChecksum = Object.keys(tracks).map(id => this.getTrackElementId(id)).join('');
            if (childrenChecksum !== tracksChecksum) {
                console.warn('tracks needs a full update instead... performing one now');
                this.fullUpdateTracks(tracks);
                return;
            }

            Object.entries(tracks).forEach(([trackId, track]) => {
                let index = Object.keys(tracks).indexOf(trackId); // get a consistent index across both for-each loops
                let elementId = this.getTrackElementId(trackId);
                let trackElement = document.getElementById(elementId);
                this.positionAndScaleTrack(trackElement, track, index, numTracks);

                Object.entries(track.segments).forEach(([segmentId, segment]) => {
                    // let index = Object.keys(tracks).indexOf(trackId); // get a consistent index across both for-each loops
                    let elementId = this.getSegmentElementId(trackId, segmentId);
                    let segmentElement = document.getElementById(elementId);
                    this.positionAndScaleSegment(segmentElement, segment);
                });
            });
        }
        positionAndScaleTrack(trackElement, track, index, numTracks) {
            let heightPercent = (TRACK_HEIGHT_PERCENT / numTracks);
            let marginPercent = ((100.0 - TRACK_HEIGHT_PERCENT) / (numTracks + 1)); // there are one more margins than tracks
            trackElement.style.top = ((marginPercent * (index + 1)) + (heightPercent * index)) + '%';
            trackElement.style.height = heightPercent + '%';
        }
        positionAndScaleSegment(segmentElement, segment) {
            let durationPercentCurrentWindow = segment.end.currentWindow - segment.start.currentWindow;
            segmentElement.style.width = Math.max(0.1, (durationPercentCurrentWindow * 100)) + '%';
            segmentElement.style.left = (segment.start.currentWindow * 100) + '%';
        }
        getTrackElementId(trackId) {
            return 'timelineTrack_' + trackId;
        }
        getSegmentElementId(trackId, segmentId) {
            return 'timelineSegment_' + trackId + '_' + segmentId;
        }
        show() {
            this.timelineContainer.classList.remove('hiddenTimeline');
        }
        hide() {
            this.timelineContainer.classList.add('hiddenTimeline');
        }
    }

    exports.TimelineView = TimelineView;
})(realityEditor.videoPlayback);
