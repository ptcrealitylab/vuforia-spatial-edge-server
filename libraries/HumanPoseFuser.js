
const HumanPoseObject = require('./HumanPoseObject');
const sgUtils = require('./sceneGraph/utils.js');
const utilities = require('./utilities.js');
const server = require('../server');
const { Matrix, SingularValueDecomposition } = require('ml-matrix');

/** Joint schema of human pose used for creation of fused HumanPoseObjects. This schema is also expected from the human objects coming from UI code of  ToolboxApp. */
const JOINTS = {
    NOSE: 'nose',
    LEFT_EYE: 'left_eye',
    RIGHT_EYE: 'right_eye',
    LEFT_EAR: 'left_ear',
    RIGHT_EAR: 'right_ear',
    LEFT_SHOULDER: 'left_shoulder',
    RIGHT_SHOULDER: 'right_shoulder',
    LEFT_ELBOW: 'left_elbow',
    RIGHT_ELBOW: 'right_elbow',
    LEFT_WRIST: 'left_wrist',
    RIGHT_WRIST: 'right_wrist',
    LEFT_HIP: 'left_hip',
    RIGHT_HIP: 'right_hip',
    LEFT_KNEE: 'left_knee',
    RIGHT_KNEE: 'right_knee',
    LEFT_ANKLE: 'left_ankle',
    RIGHT_ANKLE: 'right_ankle',
    HEAD: 'head', // synthetic
    NECK: 'neck', // synthetic
    CHEST: 'chest', // synthetic
    NAVEL: 'navel', // synthetic
    PELVIS: 'pelvis', // synthetic
};

/** Enum for the method for fusing poses for the same person from several views/toolbox apps. */
const FusionMethod = Object.freeze({
    BestSingleView: 'BestSingleView',
    BestSingleViewWithMultiviewCorrection: 'BestSingleViewWithMultiviewCorrection',
    MultiViewTriangulation: 'MultiViewTriangulation'
});

/** Enum for the metric used for selecting the best pose across several views/toolbox apps. */
const ViewSelectionMetric = Object.freeze({
    JointConfidence: 'JointConfidence',
    JointConfidence_Distance: 'JointConfidence_Distance'
});

/**
 * The object with pose data incoming from Toolbox apps or computed by HumanPoseFuser
 * @typedef {Object} WholePoseData
 * @property {string} name
 * @property {Array.<{x: number, y: number, z: number, confidence: number}> } joints
 * @property {number} timestamp
 * @property {Array.<number>} imageSize - [optional] present only in standard human objects
 * @property {Array.<number>} focalLength - [optional] present only in standard human objects
 * @property {Array.<number>} principalPoint - [optional] present only in standard human objects
 * @property {Array.<number>} transformW2C - [optional] present only in standard human objects
 * @property {number} poseConfidence - [optional] computed in HumanPoseFuser and present just temporarily
 */

/**
 * @classdesc This class is manages fusion of human pose streams from several cameras (ToolboxApps) in situations where a same person is observed from multiple viewpoints.
 * The current assumption is a single person in volumes observed by any number of cameras. However, the design aimed at several people and under certain conditions multiple people can be tracked already.
 * It creates new HumanPoseObject directly on server if there are at least 2 poses at the same location at the same time reported by standard HumanPoseObjects spawned by ToolboxApps.
 * The server-based objects are referred to as fused human objects and they provide final fused poses for each person. Standard human objects assigned to them have suppoting role and
 * their poses should not be used fo visualisation or analytics. However, the fused objects are dynamically created/deleted over time based on movement of a person through observed parts of space.
 * Also, the assignment of standard human objects to the fused ones changes over time. This dynamic approach allows:
 * - doing multi-view fusion only when it is needed
 * - movement of cameras during session
 * - limited support for multiple people
 */
class HumanPoseFuser {
    /**
     * @constructor
     * @param {Array.<Object>} objects - global variable 'objects'
     * @param {SceneGraph} sceneGraph - global variable 'sceneGraph'
     * @param {Object.<string, Object>} objectLookup - global variable 'objectLookup'
     * @param {string} ip
     * @param {string} version
     * @param {string} protocol
     * @param {number} beatPort
     * @param {string} serverUuid
     */
    constructor(objects, sceneGraph, objectLookup, ip, version, protocol, beatPort, serverUuid) {
        // references to global data structures for objects
        this.objectsRef = objects;
        this.sceneGraphRef = sceneGraph;
        this.objectLookupRef = objectLookup;

        // properties for HumanPoseObject creation
        this.ip = ip;
        this.version = version;
        this.protocol = protocol;
        this.beatPort = beatPort;
        this.serverUuid = serverUuid;

        /** Recent history of poses for each existing human object.
         * Dictionary - key: objectId, value: { ts of the last pose already fused, array of per-frame pose data }
         * Pose array is ordered with ascending timestamp
         * @type {Object.<string, {latestFusedDataTS: number, poses: Array.<WholePoseData>}>}
         */
        this.pastPoses = {};

        /** Dictionary - key: objectId of fused human object, value: objectId of associated human object which has currently best pose
         * @type {Object.<string, string>}
         */
        this.bestHumanObjectForFusedObject = {};

        /** Current assignment of standard human objects (coming from ToolboxApps) to fused human objects created by this class.
         * Dictionary - key: objectId of fused human object, value: array of objectIds of associated human objects
         * @type {Object.<string, Array.<string>>}
         */
        this.humanObjectsOfFusedObject = {
            getFusedObject(objectId) {
                for (let [fusedObjId, ids] of Object.entries(this)) {
                    if (typeof(ids) === "function")
                        continue;
                    let ind = ids.indexOf(objectId);
                    if (ind >= 0) {
                        return fusedObjId;
                    }
                }
                return null;
            },

            removeStandardObject(objectId) {
                for (let ids of Object.values(this)) {
                    if (typeof(ids) === "function")
                        continue;
                    let ind = ids.indexOf(objectId);
                    if (ind >= 0) {
                        ids.splice(ind, 1);
                    }
                }
            },

            getFusedObjectsToRemove() {
                let removedObjectIds = [];
                for (let [fusedObjId, ids] of Object.entries(this)) {
                    if (typeof(ids) === "function")
                        continue;
                    if (ids.length < 2) {
                        removedObjectIds.push(fusedObjId);
                    }
                }
                return removedObjectIds;
            },

            print() {
                let str = "";
                for (let [objectId, ids] of Object.entries(this)) {
                    if (typeof(ids) === "function")
                        continue;
                    str += objectId + ': ' + ids + '\n';
                }
                return str;
            }

        };

        /** Current translation offset betwen standard human objects (coming from ToolboxApps) and their parent (fused) human objects created by this class.
         * Dictionary - key: objectId of standard human object, value: 3d translation vector (from standard to fused human object)
         * @type {Object.<string, Array.<number>>}
         */
        this.offsetOfHumanObject = {};

        /** Timer to trigger main fuse() method. */
        this.intervalTimer = null;

        /** Dictionary which collects all updates to properties of human objects in current run of fusion (currently properties 'parent' and 'updatedByChildren')
         * It is a dictionary of dictionaries so we keep just one change per human object per its property
         */
        this.batchedUpdates = {};

        /* Configuration parameters */
        /** Verbose logging */
        this.verbose = true;
        /** same frequency as body tracking in Toolbox app */
        this.fuseIntervalMs = 100;
        /** time interval into past to keep in data in pastPoses (on timeline of data ts) */
        this.pastIntervalMs = 10000;
        /** time interval into past to find corresponding poses across human objects (on timeline of data ts) */
        this.recentIntervalMs = 500;
        /** time interval into past to assess pose confidence for a human object (on timeline of data ts) */
        this.confidenceIntervalMs = 500;
        /** difference in pose confidence to switch over to a different child human object */
        this.minConfidenceDifference = 0.2;
        /** distance threshold between selected joints (neck, pelvis) to consider two 3d poses beloging to the same person (at the same timestamp) */
        this.maxDistanceForSamePerson = 300; // mm
        /** max velocity of whole body - picked 2 m/s (average walking speed is 1.4 m/s) */
        this.maxHumanVelocity = 2.0;  // unit: mm/ms
        /** method for fusing poses for the same person from several views/toolbox apps. */
        this.fusionMethod = 'BestSingleView'; // 'BestSingleViewWithMultiviewCorrection';
        /** weighting individual observations according to joint confidence in multiview triangulation */
        this.viewWeighting = true;
        /** metric used for selecting the best pose across several views/toolbox apps */
        this.viewSelectionMetric = 'JointConfidence_Distance'; // 'JointConfidence';
        /** weight of distance-based confidence wrt. predicted pose confidence for viewSelectionMetric == 'JointConfidence_Distance' */
        this.distanceWeight = 0.33;
    }

