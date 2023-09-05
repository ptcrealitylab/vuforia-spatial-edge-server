createNameSpace('realityEditor.videoPlayback');

(function (exports) {
    const DAY_LENGTH_MS = 1000 * 60 * 60 * 24;

    // Helper class to manage the viewport of the timeline
    // this includes its bounds (as timestamps) when fully zoomed out,
    // as well as the timestamps defining the current zoom/scroll of the window
    class TimelineWindow {
        constructor() {
            this.bounds = {
                withoutZoom: { min: 0, max: Date.now() },
                current: { min: 0, max: Date.now() }
            };
            this.callbacks = {
                onWithoutZoomUpdated: [],
                onCurrentWindowUpdated: []
            };
        }
        setWithoutZoomFromDate(dateObject) {
            this.bounds.withoutZoom.min = dateObject.getTime();
            this.bounds.withoutZoom.max = dateObject.getTime() + DAY_LENGTH_MS - 1; // remove 1ms so that day ends at 11:59:59.99

            // by default, also adjusts the current view to be the entire withoutZoom bounds
            this.bounds.current.min = this.bounds.withoutZoom.min;
            this.bounds.current.max = this.bounds.withoutZoom.max;

            this.callbacks.onWithoutZoomUpdated.forEach(cb => {
                cb(this);
            });
        }
        setCurrentFromPercent(minPercent, maxPercent) {
            let fullLength = this.bounds.withoutZoom.max - this.bounds.withoutZoom.min;
            this.bounds.current.min = this.bounds.withoutZoom.min + minPercent * fullLength;
            this.bounds.current.max = this.bounds.withoutZoom.min + maxPercent * fullLength;

            this.callbacks.onCurrentWindowUpdated.forEach(cb => {
                cb(this);
            });
        }
        getZoomPercent() { // 0 if not zoomed at all (see 100%), 1 if current window is 0% of the withoutZoom window
            return 1.0 - (this.bounds.current.max - this.bounds.current.min) / (this.bounds.withoutZoom.max - this.bounds.withoutZoom.min);
        }
        getScrollLeftPercent() { // helper to get relative location of current.min within the withoutZoom window
            return (this.bounds.current.min - this.bounds.withoutZoom.min) / (this.bounds.withoutZoom.max - this.bounds.withoutZoom.min);
        }
        onWithoutZoomUpdated(callback) {
            this.callbacks.onWithoutZoomUpdated.push(callback);
        }
        onCurrentWindowUpdated(callback) {
            this.callbacks.onCurrentWindowUpdated.push(callback);
        }
    }
    exports.TimelineWindow = TimelineWindow;
})(realityEditor.videoPlayback);
