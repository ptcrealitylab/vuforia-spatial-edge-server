import * as THREE from '../three/three.module.js';

import {JOINTS as POSE_NET_JOINTS} from './utils.js';

const POSE_JOINTS = Object.freeze({
    PELVIS: 0,
    NAVEL: 1,
    CHEST: 2,
    NECK: 3,
    LEFT_CLAVICLE: 4,
    LEFT_SHOULDER: 5,
    LEFT_ELBOW: 6,
    LEFT_WRIST: 7,
    LEFT_HAND: 8,
    LEFT_HANDTIP: 9,
    LEFT_THUMB: 10,
    RIGHT_CLAVICLE: 11,
    RIGHT_SHOULDER: 12,
    RIGHT_ELBOW: 13,
    RIGHT_WRIST: 14,
    RIGHT_HAND: 15,
    RIGHT_HANDTIP: 16,
    RIGHT_THUMB: 17,
    LEFT_HIP: 18,
    LEFT_KNEE: 19,
    LEFT_ANKLE: 20,
    LEFT_FOOT: 21,
    RIGHT_HIP: 22,
    RIGHT_KNEE: 23,
    RIGHT_ANKLE: 24,
    RIGHT_FOOT: 25,
    HEAD: 26,
    NOSE: 27,
    LEFT_EYE: 28,
    LEFT_EAR: 29,
    RIGHT_EYE: 30,
    RIGHT_EAR: 31
});

function jointToPoseNet(i) {
    let key = Object.keys(POSE_JOINTS)[i];
    if (!POSE_NET_JOINTS.hasOwnProperty(key)) {
        return -1;
    }
    return POSE_NET_JOINTS[key];
}

function calculateXAngle(skel, jointARaw, jointBRaw) {
    const jointA = jointToPoseNet(jointARaw);
    const jointB = jointToPoseNet(jointBRaw);

    if (typeof skel == 'undefined') {
        console.log('the skel is undefined');
        return 'undefined';
    }

    /* if joint is undefined skip over this iteration */
    if (typeof skel.joints[jointA] == 'undefined' || typeof skel.joints[jointB] == 'undefined')
        return 'undefined';

    /* calculate angular distance between the bone and the X axis  */
    const vectorBone = new THREE.Vector3(skel.joints[jointA].x - skel.joints[jointB].x, skel.joints[jointA].y - skel.joints[jointB].y, skel.joints[jointA].z - skel.joints[jointB].z);
    const vectorAxis = new THREE.Vector3(1, 0, 0);

    let angle = vectorBone.angleTo(vectorAxis) * 180 / Math.PI;

    return angle;
}

function  calculateYAngle(skel, jointARaw, jointBRaw) {
    const jointA = jointToPoseNet(jointARaw);
    const jointB = jointToPoseNet(jointBRaw);

    if (typeof skel == 'undefined') {
        console.log('the skel is undefined');
        return 'undefined';
    }
    /* if joint is undefined skip over this iteration */
    if (typeof skel.joints[jointA] == 'undefined' || typeof skel.joints[jointB] == 'undefined') {
        return 'undefined';
    }


    /* calculate angular distance between the bone and the Y axis  */
    const vectorBone = new THREE.Vector3(skel.joints[jointA].x - skel.joints[jointB].x, skel.joints[jointA].y - skel.joints[jointB].y, skel.joints[jointA].z - skel.joints[jointB].z);
    const vectorAxis = new THREE.Vector3(0, 1, 0);
    let angle = vectorBone.angleTo(vectorAxis) * 180 / Math.PI;

    /* check if the y angle is positive or negative */
    const distanceVector = new THREE.Vector3(0, 1, 5);
    const negativeDistanceVector = new THREE.Vector3(0, 1, -5);
    let distance = (vectorBone.distanceTo(distanceVector)) < (vectorBone.distanceTo(negativeDistanceVector));


    // let distance = (vectorBone.distanceTo(distanceVector))>Math.sqrt(26);

    if (!distance) {
        angle *= -1;
    }

    return angle;
}