    /** Starts fusion of human poses. */
    start() {
        this.intervalTimer = setInterval(() => {
            this.fuse();
        },
        this.fuseIntervalMs);
    }

    /** Stops fusion of human poses. */
    stop() {
        if (this.intervalTimer) {
            clearInterval(this.intervalTimer);
            this.intervalTimer = null;
        }
    }

    /** Fuses the current set of pose updates across human objects. The main method run at regular intervals. */
    fuse() {
        const start = Date.now();
        if (this.verbose) {
            console.log('-- Fusing poses');
        }

        let currentPoseData = this.findPoseDataMatchingInTime();

        if (this.verbose) {
            for (let [objectId, pose] of Object.entries(currentPoseData)) {
                console.log('obj=' + objectId + ', data_ts=' + pose.timestamp.toFixed(0) + ( (pose.joints.length == 0) ? ' (empty)' : '' ));
            }
        }

        this.assignPoseData(currentPoseData);

        if (this.verbose) {
            console.log('Assignment to fused human objects: \n', this.humanObjectsOfFusedObject.print());
        }

        this.fusePoseData(currentPoseData);

        // send out property updates to all human objects from this frame to all subscribers
        let batchedUpdatesArr = [];
        for (let objectData of Object.values(this.batchedUpdates)) {
            for (let propertyData of Object.values(objectData)) {
                batchedUpdatesArr.push(propertyData);
            }
        }
        server.socketHandler.sendUpdateToAllSubscribers(batchedUpdatesArr);

        this.cleanPastPoses();

        if (this.verbose) {
            const elapsedTimeMs = Date.now() - start;
            console.log(`Fusion time: ${elapsedTimeMs}ms`);
        }
    }

    /**
     * Adds new pose for a human object.
     * @param {string} objectId - id of human object
     * @param {WholePoseData} wholePose - pose
     */
    addPoseData(objectId, wholePose) {
        if (this.pastPoses[objectId] === undefined) {
            this.pastPoses[objectId] = {
                latestFusedDataTS: 0,
                poses: []
            };
        }

        let isFusedObject = this.humanObjectsOfFusedObject[objectId] !== undefined;
        if (!isFusedObject) {
            // pose of a standard human object from the app

            if (wholePose.joints && wholePose.joints.length > 0) {
                // check presence of all necessary data if it is not an empty pose (but we still record its timestamp)
                if (! ((wholePose.imageSize && wholePose.imageSize.length == 2) &&
                      (wholePose.focalLength && wholePose.focalLength.length == 2) &&
                      (wholePose.principalPoint && wholePose.principalPoint.length == 2) &&
                      (wholePose.transformW2C && wholePose.transformW2C.length == 16)) ) {
                    console.warn('Incomplete or incorrect pose data.');
                }
            }

            // extend pose object with overall confidence but prevent it to be copyable
            // NOTE: currently used just in fusion method which selects the best single view
            wholePose.poseConfidence = this.computeOverallConfidence(wholePose);

            // prevent optional properties being copiable into a fused pose where they don't have a meaning
            Object.defineProperties(wholePose, {
                imageSize: {enumerable: false},
                focalLength: {enumerable: false},
                principalPoint: {enumerable: false},
                transformW2C: {enumerable: false},
                poseConfidence: {enumerable: false}
            });
        }

        this.pastPoses[objectId].poses.push(wholePose);
    }

