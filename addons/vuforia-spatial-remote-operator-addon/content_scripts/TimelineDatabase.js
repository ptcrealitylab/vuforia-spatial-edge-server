createNameSpace('realityEditor.videoPlayback');

(function (exports) {
    const TRACK_TYPES = Object.freeze({
        VIDEO_3D: 'VIDEO_3D',
        VIDEO_2D: 'VIDEO_2D', // not in use, yet
        POSE: 'POSE', // not in use, yet
        IOT: 'IOT' // not in use, yet
    });
    const DATA_PIECE_TYPES = Object.freeze({
        VIDEO_URL: 'VIDEO_URL', // used for VIDEO_3D color and depth 
        TIME_SERIES: 'TIME_SERIES' // used for VIDEO_3D poses
    });

    // The TimelineDatabase consists of a nested hierarchy of DataTracks -> DataSegments -> DataPieces
    // These currently correspond to DeviceID -> Recording Session -> (RGB + DEPTH + POSE) data
    // It is designed to accept a variety of data types, such as pose data or IoT data, which can be added as additional tracks
    class TimelineDatabase {
        constructor() {
            this.tracks = {};
        }
        addTrack(track) {
            this.tracks[track.id] = track;
        }
        getBounds() {
            let minStart = null;
            let maxEnd = null;
            for (const [_id, track] of Object.entries(this.tracks)) {
                let trackBounds = track.getBounds();
                if (minStart === null || trackBounds.start < minStart) {
                    minStart = trackBounds.start;
                }
                if (maxEnd === null || trackBounds.end > maxEnd) {
                    maxEnd = trackBounds.end;
                }
            }
            return {
                start: minStart,
                end: maxEnd
            };
        }
        // returns a subset of the tracks, which each contain only the subset of their segments that lie within the specified bounds
        getFilteredData(minTimestamp, maxTimestamp) {
            if (typeof minTimestamp !== 'number' || typeof maxTimestamp !== 'number') {
                return this.tracks;
            }

            let filteredDatabase = {
                tracks: {}
            };
            for (const [trackId, track] of Object.entries(this.tracks)) {
                let includeTrack = false;
                let segmentsToInclude = [];
                for (const [_segmentId, segment] of Object.entries(track.segments)) {
                    let includeSegment = segment.start >= minTimestamp && segment.end <= maxTimestamp;
                    if (includeSegment) {
                        includeTrack = true;
                        segmentsToInclude.push(segment);
                    }
                }

                if (includeTrack) {
                    filteredDatabase.tracks[trackId] = new DataTrack(trackId, track.type);
                    segmentsToInclude.forEach(segment => {
                        filteredDatabase.tracks[trackId].addSegment(segment);
                    });
                }
            }
            return filteredDatabase;
        }
        getDatesWithData() {
            let dates = [];
            for (const [_trackId, track] of Object.entries(this.tracks)) {
                for (const [_segmentId, segment] of Object.entries(track.segments)) {
                    let date = new Date(segment.start); // TODO: don't assume only lasts one day
                    if (!dates.map(date => JSON.stringify(date)).includes(JSON.stringify(date))) {
                        dates.push(date);
                    }
                }
            }
            return dates;
        }
    }

    // A DataTrack contains any number of DataSegments of the same data type (e.g. 3D_VIDEO, 2D_VIDEO, POSES, IOT)
    // Each DataTrack will be represented by a "layer" on the timeline, for example each unique person or recording device
    class DataTrack {
        constructor(id, type) {
            this.id = id;
            if (typeof TRACK_TYPES[type] === 'undefined') {
                console.warn('trying to create an unknown track type');
            }
            this.type = type;
            this.segments = {};
        }
        addSegment(segment) {
            if (segment.type !== this.type) {
                console.warn('trying to add incompatible segment to track');
                return;
            }
            this.segments[segment.id] = segment;
            segment.trackId = this.id;
        }
        getBounds() {
            // compute the min/max of segments' starts/ends
            let minStart = null;
            let maxEnd = null;
            for (const [_id, segment] of Object.entries(this.segments)) {
                if (minStart === null || segment.start < minStart) {
                    minStart = segment.start;
                }
                if (maxEnd === null || segment.end > maxEnd) {
                    maxEnd = segment.end;
                }
            }
            return {
                start: minStart,
                end: maxEnd
            };
        }
    }

    // A DataSegment is a contiguous data event, such as a 3D video, with a specific start and end time
    // The actual data payload is contained in one or more DataPieces that the segment contains
    // DataSegments belong to DataTracks, which will organize them vertically on the timeline.
    class DataSegment {
        constructor(id, type, start, end) {
            this.id = id;
            if (typeof TRACK_TYPES[type] === 'undefined') {
                console.warn('trying to create an unknown segment type');
            }
            this.type = type;
            this.start = start;
            this.end = end;
            this.dataPieces = {};
        }
        addDataPiece(dataPiece) {
            this.dataPieces[dataPiece.id] = dataPiece;
            dataPiece.segmentId = this.id;
        }
        getTimestampAsPercent(timestamp) {
            return (timestamp - this.start) / (this.end - this.start);
        }
    }

    // A DataPiece is a specific set of data that is attached to a DataSegment
    // for example, a video or a time-series array of data
    // A DataSegment can contain multiple DataPieces (e.g. a 3D_VIDEO segment contains 2 videos and an array of poses)
    class DataPiece {
        constructor(id, type) {
            this.id = id;
            if (typeof DATA_PIECE_TYPES[type] === 'undefined') {
                console.warn('trying to create an unknown data piece type');
            }
            this.type = type;
        }
        setVideoUrl(url) {
            if (this.type !== DATA_PIECE_TYPES.VIDEO_URL) { return; }
            this.videoUrl = url;
        }
        setTimeSeriesData(data) {
            if (this.type !== DATA_PIECE_TYPES.TIME_SERIES) { return; }
            if (data.length > 0) {
                let valid = typeof data[0].data !== 'undefined' && typeof data[0].time !== 'undefined';
                if (!valid) {
                    console.warn('A TIME_SERIES DataPiece needs the format [{data: _, time: _}, ...]', data[0]);
                    return;
                }
            }
            this.timeSeriesData = data;
        }
        getClosestData(timestamp) {
            if (this.type !== DATA_PIECE_TYPES.TIME_SERIES) { return null; }
            // TODO: store newer and older so that in future we can have option to interpolate
            let min_dt = Infinity;
            let closestEntry = null;
            this.timeSeriesData.forEach(entry => {
                let dt = Math.abs(timestamp - entry.time);
                if (dt < min_dt) {
                    min_dt = dt;
                    closestEntry = entry;
                }
            });
            return closestEntry;
        }
        getDataAtIndex(index) {
            if (this.type !== DATA_PIECE_TYPES.TIME_SERIES) { return null; }

            let clampedIndex = Math.max(0, Math.min(this.timeSeriesData.length - 1, index));
            return this.timeSeriesData[clampedIndex].data;
        }
    }

    // A DataView contains a filteredDatabase, which is a subset of the TimelineDatabase
    // where all segments are within the start and end timestamps
    class DataView {
        constructor(database) {
            this.start = null;
            this.end = null;
            this.database = database;
            this.filteredDatabase = database;
        }
        // updates the filteredDatabase to match the current view
        setTimeBounds(start, end) {
            this.start = start;
            this.end = end;
            // filter the database, keeping only pointers to segments within the data range
            this.filteredDatabase = this.database.getFilteredData(start, end);
        }
        // given a timestamp, returns all segments that occur at that time (partially overlap/contain that timestamp)
        processTimestamp(timestamp) {
            if (!this.filteredDatabase) { return []; }
            let currentSegments = [];
            for (const [trackId, track] of Object.entries(this.filteredDatabase.tracks)) {
                for (const [segmentId, segment] of Object.entries(track.segments)) {
                    if (segment.start <= timestamp && segment.end >= timestamp) {
                        currentSegments.push(segment);
                    }
                }
            }
            return currentSegments;
        }
    }

    exports.TimelineDatabase = TimelineDatabase;
    exports.DataTrack = DataTrack;
    exports.DataSegment = DataSegment;
    exports.DataPiece = DataPiece;
    exports.DataView = DataView;
    exports.TRACK_TYPES = TRACK_TYPES;
    exports.DATA_PIECE_TYPES = DATA_PIECE_TYPES;
})(realityEditor.videoPlayback);
