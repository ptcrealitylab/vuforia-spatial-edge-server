createNameSpace('realityEditor.videoPlayback');

(function (exports) {

    // Communicates between the TimelineModel and the TimelineView, and bubbles up events to subscribing modules
    class TimelineController {
        constructor() {
            this.callbacks = {
                onVideoFrame: [],
                onDataFrame: [],
                onSegmentDeselected: []
            };

            this.model = new realityEditor.videoPlayback.TimelineModel();
            this.model.onDataLoaded(this.handleDataLoaded.bind(this));
            this.model.onDataViewUpdated(this.handleDataViewUpdated.bind(this));
            this.model.onWindowUpdated(this.handleWindowUpdated.bind(this));
            this.model.onTimestampUpdated(this.handleTimestampUpdated.bind(this));
            this.model.onPlaybackToggled(this.handlePlaybackToggled.bind(this));
            this.model.onSpeedUpdated(this.handleSpeedUpdated.bind(this));
            this.model.onSegmentSelected(this.handleSegmentSelected.bind(this));
            this.model.onSegmentDeselected(this.handleSegmentDeselected.bind(this));
            this.model.onSegmentData(this.handleSegmentData.bind(this));

            // set up the View and subscribe to events from the view (buttons pressed, scrollbars moved, etc)
            this.view = new realityEditor.videoPlayback.TimelineView(document.body);
            this.setupUserInteractions();
        }
        /**
         * @param {TimelineDatabase} database
         */
        setDatabase(database) {
            this.model.setDatabase(database);
        }
        setupCalendarView() {
            this.calendar = new realityEditor.videoPlayback.Calendar(this.view.timelineContainer, false);
            this.calendar.onDateSelected(this.handleCalendarDateSelected.bind(this));
            this.calendar.selectDay(Date.now()); // select today, as an initial default view
        }
        setupUserInteractions() {
            this.view.playButton.addEventListener('pointerup', e => {
                let isPlayButton = e.currentTarget.src.includes('playButton.svg'); // play vs pause state
                this.model.togglePlayback(isPlayButton);
            });
            this.view.speedButton.addEventListener('pointerup', _e => {
                this.multiplySpeed(2, true);
            });
            this.view.calendarButton.addEventListener('pointerup', _e => {
                if (this.calendar.dom.classList.contains('timelineCalendarVisible')) {
                    this.calendar.hide();
                } else {
                    this.calendar.show();
                }
            });
            this.view.onZoomHandleChanged(percentZoom => {
                let playheadTimePercent = this.model.getPlayheadTimePercent();
                this.view.onZoomChanged(percentZoom, playheadTimePercent);
            });
            this.view.onPlayheadSelected(_ => {
                this.model.togglePlayback(false);
            });
            this.view.onPlayheadChanged(positionInWindow => {
                this.model.setTimestampFromPositionInWindow(positionInWindow);

                // update the currentTime of each of the selected videos, specifically if UI was touched
                // if timestamp changes just due to time passing, the video will already play and update
                this.model.selectedSegments.forEach(segment => {
                    let currentTime = (segment.timeMultiplier || 1) * (this.model.currentTimestamp - segment.start) / 1000;

                    let videoElements = this.view.getVideoElementsForTrack(segment.trackId);
                    if (videoElements.color && videoElements.depth) {
                        videoElements.color.currentTime = currentTime;
                        videoElements.depth.currentTime = currentTime;
                    }
                });
            });
            this.view.onScrollbarChanged((zoomPercent, leftPercent, rightPercent) => {
                this.model.adjustCurrentWindow(leftPercent, rightPercent);
            });
            this.view.onVideoElementAdded((videoElement, colorOrDepth) => {
                if (colorOrDepth !== 'color' && colorOrDepth !== 'depth') {
                    console.warn('unable to parse segment id from video element - not color or depth');
                    return;
                }
                let videoSegments = this.model.selectedSegments.filter(segment => segment.type === 'VIDEO_3D');
                let segmentId = videoElement.querySelector('source').src.split('_session_')[1].split('_start_')[0];
                let matchingSegment = videoSegments.find(segment => segment.id === segmentId);

                // we correct any temporal warping from the recording process here, by adding a timeMultiplier
                // e.g. if it was supposed to be 10 fps but frames were added at 7 fps, this will stretch the video back to the correct length
                videoElement.addEventListener('loadedmetadata', _e => {
                    if (typeof matchingSegment.timeMultiplier === 'undefined') {
                        let videoDuration = videoElement.duration;
                        // this relies on knowing the start and end timestamp of the segment
                        let intendedDuration = (matchingSegment.end - matchingSegment.start) / 1000;
                        matchingSegment.timeMultiplier = videoDuration / intendedDuration;
                    }
                    videoElement.playbackRate = this.model.playbackSpeed * matchingSegment.timeMultiplier;
                });

                // only need one timeupdate listener per set of color and depth videos - we arbitrarily add it to the color
                if (colorOrDepth !== 'color') { return; }

                videoElement.addEventListener('timeupdate', _e => {
                    let videoElements = this.view.getVideoElementsForTrack(matchingSegment.trackId);
                    this.callbacks.onVideoFrame.forEach(cb => {
                        cb(videoElements.color, videoElements.depth, matchingSegment);
                    });
                });
            });
        }
        // when a date is clicked, show those 24 hours on the timeline but zoom in to fit the recorded data from that day
        handleCalendarDateSelected(dateObject) {
            this.model.togglePlayback(false);
            this.calendar.hide();

            this.model.timelineWindow.setWithoutZoomFromDate(dateObject);

            // figure out how much of the day is using any data
            let minPercent = 1;
            let maxPercent = 0;
            let dayMin = this.model.timelineWindow.bounds.withoutZoom.min;
            let dayMax = this.model.timelineWindow.bounds.withoutZoom.max;
            let dayLength = dayMax - dayMin;
            let tracks = this.model.database.getFilteredData(dayMin, dayMax).tracks;
            for (const [_trackId, track] of Object.entries(tracks)) {
                let bounds = track.getBounds();
                minPercent = Math.min(minPercent, (bounds.start - dayMin) / dayLength);
                maxPercent = Math.max(maxPercent, (bounds.end - dayMin) / dayLength);
            }

            // skip rescaling window if we don't have any tracks to scale it by
            if (minPercent !== 1 || maxPercent !== 0) {
                this.model.timelineWindow.setCurrentFromPercent(Math.max(0, minPercent - 0.01), Math.min(1, maxPercent + 0.01));
            }

            // move the playhead to the beginning of the recorded data
            this.model.setTimestamp(Math.max(0, dayMin + minPercent * dayLength));
        }
        // set up the calendar and highlight which dates have data, in response to loading a database into the timeline
        handleDataLoaded() {
            if (!this.calendar) {
                try {
                    this.setupCalendarView();
                } catch (e) {
                    console.warn('error setting up calendar view', e);
                }
            }
            // triggers when data finishes loading
            this.calendar.highlightDates(this.model.database.getDatesWithData());
        }
        /**
         * @param {DataView} dataView
         */
        handleDataViewUpdated(dataView) {
            // which date is selected, can be used to filter the database
            let simplifiedTracks = this.generateSimplifiedTracks(dataView);

            this.view.render({
                tracks: simplifiedTracks,
                tracksFullUpdate: true
            });
        }

        /**
         * @param {DataView} dataView
         * @returns {{}}
         */
        generateSimplifiedTracks(dataView) {
            if (!dataView || !dataView.filteredDatabase) { return {}; }
            // process filtered tracks into just the info needed by the view
            let simplifiedTracks = {};
            for (const [trackId, track] of Object.entries(dataView.filteredDatabase.tracks)) {
                simplifiedTracks[trackId] = {
                    id: trackId,
                    type: track.type,
                    segments: {}
                };
                for (const [segmentId, segment] of Object.entries(track.segments)) {
                    simplifiedTracks[trackId].segments[segmentId] = {
                        id: segmentId,
                        type: segment.type,
                        start: this.model.getTimestampAsPercent(segment.start),
                        end: this.model.getTimestampAsPercent(segment.end)
                    };
                }
            }
            return simplifiedTracks;
        }

        /**
         * @param {TimelineWindow} window
         */
        handleWindowUpdated(window) {
            this.view.render({
                zoomPercent: window.getZoomPercent(),
                scrollLeftPercent: window.getScrollLeftPercent(),
                tracks: this.generateSimplifiedTracks(this.model.currentDataView),
            });
        }
        handleTimestampUpdated(timestamp) {
            let percentInWindow = this.model.getPlayheadTimePercent(true);
            let percentInDay = this.model.getPlayheadTimePercent(false);

            this.view.render({
                playheadTimePercent: percentInWindow,
                playheadWithoutZoomPercent: percentInDay,
                timestamp: timestamp
            });
        }
        onVideoFrame(callback) {
            this.callbacks.onVideoFrame.push(callback);
        }
        onDataFrame(callback) {
            this.callbacks.onDataFrame.push(callback);
        }
        onSegmentDeselected(callback) {
            this.callbacks.onSegmentDeselected.push(callback);
        }
        multiplySpeed(factor = 2, allowLoop = true) {
            // update the playback speed, which subsequently re-renders the view (button image)
            this.model.multiplySpeed(factor, allowLoop);
        }
        handlePlaybackToggled(isPlaying) {
            this.view.render({
                isPlaying: isPlaying
            });

            // play each of the videos in the view
            let tracks = this.model.currentDataView.filteredDatabase.tracks;
            Object.keys(tracks).forEach(trackId => {
                let videoElements = this.view.getVideoElementsForTrack(trackId);
                if (videoElements.color && videoElements.depth) {
                    let selectedSegments = this.model.selectedSegments;
                    if (selectedSegments.map(segment => segment.trackId).includes(trackId)) {
                        if (isPlaying) {
                            videoElements.color.play();
                            videoElements.depth.play();
                        } else {
                            videoElements.color.pause();
                            videoElements.depth.pause();
                        }
                    }
                }
            });
        }
        handleSpeedUpdated(playbackSpeed) {
            this.view.render({
                playbackSpeed: playbackSpeed
            });

            this.model.selectedSegments.forEach(segment => {
                let colorVideo = this.view.getOrCreateVideoElement(segment.trackId, 'color');
                let depthVideo = this.view.getOrCreateVideoElement(segment.trackId, 'depth');
                [colorVideo, depthVideo].forEach(video => {
                    video.playbackRate = playbackSpeed * (segment.timeMultiplier || 1)
                });
            });
        }
        toggleVisibility(isNowVisible) {
            if (isNowVisible) {
                if (!this.model.database) {
                    console.warn('timeline database is null, cant show timeline yet...');
                    return;
                }
                this.view.show();

                // zoom to show the most recent date on the timeline
                let datesWithVideos = this.model.database.getDatesWithData();
                let mostRecentDate = datesWithVideos.sort((a, b) => {
                    return a.getTime() - b.getTime();
                })[datesWithVideos.length - 1];

                if (!mostRecentDate) {
                    mostRecentDate = new Date(); // if no data on timeline, default to today
                }
                let startOfDay = new Date(mostRecentDate.getFullYear(), mostRecentDate.getMonth(), mostRecentDate.getDate());
                this.handleCalendarDateSelected(startOfDay);

            } else {
                this.view.hide();
            }
        }
        handleSegmentSelected(selectedSegment) {
            this.renderSelectedSegments();
        }
        handleSegmentDeselected(deselectedSegment) {
            this.renderSelectedSegments();
            this.callbacks.onSegmentDeselected.forEach(cb => {
                cb(deselectedSegment); // can use this to hide point clouds when playhead moves away from a segment
            });
        }
        renderSelectedSegments() {
            let videoSegments = this.model.selectedSegments.filter(segment => segment.type === 'VIDEO_3D');
            let videoElements = videoSegments.map(segment => {
                return [
                    { colorOrDepth: 'color', trackId: segment.trackId, src: segment.dataPieces.colorVideo.videoUrl },
                    { colorOrDepth: 'depth', trackId: segment.trackId, src: segment.dataPieces.depthVideo.videoUrl },
                ];
            }).flat();

            this.view.render({
                videoElements: videoElements
            });
        }
        handleSegmentData(segment, _timestamp, _data) {
            if (segment.type === 'VIDEO_3D') {
                // TODO: this currently isn't accurate because of a time offset in the recording process
                // but in theory this can be used for external modules to subscribe to any non-video data on the timeline (such as pose data)

                // let cameraPoseMatrix = segment.dataPieces.poses.getClosestData(timestamp).data;
                // let colorVideoUrl = segment.dataPieces.colorVideo.videoUrl;
                // let depthVideoUrl = segment.dataPieces.depthVideo.videoUrl;
                // let timePercent = segment.getTimestampAsPercent(timestamp);
                //
                // this.callbacks.onDataFrame.forEach(cb => {
                //     cb(colorVideoUrl, depthVideoUrl, timePercent, cameraPoseMatrix);
                // });
            }
            // TODO: process other data types (IoT, Human Pose) and trigger other callbacks
        }
    }

    exports.TimelineController = TimelineController;
})(realityEditor.videoPlayback);