    /** Computes overall confidence of whole pose from joint confidences.
     * @param {WholePoseData>} pose
     * @returns {number} overall pose confidence in range [0, 1] (0 = no confidence)
     */
    computeOverallConfidence(pose) {
        let finalConfidence = 0;
        let poseConfidence = this.computePoseConfidence(pose.joints);

        switch (this.viewSelectionMetric) {
        case ViewSelectionMetric.JointConfidence: {
            finalConfidence = poseConfidence;
            break;
        }
        case ViewSelectionMetric.JointConfidence_Distance: {
            if (pose.joints.length == 0) {
                finalConfidence = 0.0;
                break;
            }
            let cameraDistance = this.calculateDistanceToCamera(pose.joints, pose.transformW2C);

            // distance threholds in mm units
            // based on iPhone/iPad Lidar operating range
            const minDistance = 500;
            const maxReliableDistance = 2500;
            const maxDistance = 5000;

            // zero output confidence when the human pose is in a distance outside operating range of depth sensor
            if (cameraDistance < minDistance || cameraDistance > maxDistance) {
                finalConfidence = 0.0;
            } else {
                // calculate distance-based confidence in range [0,1]; 0 at maxDistance and 1 at maxReliableDistance
                let distanceConfidence = (cameraDistance < maxReliableDistance) ? 1.0 : ((maxDistance - cameraDistance) / (maxDistance - maxReliableDistance));

                // weighted combination of two metrics; stays in the range [0,1]
                finalConfidence = (1.0 - this.distanceWeight) * poseConfidence + this.distanceWeight * distanceConfidence;
            }
            break;
        }
        default:
            console.error('Unknown selection metric.');
        }

        return finalConfidence;
    }

    /** Computes overall confidence of whole pose from joint confidences.
     * @param {Array.< {x: number, y: number, z: number, confidence: number} >} poseJoints
     * @returns {number} overall pose confidence
     */
    computePoseConfidence(poseJoints) {

        if (poseJoints.length == 0) {
            return 0.0;
        }

        // limit to joints which are not synthetically computed,
        // and keep just one 'head' joint - nose to limit an influence of head
        const selectedJointNames = ['nose', 'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow', 'left_wrist', 'right_wrist', 'left_hip', 'right_hip', 'left_knee', 'right_knee', 'left_ankle', 'right_ankle'];

        const joints = Object.values(JOINTS);
        let sum = 0.0;
        for (let name of selectedJointNames) {
            const jointIndex = joints.indexOf(name);

            if (jointIndex >= 0) {
                sum += poseJoints[jointIndex].confidence;
            }
        }

        return sum / selectedJointNames.length;
    }

    /**
     * Calculates depth of whole pose from its camera/view (not 3D euclidean distance).
     * @param {Array.< {x: number, y: number, z: number, confidence: number} >} joints
     * @param {Array.<number>} cameraPose - 4x4 transform from world to camera CS
     * @returns {number} depth in mm
     */
    calculateDistanceToCamera(joints, cameraPose) {
        // create 3x4 transform matrix (defined row by row)
        // cameraPose is stored column-wise in 1D array
        let T = new Matrix([
            [cameraPose[0], cameraPose[4], cameraPose[8],  cameraPose[12]],
            [cameraPose[1], cameraPose[5], cameraPose[9],  cameraPose[13]],
            [cameraPose[2], cameraPose[6], cameraPose[10], cameraPose[14]]
        ]);

        const selectedJointNames = ['pelvis', 'neck'];
        const jointNames = Object.values(JOINTS);
        let depth = 0.0;
        let count = 0;
        for (let name of selectedJointNames) {
            const jointIndex = jointNames.indexOf(name);
            if (jointIndex >= 0) {
                // transfrom to camera CS where z axis is along viewing direction
                const p3dW = Matrix.columnVector([joints[jointIndex].x, joints[jointIndex].y, joints[jointIndex].z, 1]);
                let p3dC = T.mmul(p3dW);
                depth += p3dC.get(2, 0);
                count++;
            }
        }
        depth /= count;

        return Math.abs(depth);
    }

    /** Removes internal data about a given human object
     * @param {string} objectId - identificator of human object
     */
    removeHumanObject(objectId) {

        if (this.verbose) {
            console.log('removing human obj=' + objectId);
        }

        // remove pose history of a deleted human object if there is any
        delete this.pastPoses[objectId];

        if (this.humanObjectsOfFusedObject[objectId] === undefined) { // a standard human object
            let fusedObjectId = this.humanObjectsOfFusedObject.getFusedObject(objectId);

            // remove association of a deleted object to any fused human object
            this.humanObjectsOfFusedObject.removeStandardObject(objectId);

            // remove fused human objects if it has less than 2 associated human objects
            if (fusedObjectId && this.humanObjectsOfFusedObject[fusedObjectId].length < 2) {
                this.removeHumanObject(fusedObjectId);
            }

            delete this.offsetOfHumanObject[objectId];

            // TODO (future): if the object is currently in bestHumanObjectForFusedObject, remove the entry

        } else {  // a fused human object
            // remove relevant data from its remaining associated human objects
            for (let id of this.humanObjectsOfFusedObject[objectId]) {
                // remove parent reference
                if (this.objectsRef[id] !== undefined) {
                    this.objectsRef[id].parent = 'none';

                    if (this.batchedUpdates[id] === undefined) {
                        this.batchedUpdates[id] = {};
                    }
                    this.batchedUpdates[id]['parent'] = {
                        objectKey: id,
                        frameKey: null,
                        nodeKey: null,
                        propertyPath: 'parent',
                        newValue: 'none',
                        editorId: 0
                    };
                }

                // remove the offset to the fused object being deleted
                delete this.offsetOfHumanObject[id];
            }

            // remove all association data if the given object is a fused human object
            delete this.humanObjectsOfFusedObject[objectId];
            delete this.bestHumanObjectForFusedObject[objectId];

        }
    }

    /** Clears older poses in history across all human objects. */
    cleanPastPoses() {
        // get the latest data timestamp
        let latestTS = 0;
        for (let objPoses of Object.values(this.pastPoses)) {
            if (objPoses.poses.length > 0) {
                let latestPose = objPoses.poses[objPoses.poses.length - 1];
                if (latestPose.timestamp > latestTS) {
                    latestTS = latestPose.timestamp;
                }
            }
        }

        if (latestTS == 0) {
            return;
        }

        let cutoffTS = latestTS - this.pastIntervalMs;

        // delete poses older than a given ts across all human pose objects
        for (let objPoses of Object.values(this.pastPoses)) {
            this.removeOldPoseData(objPoses.poses, cutoffTS);
        }
    }

    /**
     * Removes poses of a given huamn object older than a specified timestamp.
     * @param {Array.<WholePoseData>} poseArr - poses
     * @param {number} timestamp
     */
    removeOldPoseData(poseArr, timestamp) {
        // the oldest data are at the start of array
        let deleteCount = 0;
        for (let i = 0; i < poseArr.length; i++) {
            if (poseArr[i].timestamp > timestamp) {
                break;
            }
            deleteCount++;
        }
        poseArr.splice(0, deleteCount);
    }

