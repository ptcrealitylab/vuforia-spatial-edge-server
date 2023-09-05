createNameSpace('realityEditor.videoPlayback');

(function (exports) {
    // VideoSources is set up to discover all 3D video paths from the server and put them into a usable data structure
    // It also adds the pose data to each recording. The videoInfo it returns can be loaded into a TimelineDatabase.
    class VideoSources {
        constructor(onDataLoaded) {
            this.onDataLoaded = onDataLoaded;
            this.loadAvailableVideos('/virtualizer_recordings').then(info => {
                this.videoInfo = info;
                if (this.videoInfo) {
                    // videoInfo is a json blob from the server with less structure
                    // create trackInfo, which adds metadata and pose data to the videoInfo
                    this.createTrackInfo(this.videoInfo); // triggers onDataLoaded when it's done
                }
            }).catch(error => {
                console.warn('error loading /virtualizer_recordings', error);
            });
        }
        createTrackInfo(videoInfo) {
            this.trackInfo = {
                tracks: {}, // each device gets its own track. more than one segment can be on that track
                metadata: { minTime: 0, maxTime: 1 }
            };

            let earliestTime = Date.now();
            let latestTime = 0;
            let trackIndex = 0;

            Object.keys(videoInfo).forEach(deviceId => {
                // console.log('loading track for device: ' + deviceId);
                Object.keys(videoInfo[deviceId]).forEach(sessionId => {
                    // console.log('loading ' + deviceId + ' session ' + sessionId);
                    let sessionInfo = videoInfo[deviceId][sessionId];
                    if (typeof sessionInfo.color === 'undefined' || typeof sessionInfo.depth === 'undefined') {
                        return; // skip entries that don't have both videos
                    }
                    if (typeof this.trackInfo.tracks[deviceId] === 'undefined') {
                        this.trackInfo.tracks[deviceId] = {
                            segments: {},
                            index: trackIndex
                        };
                        trackIndex++;
                    }
                    let timeInfo = this.parseTimeInfo(sessionInfo.color);
                    this.trackInfo.tracks[deviceId].segments[sessionId] = {
                        colorVideo: sessionInfo.color,
                        depthVideo: sessionInfo.depth,
                        start: parseInt(timeInfo.start),
                        end: parseInt(timeInfo.end),
                        visible: true,
                    };
                    earliestTime = Math.min(earliestTime, timeInfo.start);
                    latestTime = Math.max(latestTime, timeInfo.end);
                });
            });

            this.trackInfo.metadata.minTime = earliestTime;
            this.trackInfo.metadata.maxTime = latestTime > 0 ? latestTime : Date.now();
            console.debug('trackInfo', this.trackInfo);

            this.addPoseInfoToTracks().then(response => {
                console.debug('addPoseInfoToTracks', response);
                this.onDataLoaded(this.videoInfo, this.trackInfo);
            }).catch(error => {
                console.warn('error in addPoseInfoToTracks', error);
            });
        }
        parseTimeInfo(filename) {
            let re_start = new RegExp('start_[0-9]{13,}');
            let re_end = new RegExp('end_[0-9]{13,}');
            let startMatches = filename.match(re_start);
            let endMatches = filename.match(re_end);
            if (!startMatches || !endMatches || startMatches.length === 0 || endMatches.length === 0) { return null; }
            return {
                start: startMatches[0].replace('start_', ''),
                end: endMatches[0].replace('end_', '')
            };
        }
        loadAvailableVideos(url) {
            return new Promise((resolve, reject) => {
                // this.downloadVideoInfo().then(info => console.log(info));
                // httpGet('http://' + this.ip + ':31337/videoInfo').then(info => {
                this.httpGet(url).then(info => {
                    console.debug('loadAvailableVideos httpGet', info);
                    resolve(info);
                }).catch(reason => {
                    console.warn('loadAvailableVideos error', reason);
                    reject(reason);
                });
            });
        }
        async addPoseInfoToTracks() {
            return new Promise((resolve, reject) => {
                // add pose info to tracks
                // http://localhost:8081/virtualizer_recording/device_21/pose/device_device_21_session_wE1fcfcd.json
                let promises = [];
                Object.keys(this.trackInfo.tracks).forEach(deviceId => {
                    Object.keys(this.trackInfo.tracks[deviceId].segments).forEach(segmentId => {
                        promises.push(this.loadPoseInfo(deviceId, segmentId));
                    });
                });
                if (promises.length === 0) {
                    resolve();
                    return;
                }
                Promise.all(promises).then((poses) => {
                    poses.forEach(response => {
                        let segment = this.trackInfo.tracks[response.deviceId].segments[response.segmentId];
                        segment.poses = response.poseInfo;
                    });
                    resolve();
                }).catch(error => {
                    console.warn('addPoseInfoToTracks failed', error);
                    reject();
                });
            });
        }
        loadPoseInfo(deviceId, segmentId) {
            return new Promise((resolve, reject) => {
                this.httpGet(this.getPoseUrl(deviceId, segmentId)).then(poseInfo => {
                    resolve({
                        deviceId: deviceId,
                        segmentId: segmentId,
                        poseInfo: poseInfo
                    });
                }).catch(reason => {
                    console.warn('loadPoseInfo failed', reason);
                    reject(reason);
                });
            });
        }
        getPoseUrl(deviceId, segmentId) {
            // http://localhost:8081/virtualizer_recording/device21/pose/device_device21_session_wE1fcfcd.json
            return '/virtualizer_recording/' + deviceId + '/pose/device_' + deviceId + '_session_' + segmentId + '.json';
        }
        httpGet(url) {
            return new Promise((resolve, reject) => {
                let req = new XMLHttpRequest();
                req.open('GET', url, true);
                req.onreadystatechange = function () {
                    if (req.readyState === 4) {
                        if (req.status === 0) {
                            return;
                        }
                        if (req.status !== 200) {
                            reject('Invalid status code <' + req.status + '>');
                        }
                        resolve(JSON.parse(req.responseText));
                    }
                };
                req.send();
            });
        }
    }

    exports.VideoSources = VideoSources;
})(realityEditor.videoPlayback);
