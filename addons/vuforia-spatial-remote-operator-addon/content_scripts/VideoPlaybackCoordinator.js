createNameSpace('realityEditor.videoPlayback');

(function (exports) {
    const DEVICE_ID_PREFIX = 'device'; // should match DEVICE_ID_PREFIX in backend recording system
    let menuItemsAdded = false;

    // The Video Playback Coordinator creates a Timeline and loads all VideoSources into it via a TimelineDatabase
    // When the Timeline plays or is scrolled, responds to the RGB+Depth+Pose data and tells the CameraVisCoordinator to render point clouds
    class VideoPlaybackCoordinator {
        constructor() {
            this.canvasElements = {};
            this.timelineVisibile = true;
            this.POSE_FPS = 10; // if the recording FPS changes, this const needs to be updated to synchronize the playback
        }
        load() {
            let playback = realityEditor.videoPlayback;
            this.timelineController = new playback.TimelineController();
            this.database = new playback.TimelineDatabase();
            let _videoSources = new playback.VideoSources((videoInfo, trackInfo) => {
                console.debug('VideoPlaybackCoordinator got trackInfo', trackInfo);
                for (const [trackId, trackData] of Object.entries(trackInfo.tracks)) {
                    let track = new playback.DataTrack(trackId, playback.TRACK_TYPES.VIDEO_3D);
                    for (const [segmentId, segmentData] of Object.entries(trackData.segments)) {
                        let segment = new playback.DataSegment(segmentId, playback.TRACK_TYPES.VIDEO_3D, segmentData.start, segmentData.end);
                        let colorVideo = new playback.DataPiece('colorVideo', playback.DATA_PIECE_TYPES.VIDEO_URL);
                        colorVideo.setVideoUrl(segmentData.colorVideo);
                        let depthVideo = new playback.DataPiece('depthVideo', playback.DATA_PIECE_TYPES.VIDEO_URL);
                        depthVideo.setVideoUrl(segmentData.depthVideo);
                        let poses = new playback.DataPiece('poses', playback.DATA_PIECE_TYPES.TIME_SERIES);
                        poses.setTimeSeriesData(segmentData.poses.map(elt => {
                            return {data: elt.pose, time: elt.time};
                        }));
                        segment.addDataPiece(colorVideo);
                        segment.addDataPiece(depthVideo);
                        segment.addDataPiece(poses);
                        track.addSegment(segment);
                    }
                    this.database.addTrack(track);
                }
                console.debug('VideoPlaybackCoordinator database', this.database);

                // this.timeline.loadTracks(trackInfo);
                this.timelineController.setDatabase(this.database);

                // TODO: make the VideoSources listen for newly uploaded videos, and when loaded, append to timeline
            });
            this.timelineController.onVideoFrame((colorVideo, depthVideo, segment) => {
                if (!this.timelineController.model.selectedSegments.map(segment => segment.id).includes(segment.id)) {
                    console.log('dont process video frame for deselected segment');
                    return;
                }
                let deviceId = segment.trackId;
                let colorVideoCanvas = this.getCanvasElement(deviceId, 'color');
                let depthVideoCanvas = this.getCanvasElement(deviceId, 'depth');

                let colorCtx = colorVideoCanvas.getContext('2d');
                let depthCtx = depthVideoCanvas.getContext('2d');
                colorCtx.drawImage(colorVideo, 0, 0, 960, 540);
                depthCtx.drawImage(depthVideo, 0, 0, 256, 144);

                // get pose that accurately matches actual video playback currentTime. relies on knowing FPS of the recording.
                // a 179.5-second video has 1795 poses, so use the (video timestamp * 10) as index to retrieve pose (if video is 10fps)
                let closestPoseBase64 = segment.dataPieces.poses.getDataAtIndex(Math.floor(colorVideo.currentTime * this.POSE_FPS));
                let closestPoseMatrix = this.getPoseMatrixFromData(closestPoseBase64);
                let colorImageUrl = colorVideoCanvas.toDataURL('image/jpeg');
                let depthImageUrl = depthVideoCanvas.toDataURL('image/png');

                if (closestPoseMatrix) {
                    if (typeof this.loadPointCloud !== 'undefined') {
                        this.loadPointCloud(this.getCameraId(deviceId), colorImageUrl, depthImageUrl, closestPoseMatrix);
                    }
                }
            });
            this.timelineController.onSegmentDeselected(segment => {
                if (typeof this.hidePointCloud === 'function') {
                    this.hidePointCloud(this.getCameraId(segment.trackId));
                }
            });

            this.toggleVisibility(false); // default to hidden

            // Note: onDataFrame not working because of an error in recorded pose timestamps, so we calculate pose in onVideoFrame instead
            // this.timelineController.onDataFrame((colorVideoUrl, depthVideoUrl, timePercent, cameraPoseMatrixBase64) => {
            //     // console.log('onDataFrame', colorVideoUrl, depthVideoUrl, timePercent, cameraPoseMatrix);
            //     this.mostRecentPose = this.getPoseMatrixFromData(cameraPoseMatrixBase64);
            //     this.mostRecentPoseTimePercent = timePercent;
            // });
        }
        getCameraId(deviceId) {
            // add 255 to go outside the range of camera ids, so playback cameras are independent of realtime cameras
            return parseInt(deviceId.replace(DEVICE_ID_PREFIX, '')) + 255;
        }
        getPoseMatrixFromData(poseBase64) {
            if (!poseBase64) { return null; }

            let byteCharacters = window.atob(poseBase64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            return new Float32Array(byteArray.buffer);
        }
        getCanvasElement(trackId, colorOrDepth) {
            if (colorOrDepth !== 'color' && colorOrDepth !== 'depth') { console.warn('passing invalid colorOrDepth to getCanvasElement', colorOrDepth); }

            if (typeof this.canvasElements[trackId] === 'undefined') {
                this.canvasElements[trackId] = {};
            }
            if (typeof this.canvasElements[trackId].depth === 'undefined') {
                this.canvasElements[trackId].depth = this.createCanvasElement('depth_canvas_' + trackId, 256, 144);
            }
            if (typeof this.canvasElements[trackId].color === 'undefined') {
                this.canvasElements[trackId].color = this.createCanvasElement('color_canvas_' + trackId, 960, 540);
            }

            return this.canvasElements[trackId][colorOrDepth];
        }
        createCanvasElement(id, width, height) {
            let canvas = document.createElement('canvas');
            canvas.id = id;
            canvas.width = width;
            canvas.height = height;
            canvas.style.display = 'none';
            document.body.appendChild(canvas);
            return canvas;
        }
        setPointCloudCallback(callback) {
            this.loadPointCloud = callback;
        }
        setHidePointCloudCallback(callback) {
            this.hidePointCloud = callback;
        }
        toggleVisibility(toggled) {
            if (this.timelineVisibile || (typeof toggled !== 'undefined' && !toggled)) {
                this.timelineVisibile = false;
            } else {
                this.timelineVisibile = true;
                this.addMenuItems();
            }

            this.timelineController.toggleVisibility(this.timelineVisibile);
        }
        addMenuItems() {
            if (!menuItemsAdded) {
                menuItemsAdded = true;
                // set up keyboard shortcuts
                let togglePlayback = new realityEditor.gui.MenuItem('Toggle Playback', { shortcutKey: 'SPACE', toggle: true, defaultVal: false}, (toggled) => {
                    this.timelineController.model.togglePlayback(toggled);
                });
                realityEditor.gui.getMenuBar().addItemToMenu(realityEditor.gui.MENU.History, togglePlayback);

                let slower = new realityEditor.gui.MenuItem('Play Slower', { shortcutKey: 'COMMA' }, () => {
                    this.timelineController.multiplySpeed(0.5, false);
                });
                realityEditor.gui.getMenuBar().addItemToMenu(realityEditor.gui.MENU.History, slower);

                let faster = new realityEditor.gui.MenuItem('Play Faster', { shortcutKey: 'PERIOD' }, () => {
                    this.timelineController.multiplySpeed(2.0, false);
                });
                realityEditor.gui.getMenuBar().addItemToMenu(realityEditor.gui.MENU.History, faster);
            }
        }
    }
    exports.VideoPlaybackCoordinator = VideoPlaybackCoordinator;
})(realityEditor.videoPlayback);