    /**
     * Finds corresponding set of poses in time across human objects.
     * Simple approach of taking the latest poses across human pose objects up to short interval into past (for now).
     * @returns {Object.<string, WholePoseData>} dictionary with key of objectId and value of single pose
     */
    findPoseDataMatchingInTime() {

        let matchingPoses = {};

        // get the latest data across objects and find the most recent timestamp
        let latestTS = 0;
        for (let [objectId, objPoses] of Object.entries(this.pastPoses)) {
            if (objPoses.poses.length > 0) {
                let latestPose = objPoses.poses[objPoses.poses.length - 1];
                let ts = latestPose.timestamp;

                if (this.humanObjectsOfFusedObject[objectId] !== undefined) {
                    // a fused human object
                    matchingPoses[objectId] = latestPose;
                    if (ts > latestTS) {
                        latestTS = ts;
                    }
                } else {
                    // a standard human object from the app
                    if (ts > objPoses.latestFusedDataTS) {
                        matchingPoses[objectId] = latestPose;
                        objPoses.latestFusedDataTS = ts;
                        if (ts > latestTS) {
                            latestTS = ts;
                        }
                    }
                }
            }
        }

        // filter out poses older than recent past
        let cutoffTS = latestTS - this.recentIntervalMs;
        let filteredMatchingPoses = Object.fromEntries(Object.entries(matchingPoses).filter(entry => entry[1].timestamp > cutoffTS));

        const numFiltered = Object.keys(matchingPoses).length - Object.keys(filteredMatchingPoses).length;
        if (this.verbose && numFiltered > 0) {
            console.log(`Filtered ${numFiltered} poses.`);
        }

        return filteredMatchingPoses;
    }

    /**
     * Checks if two human poses can be considered from the same person. It is configurable based on the scenario when this check is needed.
     * @param {number} distance - distance between two poses (as computed by calculateDistanceBetweenPoses)
     * @param {number} ts1 - timestamp of first pose
     * @param {number} ts2 - timestamp of second pose
     * @param {number} multiplier - multiplier of distance threshold
     * @return {boolean}
     */
    arePosesOfSamePerson(distance, ts1, ts2, multiplier = 1.0) {
        // distance threshold is calculated from two components:
        // - base deviation between poses at the same timestamp
        // - max possible shift between poses from different timestamp due to person's movement
        //   (this is to accomodate in particular comparisons between fused pose from previous frame and current pose from standard human object)
        const distanceThreshold = multiplier * this.maxDistanceForSamePerson + this.maxHumanVelocity * Math.abs(ts1 - ts2);

        return distance < distanceThreshold;
    }

    /**
     * Calculate a distance metric between two human poses
     * @param {Array.< {x: number, y: number, z: number, confidence: number} >} joints1 - joints of first pose
     * @param {Array.< {x: number, y: number, z: number, confidence: number} >} joints2 - joints of second pose
     * @return {number}
     */
    calculateDistanceBetweenPoses(joints1, joints2) {

        // check distances between pelvis and neck
        let pelvisIndex = Object.values(JOINTS).indexOf('pelvis');
        let neckIndex = Object.values(JOINTS).indexOf('neck');

        if (pelvisIndex < 0 || neckIndex < 0) {
            // this should not really happen in correct joint schema
            return Infinity;
        }

        let pelvisDist = sgUtils.positionDistance(joints1[pelvisIndex], joints2[pelvisIndex]);
        let neckDist = sgUtils.positionDistance(joints1[neckIndex], joints2[neckIndex]);

        return Math.max(pelvisDist, neckDist);
    }

    /**
     * Selects the best human object to update its parent fused human object based on presence and confidence of poses received in recent past.
     * Note that it can select an object (from app/view) which received empty pose since the last fusion run.
     * @param {string} fusedObjectId - id of parent fused object
     * @param {Object.<string, WholePoseData>} poseData - current poses for human objects associated with the fused object
     * @return {string | null} objectId
     */
    selectHumanObject(fusedObjectId, poseData) {

        let bestObjectId = null;

        let poseDataArr = Object.entries(poseData);
        if (poseDataArr.length == 0) {
            return bestObjectId;
        }

        // get the latest data timestamp
        let latestTS = 0;
        for (let pose of Object.values(poseData)) {
            if (pose.timestamp > latestTS) {
                latestTS = pose.timestamp;
            }
        }

        let cutoffTS = latestTS - this.confidenceIntervalMs;
        let str = "";
        let candidateConfidences = [];
        // look at pose confidence history of all associated human pose objects
        for (let objectId of this.humanObjectsOfFusedObject[fusedObjectId]) {

            // check if there is a current pose of the object
            const poseItem = poseDataArr.find(item => item[0] == objectId);
            let ts = 0;
            if (poseItem !== undefined) {
                ts = poseItem[1].timestamp;
            } else {
                ts = latestTS;
            }

            let objectConfidence = 0.0;

            /*
            // older less optimal approach
            // aggregate pose confidence over recent frames
            for (let pose of this.pastPoses[objectId].poses) {
                if (pose.timestamp > cutoffTS && pose.timestamp < (ts + 1.0)) {   // increase by one ms to ensure that the current pose is also included
                    objectConfidence += pose.poseConfidence;
                }
            }
            */

            // get confidence of the most recent pose in the timeinterval
            let objLatestTS = 0;
            for (let pose of this.pastPoses[objectId].poses) {
                if (pose.timestamp > cutoffTS && pose.timestamp < (ts + 1.0)) {   // increase by one ms to ensure that the current pose is also included
                    if (pose.timestamp > objLatestTS) {
                        objectConfidence = pose.poseConfidence;
                        objLatestTS = pose.timestamp;
                    }
                }
            }

            candidateConfidences.push({id: objectId, value: objectConfidence});
            str += objectId + ' = ' + objectConfidence.toFixed(3) + ', ';
        }
        if (this.verbose) {
            console.log('Recent confidence: ', str);
        }

        let currentBest; // undefined
        if (candidateConfidences.length > 0) {
            // find the human object with the highest confidence
            currentBest = candidateConfidences.reduce( (max, current) => { return max.value > current.value ? max : current; } );
        }

        const previousSelectedObject = this.bestHumanObjectForFusedObject[fusedObjectId]; // can be also undefined
        const previousBest = candidateConfidences.find(item => item.id == previousSelectedObject);
        if (previousBest !== undefined && currentBest !== undefined) {
            // add some hysteresis to select a different human object
            if ((currentBest.value - previousBest.value) > this.minConfidenceDifference) {
                bestObjectId = currentBest.id;
            } else {
                bestObjectId = previousBest.id;
            }
        } else if (previousBest !== undefined && currentBest == undefined) {
            // keep the human object selected so far because there is no current candidate
            bestObjectId = previousBest.id;
        } else if (previousBest == undefined && currentBest !== undefined) {
            // the human object selected so far is not available, switch to the current best
            bestObjectId = currentBest.id;
        } else {
            // return null id below
        }

        if (bestObjectId) {
            this.bestHumanObjectForFusedObject[fusedObjectId] = bestObjectId;
        }

        return bestObjectId;
    }