function calculateZAngle(skel, jointARaw, jointBRaw) {
    const jointA = jointToPoseNet(jointARaw);
    const jointB = jointToPoseNet(jointBRaw);

    if (typeof skel == 'undefined') {
        console.log('the skel is undefined');
        return 'undefined';
    }
    /* if joint is undefined skip over this iteration */
    if (typeof skel.joints[jointA] == 'undefined' || typeof skel.joints[jointB] == 'undefined') {
        return 'undefined';
    }

    /* calculate angular distance between the bone and the Z axis  */
    const vectorBone = new THREE.Vector3(skel.joints[jointA].x - skel.joints[jointB].x, skel.joints[jointA].y - skel.joints[jointB].y, skel.joints[jointA].z - skel.joints[jointB].z);
    const vectorAxis = new THREE.Vector3(0, 0, 1);
    let angle = vectorBone.angleTo(vectorAxis) * 180 / Math.PI;

    return angle;
}

function chestNavelReba(skel) {
    let chestNavelAngles = skel.angles.chestNavel;
    var chestNavelScore = 0;

    /* get forward back score using y-coordinate */
    if ((chestNavelAngles[1] > 0 && chestNavelAngles[1] <= 20) || (chestNavelAngles[1] < 0 && chestNavelAngles[1] >= -20) ) {
        chestNavelScore = 2;
    } else if ((chestNavelAngles[1] > 20 && chestNavelAngles[1] <= 60) || chestNavelAngles[1] < -20) {
        chestNavelScore = 3;
    } else if (chestNavelAngles[1] > 60) {
        chestNavelScore = 4;
    }

    /* get side-bending score using x-coordinate */
    if (chestNavelAngles[0] <= 75 || chestNavelAngles[0] >= 105) {
        chestNavelScore++;
    }

    /* get twisting score using z-coordinate */
    if (chestNavelAngles[2] <= 75 || chestNavelAngles[2] >= 105) {
        chestNavelScore++;
    }

    /* set the skeleton's headNeck score and color */
    skel.angles.chestNavel[4] = chestNavelScore;

    if (chestNavelScore <= 2 ) {
        skel.angles.chestNavel[5] = 0;
    } else if (chestNavelScore <= 4) {
        skel.angles.chestNavel[5] = 1;
    } else if (chestNavelScore <= 6) {
        skel.angles.chestNavel[5] = 2;
    }

    return chestNavelScore;
}

function navelPelvisReba(skel) {
    let navelPelvisAngles = skel.angles.navelPelvis;
    var navelPelvisScore = 0;

    /* get forward back score using y-coordinate */
    if ((navelPelvisAngles[1] > 0 && navelPelvisAngles[1] <= 20) || (navelPelvisAngles[1] < 0 && navelPelvisAngles[1] >= -20) ) {
        navelPelvisScore = 2;
    } else if ((navelPelvisAngles[1] > 20 && navelPelvisAngles[1] <= 60) || navelPelvisAngles[1] < -20) {
        navelPelvisScore = 3;
    } else if (navelPelvisAngles[1] > 60) {
        navelPelvisScore = 4;
    }

    /* get side-bending score using x-coordinate */
    if (navelPelvisAngles[0] <= 75 || navelPelvisAngles[0] >= 105) {
        navelPelvisScore++;
    }

    /* get twisting score using z-coordinate */
    if (navelPelvisAngles[2] <= 75 || navelPelvisAngles[2] >= 105) {
        navelPelvisScore++;
    }

    /* set the skeleton's headNeck score and color */
    skel.angles.navelPelvis[4] = navelPelvisScore;

    if (navelPelvisScore <= 2 ) {
        skel.angles.navelPelvis[5] = 0;
    } else if (navelPelvisScore <= 4) {
        skel.angles.navelPelvis[5] = 1;
    } else if (navelPelvisScore <= 6) {
        skel.angles.navelPelvis[5] = 2;
    }

    return navelPelvisScore;
}

