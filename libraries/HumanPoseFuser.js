
const HumanPoseObject = require('./HumanPoseObject');
const sgUtils = require('./sceneGraph/utils.js');
const utilities = require('./utilities.js');
const server = require('../server');

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

/**
 * The object with pose data incoming from Toolboxapps
 * @typedef {Object} WholePoseData
 * @property {string} name
 * @property {number} timestamp
 * @property {Array.<{x: number, y: number, z: number, confidence: number}> } joints
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

        /** Timer to trigger main fuse() method. */
        this.intervalTimer = null;

        /** Dictionary which collects all updates to 'parent' property of human objects in current run of fusion. It is a dictionary so we keep just one change per human object */
        this.batchedUpdates = {};

        /* Configuration parameters */
        /** Verbose logging */
        this.verbose = false;
        /** same frequency as body tracking in Toolbox app */
        this.fuseIntervalMs = 100;
        /** time interval into past to keep in data in pastPoses (on timeline of data ts) */
        this.pastIntervalMs = 10000;
        /** time interval into past to find corresponding poses across human objects (on timeline of data ts) */
        this.recentIntervalMs = 500;
        /** time interval into past to aggregate pose confidence for a human object (on timeline of data ts) */
        this.confidenceIntervalMs = 500;
        /** difference in pose confidence to switch over to a different child human object */
        this.minConfidenceDifference = 0.2;
        /** distance threshold between selected joints (neck, pelvis) to consider two 3d poses beloging to the same person (at the same timestamp) */
        this.maxDistanceForSamePerson = 300; // mm
        /** max velocity of whole body - picked 2 m/s (average walking speed is 1.4 m/s) */
        this.maxHumanVelocity = 2.0;  // unit: mm/ms
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

        // send out 'parent' property updates to all human objects from this frame to all subscribers
        server.socketHandler.sendUpdateToAllSubscribers(Object.values(this.batchedUpdates));

        this.cleanPastPoses();

        if (this.verbose) {
            const elapsedTimeMs = Date.now() - start;
            console.log(`Fusion time: ${elapsedTimeMs}ms`);
        }
    }

    addPoseData(objectId, wholePose) {
        if (this.pastPoses[objectId] === undefined) {
            this.pastPoses[objectId] = {
                latestFusedDataTS: 0,
                poses: []
            };
        }

        // extend pose object with overall confidence but prevent it to be copyable
        let poseConfidence = this.computeOverallConfidence(wholePose.joints);
        wholePose.poseConfidence = poseConfidence;
        Object.defineProperty(wholePose, 'poseConfidence', { enumerable: false });

        this.pastPoses[objectId].poses.push(wholePose);
    }

    /** Computes overall confidence of whole pose from joint confidences.
     * @param {Array.< {x: number, y: number, z: number, confidence: number} >} poseJoints
     * @returns {number} overall pose confidence
     */
    computeOverallConfidence(poseJoints) {

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

        } else {  // a fused human object
            // remove parent reference from its remaining associated human objects
            for (let id of this.humanObjectsOfFusedObject[objectId]) {
                if (this.objectsRef[id] !== undefined) {
                    this.objectsRef[id].parent = 'none';

                    this.batchedUpdates[id] = {
                        objectKey: id,
                        frameKey: null,
                        nodeKey: null,
                        propertyPath: 'parent',
                        newValue: 'none',
                        editorId: 0
                    };
                }
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
            if (objPoses.poses.length > 0 && objPoses.poses.at(-1).timestamp > latestTS) {
                latestTS = objPoses.poses.at(-1).timestamp;
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
                let ts = objPoses.poses.at(-1).timestamp;

                if (this.humanObjectsOfFusedObject[objectId] !== undefined) {
                    // a fused human object
                    matchingPoses[objectId] = objPoses.poses.at(-1);
                    if (ts > latestTS) {
                        latestTS = ts;
                    }
                } else {
                    // a standard human object from the app
                    if (ts > objPoses.latestFusedDataTS) {
                        matchingPoses[objectId] = objPoses.poses.at(-1);
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
     * Checks if two human poses can be considered from the same person
     * @param {Array.< {x: number, y: number, z: number, confidence: number} >} joints1 - joints of first pose
     * @param {Array.< {x: number, y: number, z: number, confidence: number} >} joints2 - joints of second pose
     * @param {number} maxDistance - distance threshold between two poses
     * @return {boolean}
     */
    arePosesOfSamePerson(joints1, joints2, maxDistance) {

        // check distances between pelvis and neck
        let pelvisIndex = Object.values(JOINTS).indexOf('pelvis');
        let neckIndex = Object.values(JOINTS).indexOf('neck');

        if (pelvisIndex < 0 || neckIndex < 0) {
            // this should not really happen in correct joint schema
            return false;
        }

        let pelvisDist = sgUtils.positionDistance(joints1[pelvisIndex], joints2[pelvisIndex]);
        let neckDist = sgUtils.positionDistance(joints1[neckIndex], joints2[neckIndex]);

        if (pelvisDist > maxDistance || neckDist > maxDistance) {
            return false;
        }

        return true;
    }

    /**
     * Selects the best human object to update its parent fused human object based on presence and confidence of poses received in recent past.
     * Note that it can select an object (from app/view) which received empty pose since the last fusion run.
     * @param {string} fusedObjectId - id of parent fused object
     * @param {Object.<string, WholePoseData>} poseData - current poses for existing human objects
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

        const previousSelectedObject = this.bestHumanObjectForFusedObject[fusedObjectId]; // can be also be undefined
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
        } else {
            console.warn('Cannot select the best object for a fused human object.');
        }

        return bestObjectId;
    }

    /** Updates a specified fused human object.
     * @param {string} fusedObjectId - id of fused human object
     * @param {Object.<string, WholePoseData>} poseData - current poses for existing human objects
     */
    updateFusedObject(fusedObjectId, poseData) {

        if (this.objectsRef[fusedObjectId] === undefined) {
            console.warn('Updating non-existent fused human pose object.');
            return;
        }

        let selectedObjectId = this.selectHumanObject(fusedObjectId, poseData);
        if (!selectedObjectId) {
            return;
        }

        if (poseData[selectedObjectId] == undefined || poseData[selectedObjectId].joints.length == 0) {
            if (this.verbose) {
                console.log('not updating joints: obj=' + fusedObjectId);
            }
            return;
        }

        this.objectsRef[fusedObjectId].updateJoints(poseData[selectedObjectId].joints);
        this.objectsRef[fusedObjectId].lastUpdateDataTS = poseData[selectedObjectId].timestamp;
        server.resetObjectTimeout(fusedObjectId); // keep the object alive

        // create copy and update name (confidence attribute not copied)
        let wholePose = Object.assign({}, poseData[selectedObjectId]);
        let end = fusedObjectId.indexOf('pose1');
        let name = fusedObjectId.substring('_HUMAN_'.length, end + 'pose1'.length);
        wholePose.name = name; // 'server_pose1' in practise for now

        // add also to pastPoses
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
            console.log('updating joints: obj=' + fusedObjectId + ' with ' + selectedObjectId + ', data_ts=' + poseData[selectedObjectId].timestamp.toFixed(0) + ', update_ts=' + Date.now());
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

        // compare all pairs of poses and make binary matrix of spatial proximity
        let proximityMatrix = Array.from(new Array(poseDataArr.length), () => new Array(poseDataArr.length).fill(false));
        let standardIndices = [];
        let fusedIndices = [];
        for (let i = 0; i < poseDataArr.length; i++) {
            proximityMatrix[i][i] = true;
            // poseDataArr contains poses of standard and fused human objects, store indices for each group
            if (this.humanObjectsOfFusedObject[poseDataArr[i][0]] !== undefined) {
                fusedIndices.push(i);
            } else {
                standardIndices.push(i);
            }
            for (let j = i + 1; j < poseDataArr.length; j++) {
                // distance threshold is calculated from two components:
                // - base deviation between poses at the same timestamp
                // - max possible shift between poses from different timestamp due to person's movement (this is to accomodate in particular comparisons between fused pose from previous frame and current pose from standard human object)
                const distanceThreshold = this.maxDistanceForSamePerson + this.maxHumanVelocity * Math.abs(poseDataArr[i][1].timestamp - poseDataArr[j][1].timestamp);

                if (this.arePosesOfSamePerson(poseDataArr[i][1].joints, poseDataArr[j][1].joints, distanceThreshold)) {
                    proximityMatrix[i][j] = true;
                    proximityMatrix[j][i] = true;
                }
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
                    // check if the poses are still at the same location
                    if (!proximityMatrix[fi][index]) {
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
                    if (proximityMatrix[findex][index]) {
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
                this.batchedUpdates[id] = {
                    objectKey: id,
                    frameKey: null,
                    nodeKey: null,
                    propertyPath: 'parent',
                    newValue: parentValue,
                    editorId: 0
                };
            }
        }

        // process poses of standard objects not associated with any existing fused objects
        // create overlapping groups of spatially close poses
        let poseObjsSamePerson = [];
        for (let index of unassignedStandardIndices) {
            // make group from all poses with close proximity to this one
            let ids = [];
            for (let j of unassignedStandardIndices) {
                if (proximityMatrix[index][j]) {
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

                    this.batchedUpdates[id] = {
                        objectKey: id,
                        frameKey: null,
                        nodeKey: null,
                        propertyPath: 'parent',
                        newValue: fusedObjectId,
                        editorId: 0
                    };
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

                        this.batchedUpdates[id] = {
                            objectKey: id,
                            frameKey: null,
                            nodeKey: null,
                            propertyPath: 'parent',
                            newValue: fusedObjectId,
                            editorId: 0
                        };
                    }
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