    /**
     * Triangulates 3d position of a single point from 2D observations in multiple views
     * @param {*} projectionMatrices - 3x4 transform matrices per view
     * @param {*} points2D - 2d positions per view
     * @param {*} weights - weighting of individual views
     * @return {Array.<number> | null}
     */
    triangulatePoint(projectionMatrices, points2D, weights) {

        let point3D = [];

        try {  // to catch any exception from mljs lib
            let AArr = [];  // row by row
            for (let v = 0; v < projectionMatrices.length; v++) {
                const P = projectionMatrices[v];

                AArr.push(Matrix.sub(P.getRowVector(2).mul(points2D[v][0]), P.getRowVector(0)).mul(weights[v]).getRow(0));
                AArr.push(Matrix.sub(P.getRowVector(2).mul(points2D[v][1]), P.getRowVector(1)).mul(weights[v]).getRow(0));
            }

            // solve homogeneous system A*x = 0
            // set options to save computation
            const svdOptions = {
                computeLeftSingularVectors: false,
                computeRightSingularVectors: true,
                autoTranspose: false
            };
            let A = new Matrix(AArr);
            let svd = new SingularValueDecomposition(A, svdOptions);

            if (svd.rank < A.columns) {
                // cannot get 3D point from under-constrained system
                return null;
            }

            // search for the smallest singular value to pick one of right singular vectors
            let singularValues = svd.diagonal; // Array
            let orderedSingularValues = [];
            for (let i = 0; i < singularValues.length; i++) {
                orderedSingularValues.push([i, singularValues[i]]);
            }
            orderedSingularValues.sort((a, b) => a[1] - b[1]); // in ascending order
            let x = svd.rightSingularVectors.getColumnVector(orderedSingularValues[0][0]); // select the vector for the smallest singular value
            let nx = Matrix.div(x, x.get(3, 0));  // normalise to get 3D position

            // NOTE: can singular value and especially related singular vector a zero vector?
            if (Math.abs(orderedSingularValues[0][1]) < svd.threshold) {
                console.warn(`Near-zero singular value: ${orderedSingularValues[0][1]}; x = ${x}; nx = ${nx}`);
            }

            point3D = [nx.get(0, 0), nx.get(1, 0), nx.get(2, 0)];

        } catch (error) {
            console.warn('Point triangulation: ' + error);
            return null;
        }

        return point3D;
    }

    /** Triangulates a set of poses associated with a fused human object.
     * @param {Array.< [string, WholePoseData] >} poseDataArr - current poses for human objects associated with the fused object
     * @return {WholePoseData | null} triangulated 3D pose or null when failed
     */
    triangulatePose(poseDataArr) {
        if (poseDataArr.length < 2) {
            return null;
        }

        // prepare data
        let projectionMatrices = []; // per-view
        let jointsInView = []; // joint 2D positions + confidences per view
        let latestTS = 0; // the latest data timestamp
        for (let [_id, pose] of poseDataArr) {
            // create calibration matrix (defined row by row)
            let K = new Matrix([
                [pose.focalLength[0], 0, pose.principalPoint[0]],
                [0, pose.focalLength[1], pose.principalPoint[1]],
                [0, 0, 1]
            ]);
            // create 3x4 transform matrix (defined row by row)
            // 4x4 transformW2C is stored column-wise in 1D array
            let T = new Matrix([
                [pose.transformW2C[0], pose.transformW2C[4], pose.transformW2C[8],  pose.transformW2C[12]],
                [pose.transformW2C[1], pose.transformW2C[5], pose.transformW2C[9],  pose.transformW2C[13]],
                [pose.transformW2C[2], pose.transformW2C[6], pose.transformW2C[10], pose.transformW2C[14]]
            ]);
            // compute full projection matrix
            let P = K.mmul(T);

            // TODO: don't triangulate synthetic joints ?
            // project all joint 3D points to 2D positions in the view (in pixel units)
            let joints2D = [];
            for (let joint of pose.joints) {
                // project to 2D position (image xy axes are according to Vuforia API / OpenGL)
                const p3d = Matrix.columnVector([joint.x, joint.y, joint.z, 1]);
                let p2d = P.mmul(p3d);
                p2d.div(p2d.get(2, 0));

                let ix = p2d.get(0, 0);
                let iy = p2d.get(1, 0);
                if ((ix > 0) && (ix < pose.imageSize[0]) && (iy > 0) && (iy < pose.imageSize[1])) {
                    // projects into the bounds of original image
                    joints2D.push({ix: ix, iy: iy, confidence: joint.confidence});
                } else {
                    // give zero weight since it is outside of image boundary
                    joints2D.push({ix: ix, iy: iy, confidence: 0.0});
                }
            }

            jointsInView.push(joints2D);
            projectionMatrices.push(P);

            if (pose.timestamp > latestTS) {
                latestTS = pose.timestamp;
            }
        }

        // prepare output pose
        let mvPose = {
            name: '',
            timestamp: latestTS,
            joints: []
        };

        // triangulate individual joints
        const numJoints = jointsInView[0].length;
        const numViews = jointsInView.length;
        for (let j = 0; j < numJoints; j++) {
            let weights = [];
            let points2D = [];
            for (let v = 0; v < numViews; v++) {
                points2D.push([jointsInView[v][j].ix, jointsInView[v][j].iy]);
                if (this.viewWeighting) {
                    // weight individual observations according to joint confidence
                    weights.push(jointsInView[v][j].confidence);
                } else {
                    weights.push(1.0);
                }
            }
            let point3D = this.triangulatePoint(projectionMatrices, points2D, weights);

            if (point3D) {
                // TODO (future): compute new 'multiview' confidence
                mvPose.joints.push({x: point3D[0], y: point3D[1], z: point3D[2], confidence: 1.0});
            } else {
                // failed to compute joint position, give zero confidence
                mvPose.joints.push({x: 0.0, y: 0.0, z: 0.0, confidence: 0.0});
            }

        }

        // TODO (future): check if joint was not computed and come up with approximate position

        return mvPose;
    }