/* calculate the headNeckReba score, set the score for the skel and return score */
function headNeckReba(skel) {
    let headNeckAngles = skel.angles.headNeck;
    var headNeckScore = 0;

    /* get forward back score using y-coordinate */
    if (headNeckAngles[1] >= 0 && headNeckAngles[1] <= 20) {
        headNeckScore++;
    } else if (headNeckAngles[1] > 20 || headNeckAngles[1] < 0) {
        headNeckScore = 2;
    }

    /* get side-bending score using x-coordinate */
    if (headNeckAngles[0] <= 75 || headNeckAngles[0] >= 105) {
        headNeckScore++;
    }

    /* get twisting score using z-coordinate */
    if (headNeckAngles[2] <= 75 || headNeckAngles[2] >= 105) {
        headNeckScore++;
    }

    /* set smallRebaScore */
    skel.angles.headNeck[4] = headNeckScore;

    /* set color of bone */
    if (headNeckScore <= 2 ) {
        skel.angles.headNeck[5] = 0;
    } else if (headNeckScore == 3) {
        skel.angles.headNeck[5] = 1;
    } else if (headNeckScore == 4) {
        skel.angles.headNeck[5] = 2;
    }

    return headNeckScore;
}

/* calculate neckChestReba and annotate the skel's angles */
function neckChestReba(skel) {
    let neckChestAngles = skel.angles.neckChest;
    var neckChestScore = 0;

    /* get forward back score using y-coordinate */
    if ((neckChestAngles[1] > 0 && neckChestAngles[1] <= 20) || (neckChestAngles[1] < 0 && neckChestAngles[1] >= -20) ) {
        neckChestScore = 2;
    } else if ((neckChestAngles[1] > 20 && neckChestAngles[1] <= 60) || neckChestAngles[1] < -20) {
        neckChestScore = 3;
    } else if (neckChestAngles[1] > 60) {
        neckChestScore = 4;
    }

    /* get side-bending score using x-coordinate */
    if (neckChestAngles[0] <= 75 || neckChestAngles[0] >= 105) {
        neckChestScore++;
    }

    /* get twisting score using z-coordinate */
    if (neckChestAngles[2] <= 75 || neckChestAngles[2] >= 105) {
        neckChestScore++;
    }

    /* set the skeleton's headNeck score and color */
    skel.angles.neckChest[4] = neckChestScore;

    if (neckChestScore <= 2 ) {
        skel.angles.neckChest[5] = 0;
    } else if (neckChestScore <= 4) {
        skel.angles.neckChest[5] = 1;
    } else if (neckChestScore <= 6) {
        skel.angles.neckChest[5] = 2;
    }

    return neckChestScore;
}

function elbowWristLeftReba(skel) {
    let elbowWristAnglesLeft = skel.angles.elbowWristLeft;
    var elbowWristLeftScore = 0;

    /* get forward bending using y-coordinate */
    if (Math.abs(elbowWristAnglesLeft[1]) >= 80 && Math.abs(elbowWristAnglesLeft[1]) <= 120) {
        elbowWristLeftScore++;
    } else if ((Math.abs(elbowWristAnglesLeft[1]) > 120 && Math.abs(elbowWristAnglesLeft[1]) <= 180) || Math.abs(elbowWristAnglesLeft[1]) < 80) {
        elbowWristLeftScore = 2;
    }

    /* set smallReba and color */
    skel.angles.elbowWristLeft[4] = elbowWristLeftScore;
    if (elbowWristLeftScore < 2 ) {
        skel.angles.elbowWristLeft[5] = 0;
    } else if (elbowWristLeftScore == 2) {
        skel.angles.elbowWristLeft[5] = 1;
    }


    return elbowWristLeftScore;
}

function elbowWristRightReba(skel) {
    let elbowWristAnglesRight = skel.angles.elbowWristRight;
    var elbowWristRightScore = 0;

    /* get forward bending using y-coordinate */
    if (Math.abs(elbowWristAnglesRight[1]) >= 80 && Math.abs(elbowWristAnglesRight[1]) <= 120) {
        elbowWristRightScore++;
    } else if ((Math.abs(elbowWristAnglesRight[1]) > 120 && Math.abs(elbowWristAnglesRight[1]) <= 180) || Math.abs(elbowWristAnglesRight[1]) < 80) {
        elbowWristRightScore = 2;
    }

    /* set smallReba score and color */
    skel.angles.elbowWristRight[4] = elbowWristRightScore;
    if (elbowWristRightScore < 2 ) {
        skel.angles.elbowWristRight[5] = 0;
    } else if (elbowWristRightScore == 2) {
        skel.angles.elbowWristRight[5] = 1;
    }

    return elbowWristRightScore;
}

