module.exports = Object.freeze({
    // how long should each video chunk be (ms). they are concatenated when recording stops.
    SEGMENT_LENGTH: 15000,
    // note: if we change this here, also need to change timeline playback,
    // because pose/image synchronization implementation depends on the FPS to locate the correct frame
    RECORDING_FPS: 10,

    // files are stored in the outputPath (currently Documents/spatialToolbox/.identity/virtualizer_recordings)
    // an example filepath looks something like virtualizer_recordings/deviceId/session_videos/color/filename.mp4
    DIR_NAMES: {
        unprocessed_chunks: 'unprocessed_chunks', // where to store raw 15 second recording chunks
        processed_chunks: 'processed_chunks', // where to store chunks after optional post-processing
        session_videos: 'session_videos', // where to store concatenated chunks as a final video
        color: 'color', // subdirectory for rgb video files
        depth: 'depth', // subdirectory for depth video files
        pose: 'pose' // subdirectory for pose json files
    },

    // adjustable ffmpeg parameters
    COLOR_FILETYPE: 'mp4',
    DEPTH_FILETYPE: 'mp4', // previously tried webm and mkv for lossless encoding but it never quite worked
    COLOR_CRF: 25, // 0 is pseudo-lossless, 51 is worst quality possible, 23 is considered default
    DEPTH_CRF: 0, // a subjectively sane range for crf is 17-28 (https://trac.ffmpeg.org/)
    COLOR_SCALE: 0.5, // camera image is initially (COLOR_WIDTH x COLOR_HEIGHT), this will scale down the video dimensions
    DEPTH_SCALE: 1, // depth sensor image should probably stay at scale=1 to preserve information.
    COLOR_WIDTH: 1920,
    COLOR_HEIGHT: 1080,
    DEPTH_WIDTH: 256,
    DEPTH_HEIGHT: 144,

    // disable to prevent lossy transformation, enable to stretch videos back to correct time length
    // (it's ok to be false, the video playback system can adjust for this)
    RESCALE_VIDEOS: false,
    DEBUG_LOG_FFMPEG: false
});