    /**
     * @param {Array.< [string, WholePoseData] >} poseDataArr - current poses for human objects associated with the fused object
     */
    computeCorrectionOffsets(poseDataArr) {

        let mvPose = this.triangulatePose(poseDataArr);
        if (!mvPose) {
            // initialise zero offset when triangulation failed, so the 'uncorrected' poses can be still reported later on
            for (let [objectId, _pose] of poseDataArr) {
                if (this.offsetOfHumanObject[objectId] == undefined) {
                    this.offsetOfHumanObject[objectId] = [0.0, 0.0, 0.0];
                }
            }

            // TODO: here could be check of time elapsed since the last offset update. If it's over some time threshold, all offsets could be zeroed
            if (this.verbose) {
                console.warn('Failed to triangulate skeleton for offset .');
            }
            return;
        }

        // select torso joints which are not synthetically computed and derive more robust 'torso' offset
        const selectedJointNames = ['left_shoulder', 'right_shoulder', 'left_hip', 'right_hip'];
        const joints = Object.values(JOINTS);

        // across all human objects from individual views
        for (let [objectId, pose] of poseDataArr) {
            let weightSum = 0.0;
            let offset = [0.0, 0.0, 0.0];
            // weighted average of the offset for a pose across selected joints
            for (let name of selectedJointNames) {
                const jointIndex = joints.indexOf(name);
                if (jointIndex < 0) {
                    continue;  // did not find the joint name
                }
                const point = pose.joints[jointIndex];
                const mvPoint = mvPose.joints[jointIndex];
                if (mvPoint.confidence > 0.0) {
                    offset[0] += point.confidence * (mvPoint.x - point.x);
                    offset[1] += point.confidence * (mvPoint.y - point.y);
                    offset[2] += point.confidence * (mvPoint.z - point.z);
                    weightSum += point.confidence;
                }
            }

            if (weightSum > 0.0) {
                offset[0] /= weightSum; offset[1] /= weightSum; offset[2] /= weightSum;
                this.offsetOfHumanObject[objectId] = offset;
            } else {
                if (this.offsetOfHumanObject[objectId] == undefined) {
                    this.offsetOfHumanObject[objectId] = [0.0, 0.0, 0.0];
                }
                console.warn('Failed to compute correction offset.');
            }
        }

        return;
    }

    /** Shift human pose by 3D translation.
     * @param {WholePoseData} pose - input pose
     * @param {Array.<number>} offset - 3d translation vector
     * @return {WholePoseData} shifted 3D pose
     */
    applyOffsetToPose(pose, offset) {
        // prepare output pose
        let outPose = {
            name: pose.name,
            timestamp: pose.timestamp,
            joints: []
        };

        // move individual joints
        for (let joint of pose.joints) {
            outPose.joints.push({x: joint.x + offset[0], y: joint.y + offset[1], z: joint.z + offset[2], confidence: joint.confidence});
        }

        return outPose;
    }

    /** Updates a specified fused human object.
     * @param {string} fusedObjectId - id of fused human object
     * @param {Object.<string, WholePoseData>} poseData - current poses for human objects associated with the fused object
     */
    updateFusedObject(fusedObjectId, poseData) {

        if (this.objectsRef[fusedObjectId] === undefined) {
            console.warn('Updating non-existent fused human pose object.');
            return;
        }

        let finalPose;  // undefined as default
        // standard object ids used in the fusion
        // because of recorder limitations this cannot be an empty array when used for updatedByChildren property at the end. Instead we place 'none' item when it is meant to be empty.
        let updatedByChildren = [];

        switch (this.fusionMethod) {
        case FusionMethod.MultiViewTriangulation: {
            // filter empty poses
            let poseDataArr = Object.entries(poseData).filter(entry => entry[1].joints.length > 0);
            if (poseDataArr.length == 0) {
                // no data in current frame, do nothing
            } else if (poseDataArr.length == 1) {
                // single view is currently updating the fused object
                // currently, no update when poses from all expected views are not present (as in FusionMethod.BestSingleView)

                // TODO: need to allow for the situation when there is just single human object associated with the fused object
                // TODO: too volatile swithing between multiview and single view (hysteresis before switching to it?)
                // finalPose = poseDataArr[0][1];
                // fusedObjectIds.push(poseDataArr[0][0]);
            } else {
                // actual multiview fusion
                let mvPose = this.triangulatePose(poseDataArr);
                if (!mvPose) {
                    console.warn('Failed to triangulate 3D pose.');
                    updatedByChildren.push('none');
                } else {
                    // take directly current pose from the selected human object
                    finalPose = mvPose;
                    for (let [objectId, _pose] of poseDataArr) {
                        updatedByChildren.push(objectId);
                    }
                }
            }
            break;
        }
        case FusionMethod.BestSingleViewWithMultiviewCorrection: {
            let selectedObjectId = this.selectHumanObject(fusedObjectId, poseData);
            if (!selectedObjectId) {
                console.warn('Cannot select the best object for a fused human object.');
                updatedByChildren.push('none');
            } else {
                // filter empty poses
                let poseDataArr = Object.entries(poseData).filter(entry => entry[1].joints.length > 0);
                this.computeCorrectionOffsets(poseDataArr);

                // take current pose from the selected human object and apply the correction offset
                // the pose can be undefined in the current frame and offset might not be estimated yet
                if (poseData[selectedObjectId] !== undefined && this.offsetOfHumanObject[selectedObjectId] !== undefined) {
                    finalPose = this.applyOffsetToPose(poseData[selectedObjectId], this.offsetOfHumanObject[selectedObjectId]);
                }
                updatedByChildren.push(selectedObjectId);
            }
            break;
        }
        case FusionMethod.BestSingleView: {
            let selectedObjectId = this.selectHumanObject(fusedObjectId, poseData);
            if (!selectedObjectId) {
                console.warn('Cannot select the best object for a fused human object.');
                updatedByChildren.push('none');
            } else {
                // take directly current pose from the selected human object (can be undefined in the current frame)
                finalPose = poseData[selectedObjectId];
                updatedByChildren.push(selectedObjectId);
            }
            break;
        }
        default:
            console.error('Unknown fusion method.');
        }

        // detect change in the subset of associated (child) human objects which currently update their fused object
        const equalArrays = (a, b) => a.length === b.length && a.every((element, index) => element === b[index]);

        if (!equalArrays(updatedByChildren, this.objectsRef[fusedObjectId].updatedByChildren)) {
            // a change detected, we need to update the property
            this.objectsRef[fusedObjectId].updatedByChildren = updatedByChildren;

            if (this.batchedUpdates[fusedObjectId] === undefined) {
                this.batchedUpdates[fusedObjectId] = {};
            }
            this.batchedUpdates[fusedObjectId]['updatedByChildren'] = {
                objectKey: fusedObjectId,
                frameKey: null,
                nodeKey: null,
                propertyPath: 'updatedByChildren',
                newValue: updatedByChildren,
                editorId: 0
            };
        }

        if (finalPose === undefined || finalPose.joints.length == 0) {
            if (this.verbose) {
                console.log('not updating joints: obj=' + fusedObjectId);
            }
            return;
        }

        this.objectsRef[fusedObjectId].updateJoints(finalPose.joints);
        this.objectsRef[fusedObjectId].lastUpdateDataTS = finalPose.timestamp;
        server.resetObjectTimeout(fusedObjectId); // keep the object alive

        // create copy and update name (unnecessary properties not copied)
        let wholePose = Object.assign({}, finalPose);
        let end = fusedObjectId.indexOf('pose1');
        let name = fusedObjectId.substring('_HUMAN_'.length, end + 'pose1'.length);
        wholePose.name = name; // 'server***_pose1' in practise for now

        // add also to pastPoses (unnecessary properties not stored)
        this.addPoseData(fusedObjectId, wholePose);

        // update public data of a selected node to enable transmission of new pose state to clients (eg. remote operator viewer)
        // NOTE: string 'whole_pose' is defined in JOINT_PUBLIC_DATA_KEYS in UI codebase
        let keys = this.objectsRef[fusedObjectId].getJointNodeInfo(0);
        if (this.objectsRef.hasOwnProperty(keys.objectKey)) {
            if (this.objectsRef[keys.objectKey].frames.hasOwnProperty(keys.frameKey)) {
                if (this.objectsRef[keys.objectKey].frames[keys.frameKey].nodes.hasOwnProperty(keys.nodeKey)) {
                    var data = this.objectsRef[keys.objectKey].frames[keys.frameKey].nodes[keys.nodeKey].publicData;
                    data['whole_pose'] = wholePose;
                    // sent out message with this updated data to all subscribers (eg. remote viewer)
                    server.socketHandler.sendPublicDataToAllSubscribers(keys.objectKey, keys.frameKey, keys.nodeKey, 0 /*sessionUuid*/);
                }
            }
        }
        if (this.verbose) {
            console.log('updating joints: obj=' + fusedObjectId + ' with [' + updatedByChildren + '], data_ts=' + finalPose.timestamp.toFixed(0) + ', update_ts=' + Date.now());
        }
    }