function wristHandLeftReba(skel) {
    let wristHandAnglesLeft = skel.angles.wristHandLeft;
    var wristHandLeftScore = 0;

    /* get forward and backward bending using y-coordinates */
    if (Math.abs(wristHandAnglesLeft[1]) >= 165) {
        wristHandLeftScore++;
    } else if (Math.abs(wristHandAnglesLeft[1]) < 165) {
        wristHandLeftScore = 2;
    }

    /* bending and twisting */
    // if (wristHandAnglesLeft[0] <= 75 || wristHandAnglesLeft[0] >= 105 || wristHandAnglesLeft[2] <= 75 || wristHandAnglesLeft[2] >= 105 ) {
    //   wristHandLeftScore++;
    // }



    /* set smallReba and color */
    skel.angles.wristHandLeft[4] = wristHandLeftScore;
    // skel.angles.wristHandLeft[5] = 1;

    if (wristHandLeftScore == 1) {
        skel.angles.wristHandLeft[5] = 0;
    } else if (wristHandLeftScore == 2) {
        skel.angles.wristHandLeft[5] = 1;
    } else if (wristHandLeftScore == 3) {
        skel.angles.wristHandLeft[5] = 2;
    }

    return wristHandLeftScore;

}

function wristHandRightReba(skel) {
    let wristHandAnglesRight = skel.angles.wristHandRight;
    var wristHandRightScore = 0;


    /* get forward and backward bending using y-coordinates */
    if (Math.abs(wristHandAnglesRight[1]) >= 165) {
        wristHandRightScore++;
    } else if (Math.abs(wristHandAnglesRight[1]) < 165) {
        wristHandRightScore = 2;
    }

    /* bending and twisting */
    //  /* bending and twisting */
    //  if (wristHandAnglesRight[0] <= 75 || wristHandAnglesRight[0] >= 105 || wristHandAnglesRight[2] <= 75 || wristHandAnglesRight[2] >= 105 ) {
    //   wristHandRightScore++;
    // }

    skel.angles.wristHandRight[4] = wristHandRightScore;


    /* annotate the color of the bone */
    if (wristHandRightScore == 1) {
        skel.angles.wristHandRight[5] = 0;
    } else if (wristHandRightScore == 2) {
        skel.angles.wristHandRight[5] = 1;
    } else if (wristHandRightScore == 3) {
        skel.angles.wristHandRight[5] = 2;
    }

    return wristHandRightScore;
}

function hipKneeLeftReba(skel) {
    let hipKneeLeftAngles = skel.angles.hipKneeLeft;
    var hipKneeLeftScore = 0;

    /* get forward bending using y-coordinate */
    if (Math.abs(hipKneeLeftAngles[1]) >= 120 && Math.abs(hipKneeLeftAngles[1]) <= 150 ) {
        hipKneeLeftScore = 1;
    } else if (Math.abs(hipKneeLeftAngles[1]) < 120) {
        hipKneeLeftScore = 2;
    }

    /* set smallReba and color */
    skel.angles.hipKneeLeft[4] = hipKneeLeftScore;

    if (hipKneeLeftScore < 1 ) {
        skel.angles.hipKneeLeft[5] = 0;
    } else if (hipKneeLeftScore < 2) {
        skel.angles.hipKneeLeft[5] = 1;
    } else {
        skel.angles.hipKneeLeft[5] = 2;
    }
    return hipKneeLeftScore;
}

function hipKneeRightReba(skel) {
    let hipKneeRightAngles = skel.angles.hipKneeRight;
    var hipKneeRightScore = 0;

    /* get forward bending using y-coordinate */
    if (Math.abs(hipKneeRightAngles[1]) >= 120 && Math.abs(hipKneeRightAngles[1]) <= 150 ) {
        hipKneeRightScore = 1;
    } else if (Math.abs(hipKneeRightAngles[1]) < 120) {
        hipKneeRightScore = 2;
    }

    /* set smallReba and color */
    skel.angles.hipKneeRight[4] = hipKneeRightScore;
    if (hipKneeRightScore < 1 ) {
        skel.angles.hipKneeRight[5] = 0;
    } else if (hipKneeRightScore < 2) {
        skel.angles.hipKneeRight[5] = 1;
    } else {
        skel.angles.hipKneeRight[5] = 2;
    }
    return hipKneeRightScore;
}

