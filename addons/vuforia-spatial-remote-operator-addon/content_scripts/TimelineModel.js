createNameSpace('realityEditor.videoPlayback');

(function (exports) {
    const MAX_SPEED = 256;
    const PLAYBACK_FPS = 10; // no need for this to be faster than recording FPS, it'll just waste resources

    // The TimelineModel is the complete data representation needed for the timeline, including the database and the UI state
    // (such as playhead timestamp, zoom/scroll window, playback speed, etc)
    class TimelineModel {
        constructor() {
            this.database = null;
            this.currentDataView = null;
            this.selectedDate = null;
            this.currentTimestamp = null;
            this.isPlaying = false;
            this.playbackSpeed = 1;
            this.playbackInterval = null;
            this.lastUpdate = null;
            this.selectedSegments = [];
            this.timelineWindow = new realityEditor.videoPlayback.TimelineWindow();
            this.timelineWindow.onWithoutZoomUpdated(window => {
                this.handleWindowUpdated(window, true);
                this.updateDataView(window.bounds.withoutZoom.min, window.bounds.withoutZoom.max);
            });
            this.timelineWindow.onCurrentWindowUpdated(window => {
                this.handleWindowUpdated(window, false);
            });
            // controller can subscribe to each of these to update the view in response to data changes
            this.callbacks = {
                onDataLoaded: [],
                onDataViewUpdated: [],
                onWindowUpdated: [],
                onTimestampUpdated: [],
                onPlaybackToggled: [],
                onSpeedUpdated: [],
                onSegmentSelected: [],
                onSegmentDeselected: [],
                onSegmentData: []
            };
        }
        setDatabase(database) {
            this.database = database;
            this.currentDataView = new realityEditor.videoPlayback.DataView(database);
            this.callbacks.onDataLoaded.forEach(cb => {
                cb();
            });
        }
        handleWindowUpdated(window, resetPlayhead) {
            let playheadTime = resetPlayhead ? window.bounds.current.min : this.currentTimestamp;
            this.setTimestamp(playheadTime);

            this.callbacks.onWindowUpdated.forEach(cb => {
                cb(window);
            });
        }
        updateDataView(minTimestamp, maxTimestamp) {
            if (!this.database) { return; }

            // updates the currentDataView.filteredDatabase
            this.currentDataView.setTimeBounds(minTimestamp, maxTimestamp);

            this.callbacks.onDataViewUpdated.forEach(cb => {
                cb(this.currentDataView);
            });
        }
        setTimestamp(newTimestamp) {
            this.currentTimestamp = newTimestamp;
            this.callbacks.onTimestampUpdated.forEach(cb => {
                cb(this.currentTimestamp);
            });

            // determine if there are any overlapping segments
            if (!this.currentDataView) { return; }

            // trigger onSegmentSelected and onSegmentDeselected callbacks
            let previousSegments = JSON.parse(JSON.stringify(this.selectedSegments));
            let currentSegments = this.currentDataView.processTimestamp(newTimestamp);
            this.selectedSegments = currentSegments;
            let selectedIds = currentSegments.map(segment => segment.id);
            let previousIds = previousSegments.map(segment => segment.id);
            // trigger events based on difference between currentSegments and previous selectedSegments
            currentSegments.forEach(segment => {
                if (!previousIds.includes(segment.id)) {
                    this.callbacks.onSegmentSelected.forEach(cb => {
                        cb(segment);
                    });
                }
            });
            previousSegments.forEach(segment => {
                if (!selectedIds.includes(segment.id)) {
                    this.callbacks.onSegmentDeselected.forEach(cb => {
                        cb(segment);
                    });
                }
            });

            // trigger onSegmentData callbacks to process the dataPieces that occur at this timestamp
            currentSegments.forEach(segment => {
                this.callbacks.onSegmentData.forEach(cb => {
                    cb(segment, newTimestamp, segment.dataPieces);
                });
            });
        }
        getPlayheadTimePercent(inWindow) {
            let min, max;
            if (inWindow) {
                min = this.timelineWindow.bounds.current.min;
                max = this.timelineWindow.bounds.current.max;
            } else {
                min = this.timelineWindow.bounds.withoutZoom.min;
                max = this.timelineWindow.bounds.withoutZoom.max;
            }
            return (this.currentTimestamp - min) / (max - min);
        }
        getTimestampAsPercent(timestamp) {
            let bounds = this.timelineWindow.bounds;
            return {
                withoutZoom: (timestamp - bounds.withoutZoom.min) / (bounds.withoutZoom.max - bounds.withoutZoom.min),
                currentWindow: (timestamp - bounds.current.min) / (bounds.current.max - bounds.current.min)
            };
        }
        setTimestampFromPositionInWindow(percentInWindow) {
            let min = this.timelineWindow.bounds.current.min;
            let max = this.timelineWindow.bounds.current.max;
            let current = min + (max - min) * percentInWindow;
            this.setTimestamp(current);
        }
        adjustCurrentWindow(leftPercent, rightPercent) {
            this.timelineWindow.setCurrentFromPercent(leftPercent, rightPercent);
        }
        togglePlayback(toggled) {
            if (this.isPlaying === toggled) { return; }
            this.isPlaying = toggled;

            // create a loop that will increment the currentTimestamp as time passes
            if (this.isPlaying) {
                if (!this.playbackInterval) {
                    this.lastUpdate = Date.now();
                    this.playbackInterval = setInterval(() => {
                        let now = Date.now();
                        let dt = now - this.lastUpdate;
                        this.lastUpdate = now;
                        this.playbackLoop(dt);
                    }, 1000 / PLAYBACK_FPS);
                }
            } else if (this.playbackInterval) {
                clearInterval(this.playbackInterval);
                this.playbackInterval = null;
            }

            // play videos, begin data processing, etc
            this.callbacks.onPlaybackToggled.forEach(cb => {
                cb(this.isPlaying);
            });
        }
        playbackLoop(dt) {
            // update the timestamp based on time passed (but stop if reached end of timeline)
            let newTime = this.currentTimestamp + dt * this.playbackSpeed;
            if (newTime > this.timelineWindow.bounds.withoutZoom.max) {
                newTime = this.timelineWindow.bounds.withoutZoom.max;
                this.togglePlayback(false);
            }
            this.setTimestamp(newTime); // this will process any data segments
        }
        multiplySpeed(factor, allowLoop) {
            this.playbackSpeed *= factor;
            if (this.playbackSpeed > MAX_SPEED) {
                this.playbackSpeed = allowLoop ? 1 : MAX_SPEED;
            } else if (this.playbackSpeed < 1) {
                this.playbackSpeed = allowLoop ? MAX_SPEED : 1;
            }
            this.callbacks.onSpeedUpdated.forEach(cb => {
                cb(this.playbackSpeed);
            });
        }
        /*
        Callback Subscription Methods
        */
        onDataLoaded(callback) {
            this.callbacks.onDataLoaded.push(callback);
        }
        onDataViewUpdated(callback) {
            this.callbacks.onDataViewUpdated.push(callback);
        }
        onWindowUpdated(callback) {
            this.callbacks.onWindowUpdated.push(callback);
        }
        onTimestampUpdated(callback) {
            this.callbacks.onTimestampUpdated.push(callback);
        }
        onPlaybackToggled(callback) {
            this.callbacks.onPlaybackToggled.push(callback);
        }
        onSpeedUpdated(callback) {
            this.callbacks.onSpeedUpdated.push(callback);
        }
        onSegmentSelected(callback) {
            this.callbacks.onSegmentSelected.push(callback);
        }
        onSegmentDeselected(callback) {
            this.callbacks.onSegmentDeselected.push(callback);
        }
        onSegmentData(callback) {
            this.callbacks.onSegmentData.push(callback);
        }
    }

    exports.TimelineModel = TimelineModel;
})(realityEditor.videoPlayback);