    /** Assigns current poses of standard human object to existing fused human objects or creates new fused humans out of them.
     * @param {Object.<string, WholePoseData>} poseData - current poses for existing human objects
     */
    assignPoseData(poseData) {

        // filter empty poses or poses of (just!) removed human objects
        //let before = Object.entries(poseData).length;
        let poseDataArr = Object.entries(poseData).filter(entry =>
            (entry[1].joints.length > 0 && (this.objectsRef[entry[0]] !== undefined))
        );
        /*if (before != poseDataArr.length) {
            console.log(`Pose data count: before=${before}, after=${poseDataArr.length}`);
        }*/

        // compare all pairs of poses and make a matrix of spatial proximity
        let proximityMatrix = Array.from(new Array(poseDataArr.length), () => new Array(poseDataArr.length).fill(0.0));
        let standardIndices = [];
        let fusedIndices = [];
        for (let i = 0; i < poseDataArr.length; i++) {
            proximityMatrix[i][i] = 0.0;
            // poseDataArr contains poses of standard and fused human objects, store indices for each group
            if (this.humanObjectsOfFusedObject[poseDataArr[i][0]] !== undefined) {
                fusedIndices.push(i);
            } else {
                standardIndices.push(i);
            }
            for (let j = i + 1; j < poseDataArr.length; j++) {
                proximityMatrix[i][j] = proximityMatrix[j][i] = this.calculateDistanceBetweenPoses(poseDataArr[i][1].joints, poseDataArr[j][1].joints);
            }
        }

        // process poses of standard objects
        let unassignedStandardIndices = [];
        for (let index of standardIndices) {
            let parentValue;  // undefined on purpose to distinguish from null
            let id = poseDataArr[index][0];
            let fid = this.humanObjectsOfFusedObject.getFusedObject(id);
            if (fid) {
                // standard human object is already associated with a fused human object
                // check if this fused object is available in the current frame
                const fi = poseDataArr.findIndex(item => item[0] == fid);
                if (fi >= 0) {
                    // check if the poses are still at the same location, but apply some hysteresis by increasing distance threshold
                    if (!this.arePosesOfSamePerson(proximityMatrix[fi][index], poseDataArr[fi][1].timestamp, poseDataArr[index][1].timestamp, 3)) {
                        // detach the standard object from the fused human object so the pose is not used in subsequent fusion
                        this.humanObjectsOfFusedObject.removeStandardObject(id);
                        parentValue = 'none';
                        unassignedStandardIndices.push(index);
                        if (this.verbose) {
                            console.log('unassigning human obj=' + id + ' from ' + fid);
                        }
                    }
                }
            } else {
                // standard human object is not associated with any fused human object
                // try to associate it with one of the fused objects available in the current frame
                let assigned = false;
                for (let findex of fusedIndices) {
                    if (this.arePosesOfSamePerson(proximityMatrix[findex][index], poseDataArr[findex][1].timestamp, poseDataArr[index][1].timestamp)) {
                        // they are close, make association
                        let fid2 = poseDataArr[findex][0];
                        this.humanObjectsOfFusedObject[fid2].push(id);
                        parentValue = fid2;  // fused object id
                        assigned = true;
                        if (this.verbose) {
                            console.log('assigning human obj=' + id + ' from ' + fid2);
                        }
                        break;
                    }
                    // TODO (future): selection could be based on the smallest distance
                }
                if (!assigned) {
                    unassignedStandardIndices.push(index);
                }
            }

            if (parentValue !== undefined) {
                // set new parent reference
                this.objectsRef[id].parent = parentValue;

                // make entry in batchedUpdates
                if (this.batchedUpdates[id] === undefined) {
                    this.batchedUpdates[id] = {};
                }
                this.batchedUpdates[id]['parent'] = {
                    objectKey: id,
                    frameKey: null,
                    nodeKey: null,
                    propertyPath: 'parent',
                    newValue: parentValue,
                    editorId: 0
                };

                // remove the previous offset if it exists (just in case for both unassign and assign from/to fused object)
                delete this.offsetOfHumanObject[id];
            }
        }

        // process poses of standard objects not associated with any existing fused objects
        // create overlapping groups of spatially close poses
        let poseObjsSamePerson = [];
        for (let index of unassignedStandardIndices) {
            // make group from all poses with close proximity to this one
            let ids = [];
            for (let j of unassignedStandardIndices) {
                if (this.arePosesOfSamePerson(proximityMatrix[index][j], poseDataArr[index][1].timestamp, poseDataArr[j][1].timestamp)) {
                    ids.push(poseDataArr[j][0]);
                }
            }
            poseObjsSamePerson.push(ids);
        }

        // simple approach: incremental merging groups of spatially-close poses into new fused human objects (one group at a time)
        // WARNING: it can create multiple fused human objects for the same person when many cameras/apps are involved
        // also, there can be issues with assigning to the same fused object a spatially stretched-out chain of poses
        // TODO (future): proper proximity clustering with cycle consistency check
        for (let ids of poseObjsSamePerson) {

            if (ids.length < 2) {
                // single standalone pose which is not close to any other, nothing to do in terms of fusion
                continue;
            }

            // check if some objects in the group already belong to some fused human objects
            let fusedObjectId = null;
            let unassignedIds = [];
            for (let id of ids) {
                let fid = this.humanObjectsOfFusedObject.getFusedObject(id);
                if (fid) {
                    // NOTE: there could be human objects in this group which are already assigned to different fused human objects
                    if (!fusedObjectId) {
                        fusedObjectId = fid;
                    }
                } else {
                    unassignedIds.push(id);
                }
            }

            if (fusedObjectId) {
                // add unassigned human objects to a fused human object at the same location
                for (let id of unassignedIds) {
                    this.humanObjectsOfFusedObject[fusedObjectId].push(id);

                    // set parent reference pointing at a fused human object
                    this.objectsRef[id].parent = fusedObjectId;

                    if (this.batchedUpdates[id] === undefined) {
                        this.batchedUpdates[id] = {};
                    }
                    this.batchedUpdates[id]['parent'] = {
                        objectKey: id,
                        frameKey: null,
                        nodeKey: null,
                        propertyPath: 'parent',
                        newValue: fusedObjectId,
                        editorId: 0
                    };

                    // remove the previous offset if it exists (just in case)
                    delete this.offsetOfHumanObject[id];

                    if (this.verbose) {
                        console.log('assigning human obj=' + id + ' from ' + fusedObjectId);
                    }
                }
            } else {
                // whole group is unassigned, thus create new fused human object for it
                fusedObjectId = '_HUMAN_' + 'server' + this.serverUuid + '_pose1_' + utilities.uuidTime();
                this.objectsRef[fusedObjectId] = new HumanPoseObject(this.ip, this.version, this.protocol, fusedObjectId, JOINTS);
                if (this.humanObjectsOfFusedObject[fusedObjectId] === undefined) {
                    this.humanObjectsOfFusedObject[fusedObjectId] = ids;

                    // set parent reference pointing at new fused human object
                    for (let id of ids) {
                        this.objectsRef[id].parent = fusedObjectId;

                        if (this.batchedUpdates[id] === undefined) {
                            this.batchedUpdates[id] = {};
                        }
                        this.batchedUpdates[id]['parent'] = {
                            objectKey: id,
                            frameKey: null,
                            nodeKey: null,
                            propertyPath: 'parent',
                            newValue: fusedObjectId,
                            editorId: 0
                        };

                        // remove the previous offset if it exists (just in case)
                        delete this.offsetOfHumanObject[id];
                    }

                    // add property specific for fused human objects (not defined in standard human objects from apps)
                    this.objectsRef[fusedObjectId].updatedByChildren = ['none'];

                    if (this.batchedUpdates[fusedObjectId] === undefined) {
                        this.batchedUpdates[fusedObjectId] = {};
                    }
                    this.batchedUpdates[fusedObjectId]['updatedByChildren'] = {
                        objectKey: fusedObjectId,
                        frameKey: null,
                        nodeKey: null,
                        propertyPath: 'updatedByChildren',
                        newValue: ['none'],
                        editorId: 0
                    };
                }

                // setup active heartbeat for this new object
                server.objectBeatSender(this.beatPort, fusedObjectId, this.ip, false, true);

                // add new object to different global data structures
                this.sceneGraphRef.addObjectAndChildren(fusedObjectId, this.objectsRef[fusedObjectId]);
                utilities.writeObject(this.objectLookupRef, this.objectsRef[fusedObjectId].name, fusedObjectId);

                // TODO?: add to 'knownObjects' - it seems that locally created objects do not get added there in general, just to 'objects'

                console.log('creating fused human obj=' + fusedObjectId);
            }
        }

        // TODO (future): check if any fused objects are in spatial proximity and they should be merged

        // remove fused human objects if they have less than 2 associated human objects
        const idsToRemove = this.humanObjectsOfFusedObject.getFusedObjectsToRemove();
        for (let id of idsToRemove) {
            this.removeHumanObject(id);
        }
    }

    /** Fuses current poses of standard human objects to update poses of their respective fused human objects.
     *  If a standard human object is standalone (not associated to any fused one), there is change to its pose.
     * @param {Object.<string, WholePoseData>} poseData - current poses for existing human objects
     */
    fusePoseData(poseData) {

        let poseGroups = {}; // dictionary with key: fusedObjectId, value: subset of dictionary poseData
        // group poses according to the fused human objects their are associated to
        for (let [id, pose] of Object.entries(poseData)) {
            let fid = this.humanObjectsOfFusedObject.getFusedObject(id);
            if (fid) {
                // associated to some fused human object
                if (poseGroups[fid] === undefined) {
                    poseGroups[fid] = {};
                }
                poseGroups[fid][id] = pose;
            }
        }

        for (let [fid, group] of Object.entries(poseGroups)) {
            this.updateFusedObject(fid, group);
        }

    }

}

module.exports = HumanPoseFuser;