function shoulderElbowLeftReba(skel) {
    let shoulderElbowLeftAngles = skel.angles.shoulderElbowLeft;
    var shoulderElbowLeftScore = 0;


    /* get forward bending using y-coordinate */
    if (shoulderElbowLeftAngles[1] >= 160 || shoulderElbowLeftAngles[1] <= -160) {
        shoulderElbowLeftScore++;
    } else if (shoulderElbowLeftAngles[1] < 0 && shoulderElbowLeftAngles[1] > -160) {
        shoulderElbowLeftScore = 2;
    } else if (shoulderElbowLeftAngles[1] < 160 && shoulderElbowLeftAngles[1] >= 135) {
        shoulderElbowLeftScore = 2;
    } else if (shoulderElbowLeftAngles[1] < 135 && shoulderElbowLeftAngles[1] >= 90) {
        shoulderElbowLeftScore = 3;
    } else if (shoulderElbowLeftAngles[1] < 90 && shoulderElbowLeftAngles[1] >= 0) {
        shoulderElbowLeftScore = 4;
    }

    /* set smallReba and color */
    skel.angles.shoulderElbowLeft[4] = shoulderElbowLeftScore;
    if (shoulderElbowLeftScore < 2 ) {
        skel.angles.shoulderElbowLeft[5] = 0;
    } else if (shoulderElbowLeftScore < 3 ) {
        skel.angles.shoulderElbowLeft[5] = 1;
    } else if (shoulderElbowLeftScore <= 4) {
        skel.angles.shoulderElbowLeft[5] = 2;
    }
    return shoulderElbowLeftScore;
}

function shoulderElbowRightReba(skel) {
    let shoulderElbowRightAngles = skel.angles.shoulderElbowRight;
    var shoulderElbowRightScore = 0;

    /* get forward bending using y-coordinate */
    if (shoulderElbowRightAngles[1] >= 160 || shoulderElbowRightAngles[1] <= -160) {
        shoulderElbowRightScore++;
    } else if (shoulderElbowRightAngles[1] < 0 && shoulderElbowRightAngles[1] > -160) {
        shoulderElbowRightScore = 2;
    } else if (shoulderElbowRightAngles[1] < 160 && shoulderElbowRightAngles[1] >= 135) {
        shoulderElbowRightScore = 2;
    } else if (shoulderElbowRightAngles[1] < 135 && shoulderElbowRightAngles[1] >= 90) {
        shoulderElbowRightScore = 3;
    } else if (shoulderElbowRightAngles[1] < 90 && shoulderElbowRightAngles[1] >= 0) {
        shoulderElbowRightScore = 4;
    }

    /* set smallReba and color */
    skel.angles.shoulderElbowRight[4] = shoulderElbowRightScore;

    if (shoulderElbowRightScore < 2 ) {
        skel.angles.shoulderElbowRight[5] = 0;
    } else if (shoulderElbowRightScore < 3 ) {
        skel.angles.shoulderElbowRight[5] = 1;
    } else if (shoulderElbowRightScore <= 4) {
        skel.angles.shoulderElbowRight[5] = 2;
    }
    return shoulderElbowRightScore;
}

function calculateReba(skel) {
    /* call all helper functions to annotate the individual scores of each bone */

    headNeckReba(skel);
    neckChestReba(skel);

    chestNavelReba(skel);
    navelPelvisReba(skel);
    elbowWristLeftReba(skel);
    elbowWristRightReba(skel);
    wristHandLeftReba(skel);
    wristHandRightReba(skel);
    shoulderElbowLeftReba(skel);
    shoulderElbowRightReba(skel);
    hipKneeLeftReba(skel);
    hipKneeRightReba(skel);

    /* NOTE: pose tracking for the hands is pretty inaccurate so we just completely omitted it from the calculations
         there is a helper function for it but it is never called */
    // console.log("elbowWristLeftReba is ", elbowWristLeftReba);
    // console.log("elbowWristRightReba is ", elbowWristRightReba);

    /* could calculate the overall reba score here or later for better optimization */
    // let overallScore = overallReba(skel);
}

function calculateTableA(skel) {
    let neck = skel.angles.headNeck[4];

    // let legs = Math.ceil((skel.angles.hipKneeLeft[5] + skel.angles.hipKneeRight[5])/2);
    let legs = skel.angles.hipKneeLeft[4];
    let trunk = skel.angles.chestNavel[4];

    /* apparently the REBA assessment is stupid and doesn't have an entry in the table for the max score for some of the bones :/ */
    if (legs == 0)
        legs = 1;
    if (neck == 4)
        neck = 3;
    if (trunk == 6)
        trunk = 5;

    let nltKey = String(neck + ',' + legs + ',' + trunk);

    const NLTReba = new Map(); //set up table for intermediate score from neck, then legs, then trunk
    NLTReba.set('1,1,1', '1');
    NLTReba.set('1,1,2', '2');
    NLTReba.set('1,1,3', '2');
    NLTReba.set('1,1,4', '3');
    NLTReba.set('1,1,5', '4');
    NLTReba.set('1,2,1', '2');
    NLTReba.set('1,2,2', '3');
    NLTReba.set('1,2,3', '4');
    NLTReba.set('1,2,4', '5');
    NLTReba.set('1,2,5', '6');
    NLTReba.set('1,3,1', '3');
    NLTReba.set('1,3,2', '4');
    NLTReba.set('1,3,3', '5');
    NLTReba.set('1,3,4', '6');
    NLTReba.set('1,3,5', '7');
    NLTReba.set('1,4,1', '4');
    NLTReba.set('1,4,2', '5');
    NLTReba.set('1,4,3', '6');
    NLTReba.set('1,4,4', '7');
    NLTReba.set('1,4,5', '8');
    NLTReba.set('2,1,1', '1');
    NLTReba.set('2,1,2', '3');
    NLTReba.set('2,1,3', '4');
    NLTReba.set('2,1,4', '5');
    NLTReba.set('2,1,5', '6');
    NLTReba.set('2,2,1', '2');
    NLTReba.set('2,2,2', '4');
    NLTReba.set('2,2,3', '5');
    NLTReba.set('2,2,4', '6');
    NLTReba.set('2,2,5', '7');
    NLTReba.set('2,3,1', '3');
    NLTReba.set('2,3,2', '5');
    NLTReba.set('2,3,3', '6');
    NLTReba.set('2,3,4', '7');
    NLTReba.set('2,3,5', '8');
    NLTReba.set('2,3,1', '4');
    NLTReba.set('2,3,2', '6');
    NLTReba.set('2,3,3', '7');
    NLTReba.set('2,3,4', '8');
    NLTReba.set('2,3,5', '9');
    NLTReba.set('3,1,1', '3');
    NLTReba.set('3,1,2', '4');
    NLTReba.set('3,1,3', '5');
    NLTReba.set('3,1,4', '6');
    NLTReba.set('3,1,5', '7');
    NLTReba.set('3,2,1', '3');
    NLTReba.set('3,2,2', '5');
    NLTReba.set('3,2,3', '6');
    NLTReba.set('3,2,4', '7');
    NLTReba.set('3,2,5', '8');
    NLTReba.set('3,3,1', '5');
    NLTReba.set('3,3,2', '6');
    NLTReba.set('3,3,3', '7');
    NLTReba.set('3,3,4', '8');
    NLTReba.set('3,3,5', '9');
    NLTReba.set('3,4,1', '6');
    NLTReba.set('3,4,2', '7');
    NLTReba.set('3,4,3', '8');
    NLTReba.set('3,4,4', '9');
    NLTReba.set('3,4,5', '9');

    let numberA = parseInt(NLTReba.get(nltKey), 10);
    return numberA;
}

function calculateTableB(skel) {
    /* let the score be the average between both limbs */
    let lowerArm = Math.round((skel.angles.elbowWristLeft[4] + skel.angles.elbowWristRight[4]) / 2);
    let wrist = Math.round((skel.angles.wristHandLeft[4] + skel.angles.wristHandRight[4]) / 2);
    let upperArm = Math.round((skel.angles.shoulderElbowLeft[4] + skel.angles.shoulderElbowRight[4]) / 2);
    // let lowerArm = Math.ceil((skel.angles.elbowWristLeft[4] + skel.angles.elbowWristRight[4])/2);
    // let wrist = Math.ceil((skel.angles.wristHandLeft[4] + skel.angles.wristHandRight[4])/2);
    // let upperArm = Math.ceil((skel.angles.shoulderElbowLeft[4] + skel.angles.shoulderElbowRight[4])/2);

    wrist = Math.min(Math.max(wrist, 1), 3);
    lowerArm = Math.min(Math.max(lowerArm, 1), 2);
    upperArm = Math.min(Math.max(lowerArm, 1), 6);

    let lwaKey = lowerArm + ',' + wrist + ',' + upperArm;

    const LWAReba = new Map(); //set up table for intermediate score from lower, then wrist, then upper
    LWAReba.set('1,1,1', '1');
    LWAReba.set('1,1,2', '1');
    LWAReba.set('1,1,3', '3');
    LWAReba.set('1,1,4', '4');
    LWAReba.set('1,1,5', '6');
    LWAReba.set('1,1,6', '7');
    LWAReba.set('1,2,1', '2');
    LWAReba.set('1,2,2', '2');
    LWAReba.set('1,2,3', '4');
    LWAReba.set('1,2,4', '5');
    LWAReba.set('1,2,5', '7');
    LWAReba.set('1,2,6', '8');
    LWAReba.set('1,3,1', '2');
    LWAReba.set('1,3,2', '3');
    LWAReba.set('1,3,3', '5');
    LWAReba.set('1,3,4', '5');
    LWAReba.set('1,3,5', '8');
    LWAReba.set('1,3,6', '8');
    LWAReba.set('2,1,1', '1');
    LWAReba.set('2,1,2', '2');
    LWAReba.set('2,1,3', '4');
    LWAReba.set('2,1,4', '5');
    LWAReba.set('2,1,5', '7');
    LWAReba.set('2,1,6', '8');
    LWAReba.set('2,2,1', '2');
    LWAReba.set('2,2,2', '3');
    LWAReba.set('2,2,3', '5');
    LWAReba.set('2,2,4', '6');
    LWAReba.set('2,2,5', '8');
    LWAReba.set('2,2,6', '9');
    LWAReba.set('2,3,1', '3');
    LWAReba.set('2,3,2', '4');
    LWAReba.set('2,3,3', '5');
    LWAReba.set('2,3,4', '7');
    LWAReba.set('2,3,5', '8');
    LWAReba.set('2,3,6', '9');


    let numberB = parseInt(LWAReba.get(lwaKey), 10);
    return numberB;
}

function overallRebaCalculation(skel) {
    var tableA = calculateTableA(skel);
    var tableB = calculateTableB(skel);

    var tableC = [
        [1, 1, 1, 2, 3, 3, 4, 5, 6, 7, 7, 7],
        [1, 2, 2, 3, 4, 4, 5, 6, 6, 7, 7, 8],
        [2, 3, 3, 3, 4, 5, 6, 7, 7, 8, 8, 8],
        [3, 4, 4, 4, 5, 6, 7, 8, 8, 9, 9, 9],
        [4, 4, 4, 5, 6, 7, 8, 8, 9, 9, 9, 9],
        [6, 6, 6, 7, 8, 8, 9, 9, 10, 10, 10, 10],
        [7, 7, 7, 8, 9, 9, 9, 10, 10, 11, 11, 11],
        [8, 8, 8, 9, 10, 10, 10, 10, 10, 11, 11, 11],
        [9, 9, 9, 10, 10, 10, 11, 11, 11, 12, 12, 12],
        [10, 10, 10, 11, 11, 11, 11, 12, 12, 12, 12, 12],
        [11, 11, 11, 11, 12, 12, 12, 12, 12, 12, 12, 12],
        [12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12]
    ];

    var finalREBA = tableC[tableA - 1][tableB - 1];
    return finalREBA;
}

/* create the object that contains all the angles for a skeleton and return that object */
function getAngles(skel) {
/* NOTE: I made it so that the first joint listed is always moving farthest away from body */
    let angles = {
        headNeck: [
            // XYZ euler angles in degrees
            calculateXAngle(skel, POSE_JOINTS.HEAD, POSE_JOINTS.NECK),
            calculateYAngle(skel, POSE_JOINTS.HEAD, POSE_JOINTS.NECK),
            calculateZAngle(skel, POSE_JOINTS.HEAD, POSE_JOINTS.NECK),
            // index of bone relative to k4abt humanposerenderer's initialization order
            15,
            smallRebaScore(),
            smallRebaColor()
        ],
        neckChest: [
            calculateXAngle(skel, 3, 2),
            calculateYAngle(skel, 3, 2),
            calculateZAngle(skel, 3, 2),
            16,
            smallRebaScore(),
            smallRebaColor()
        ],
        chestNavel: [
            calculateXAngle(skel, 2, 1),
            calculateYAngle(skel, 2, 1),
            calculateZAngle(skel, 2, 1),
            17,
            smallRebaScore(),
            smallRebaColor()
        ],
        navelPelvis: [
            calculateXAngle(skel, 1, 0),
            calculateYAngle(skel, 1, 0),
            calculateZAngle(skel, 1, 0),
            18,
            smallRebaScore(),
            smallRebaColor()
        ],
        hipKneeLeft: [
            calculateXAngle(skel, 19, 18),
            calculateYAngle(skel, 19, 18),
            calculateZAngle(skel, 19, 18),
            21,
            smallRebaScore(),
            smallRebaColor()
        ],
        hipKneeRight: [
            calculateXAngle(skel, 23, 22),
            calculateYAngle(skel, 23, 22),
            calculateZAngle(skel, 23, 22),
            25,
            smallRebaScore(),
            smallRebaColor()
        ],
        shoulderElbowLeft: [
            calculateXAngle(skel, 6, 5),
            calculateYAngle(skel, 6, 5),
            calculateZAngle(skel, 6, 5),
            3,
            smallRebaScore(),
            smallRebaColor()
        ],
        shoulderElbowRight: [
            calculateXAngle(skel, 13, 12),
            calculateYAngle(skel, 13, 12),
            calculateZAngle(skel, 13, 12),
            8,
            smallRebaScore(),
            smallRebaColor()
        ],
        elbowWristLeft: [
            calculateXAngle(skel, 7, 6),
            calculateYAngle(skel, 7, 6),
            calculateZAngle(skel, 7, 6),
            2,
            smallRebaScore(),
            smallRebaColor()
        ],
        elbowWristRight: [
            calculateXAngle(skel, 14, 13),
            calculateYAngle(skel, 14, 13),
            calculateZAngle(skel, 14, 13),
            7,
            smallRebaScore(),
            smallRebaColor()
        ],
        wristHandLeft: [
            calculateXAngle(skel, 8, 7),
            calculateYAngle(skel, 8, 7),
            calculateZAngle(skel, 8, 7),
            1,
            smallRebaScore(),
            smallRebaColor()
        ],
        wristHandRight: [
            calculateXAngle(skel, 15, 14),
            calculateYAngle(skel, 15, 14),
            calculateZAngle(skel, 15, 14),
            6,
            smallRebaScore(),
            smallRebaColor()
        ],
    };

    return angles;
}

function smallRebaScore() {
    return 0;
}

function smallRebaColor() {
    return 0;
}

function extractSkel(humanPoseRenderer) {
    let skel = {
        joints: {},
        angles: {},
    };
    for (let jointId of Object.values(POSE_NET_JOINTS)) {
        skel.joints[jointId] = humanPoseRenderer.getJointPosition(jointId);
    }

    skel.angles = getAngles(skel);
    return skel;
}

function annotateHumanPoseRenderer(humanPoseRenderer) {
    let skel = extractSkel(humanPoseRenderer);
    calculateReba(skel);
    humanPoseRenderer.setOverallRebaScore(overallRebaCalculation(skel));
    for (let boneName in skel.angles) {
        let rebaColor = skel.angles[boneName][5];
        humanPoseRenderer.setBoneRebaColor(boneName, rebaColor);
    }
}

export {
    annotateHumanPoseRenderer,
};
