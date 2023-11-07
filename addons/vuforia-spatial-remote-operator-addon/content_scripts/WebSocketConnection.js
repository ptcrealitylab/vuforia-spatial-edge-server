
createNameSpace('realityEditor.websocket');
import { pack, unpack } from "https://deno.land/x/msgpackr@v1.9.3/index.js";
import * as THREE from '../../thirdPartyCode/three/three.module.js';

(function (exports) {


// this port number and local IP MUST match the nerfStudio port
// remember to change this hard-coded URL anytime you change wifi networks / your IP changes
// we can use localhost if you are only going to run the demo on this PC, but needs to
// be the public IP address if you want to load the demo on another laptop
const PYTHON_WEBSOCKET_URL = 'ws://10.88.121.157:7007';
let oldCamMatrix = [0,0,0,0,
                    0,0,0,0,
                    0,0,0,0,
                    0,0,0,0];
let counter = 0;
let newCamPosNeeded = true;
let isMovingCam = false;

//NOTE: you get this matrix from the console AFTER you manually aligned them together
//Matrix Convention: Row (second element is Row0_second)
//this is the Lab scene, with auto-reorient = True
// const sourceMatrix =   [-1.5793222597155756,  -1.322747003145263,    0.2478585171016987,   0,
//                         -0.23813557010772735,  0.6508053668564121,    1.9557852907676458,    0,
//                         -1.3245319660465362,   1.4601866384143747,   -0.6471648405003105,    0,
//                         -0.1828593604917078,  -0.315497808242407,    0.289963505455744,     1];

// steelCase demo : scene 1
// const sourceMatrix =   [-0.6928394061581158,  0.767695522371194,    1.2765876182593237,   0,
//                         -1.4481557533619698,  -0.01716001196630915,  -0.7756347419251368,    0,
//                         -0.34910926107226636, -1.4523800893043997,   0.6839397670212204,    0,
//                         0.13324225566158834,  0.808330474862311,    0.7987041714836312,     1];

// steelCase demo : scene 2
const sourceMatrix =   [
    -0.061740851923088896,  -1.605035129459561,    0.11744258386357077,   0,
    -1.3163664239481947,  -0.01724431166120183,  -0.9276985133744583,    0,
    0.9258023359257972, -0.13155731456696773,   -1.3112304022856882,    0,
    0.7588661310195932,  -0.3383481348010016,    0.697548483268128,     1];

// steelCase demo : scene 3
// const sourceMatrix =   [
//     0.6579978172154518,  -1.3554265944847077,    -0.3537446322499565,   0,
//     -1.264737299806347,  -0.4067823558574379,  -0.793879917105837,    0,
//     0.6022923545593152, 0.6265975640465159,   -1.2805846546451876,    0,
//     0.11648943417154013, -0.8894035131934193,  1.7676090179747466,     1];

// const sourceMatrix =   [1,0,0,0,
//                         0,1,0,0,
//                         0,0,1,0,
//                         0,0,0,1];


let transformationMatrix = new THREE.Matrix4();
transformationMatrix.fromArray(sourceMatrix);
let isKeyPressed = false;

function ResetCamParameter()
{
    counter = 0;
    isMovingCam = true;
    newCamPosNeeded = true;
    oldCamMatrix = [0,0,0,0,
        0,0,0,0,
        0,0,0,0,
        0,0,0,0];
}
let finalOpacity = 1.0;
const rotationLevels = [0.1, 1, 10];
const translationLevels = [0.01, 0.1, 1];
const scaleLevels = [1.01, 1.05, 1.1]
let transformIndex = 0; 


let rotateValue = rotationLevels[transformIndex];
let translateValue = translationLevels[transformIndex];
let scaleValue = scaleLevels[transformIndex];

document.addEventListener('keydown', function(event) {
    if (isKeyPressed) return;  // If the key is already pressed, return early
    switch(event.code) {
        case "NumpadAdd": // Move up the levels for rotation and translation
            transformIndex = (transformIndex + 1) % 3;
            rotateValue = rotationLevels[transformIndex];
            translateValue = translationLevels[transformIndex];
            scaleValue = scaleLevels[transformIndex];
            console.log("New rotateValue:", rotateValue, "New translateValue:", translateValue);
            console.log("New scale:", scaleValue);
            isKeyPressed = true;
            break;

        case "Numpad6": // Rotate about Y+
            let rotationMatrixY_ = new THREE.Matrix4();
            rotationMatrixY_.makeRotationY(THREE.MathUtils.degToRad(rotateValue)); // Rotate 10 degrees
            transformationMatrix.multiply(rotationMatrixY_);  // Apply incremental rotation
            console.log("Rotating about Y by", rotateValue);
            console.log("New Transformed matrix:", transformationMatrix);
            isKeyPressed = true;
            ResetCamParameter();
            break;
        case "Numpad4": // Rotate about Y-
            let rotationMatrixY = new THREE.Matrix4();
            rotationMatrixY.makeRotationY(THREE.MathUtils.degToRad(-rotateValue)); // Rotate 10 degrees
            transformationMatrix.multiply(rotationMatrixY);  // Apply incremental rotation
            console.log("Rotating about Y by", -rotateValue);
            console.log("New Transformed matrix:", transformationMatrix);
            isKeyPressed = true;
            ResetCamParameter();
            break;
        case "Numpad8": // Rotate about X+
            let rotationMatrixX_ = new THREE.Matrix4();
            rotationMatrixX_.makeRotationX(THREE.MathUtils.degToRad(rotateValue)); // Rotate 10 degrees
            transformationMatrix.multiply(rotationMatrixX_);  // Apply incremental rotation
            console.log("Rotating about X by", rotateValue);
            console.log("New Transformed matrix:", transformationMatrix);
            isKeyPressed = true;
            ResetCamParameter();
            break;
        case "Numpad5": // Rotate about X-
            let rotationMatrixX = new THREE.Matrix4();
            rotationMatrixX.makeRotationX(THREE.MathUtils.degToRad(-rotateValue)); // Rotate 10 degrees
            transformationMatrix.multiply(rotationMatrixX);  // Apply incremental rotation
            console.log("Rotating about X by", -rotateValue);
            console.log("New Transformed matrix:", transformationMatrix);
            isKeyPressed = true;
            ResetCamParameter();
            break;
        case "Numpad7": // Rotate about Z+
            let rotationMatrixZ_ = new THREE.Matrix4();
            rotationMatrixZ_.makeRotationZ(THREE.MathUtils.degToRad(rotateValue)); // Rotate 10 degrees
            transformationMatrix.multiply(rotationMatrixZ_);  // Apply incremental rotation
            console.log("Rotating about Z by", rotateValue);
            console.log("New Transformed matrix:", transformationMatrix);
            isKeyPressed = true;
            ResetCamParameter();
            break;
        case "Numpad9": // Rotate about Z-
            let rotationMatrixZ = new THREE.Matrix4();
            rotationMatrixZ.makeRotationZ(THREE.MathUtils.degToRad(-rotateValue)); // Rotate 10 degrees
            transformationMatrix.multiply(rotationMatrixZ);  // Apply incremental rotation
            console.log("Rotating about Z by", -rotateValue);
            console.log("New Transformed matrix:", transformationMatrix);
            isKeyPressed = true;
            ResetCamParameter();
            break;
        
        case "KeyA": // Translate along X+
            let translationMatrixX_ = new THREE.Matrix4();
            translationMatrixX_.makeTranslation(translateValue, 0, 0);
            transformationMatrix.multiply(translationMatrixX_);
            console.log("Translating along X by", translateValue);
            console.log("New Transformed matrix:", transformationMatrix);
            isKeyPressed = true;
            ResetCamParameter();
            break;
        case "KeyD": // Translate along X-
            let translationMatrixX = new THREE.Matrix4();
            translationMatrixX.makeTranslation(-translateValue, 0, 0);
            transformationMatrix.multiply(translationMatrixX);
            console.log("Translating along X by", -translateValue);
            console.log("New Transformed matrix:", transformationMatrix);
            isKeyPressed = true;
            ResetCamParameter();
            break;

        case "KeyE": // Translate along Y+
            let translationMatrixY_ = new THREE.Matrix4();
            translationMatrixY_.makeTranslation(0, translateValue, 0);
            transformationMatrix.multiply(translationMatrixY_);
            console.log("Translating along Y by", translateValue);
            console.log("New Transformed matrix:", transformationMatrix);
            isKeyPressed = true;
            ResetCamParameter();
            break;
        case "KeyQ": // Translate along Y-
            let translationMatrixY = new THREE.Matrix4();
            translationMatrixY.makeTranslation(0, -translateValue, 0);
            transformationMatrix.multiply(translationMatrixY);
            console.log("Translating along Y by", -translateValue);
            console.log("New Transformed matrix:", transformationMatrix);
            isKeyPressed = true;
            ResetCamParameter();
            break;

        case "KeyW": // Translate along Z
            let translationMatrixZ_ = new THREE.Matrix4();
            translationMatrixZ_.makeTranslation(0, 0, translateValue);
            transformationMatrix.multiply(translationMatrixZ_);
            console.log("Translating along Z by", translateValue);
            console.log("New Transformed matrix:", transformationMatrix);
            isKeyPressed = true;
            ResetCamParameter();
            break;
        case "KeyS": // Translate along Z-
            let translationMatrixZ = new THREE.Matrix4();
            translationMatrixZ.makeTranslation(0, 0, -translateValue);
            transformationMatrix.multiply(translationMatrixZ);
            console.log("Translating along Z by", -translateValue);
            console.log("New Transformed matrix:", transformationMatrix);
            isKeyPressed = true;
            ResetCamParameter();
            break;
        case "Numpad1": // Scale up
            let scaleMatrixUp = new THREE.Matrix4();
            scaleMatrixUp.makeScale(scaleValue, scaleValue, scaleValue);
            transformationMatrix.multiply(scaleMatrixUp);
            console.log("Scale up by", scaleValue);
            console.log("New Transformed matrix:", transformationMatrix);
            isKeyPressed = true;
            ResetCamParameter();
            break;
        case "Numpad2": // Scale down
            let scaleMatrixDown = new THREE.Matrix4();
            scaleMatrixDown.makeScale(1/scaleValue, 1/scaleValue, 1/scaleValue);
            transformationMatrix.multiply(scaleMatrixDown);
            console.log("Scale up down", scaleValue);
            console.log("New Transformed matrix:", transformationMatrix);
            isKeyPressed = true;
            ResetCamParameter();
            break;
        //... Add cases for other keys and their transformations here
    }
});

document.addEventListener('keyup', function(event) {
    if (event.code === "Numpad7"  || event.code === "Numpad8" || event.code === "Numpad9" || 
        event.code === "Numpad4"  || event.code === "Numpad5" || event.code === "Numpad6" ||
        event.code === "KeyW"     || event.code === "KeyS"    || event.code === "KeyA"    ||
        event.code === "KeyD"     || event.code === "KeyQ"    || event.code === "KeyE"    ||
        event.code === "NumpadAdd"|| event.code === "Numpad1" || event.code === "Numpad2")  
    {
        isKeyPressed = false;
    }
    //... Reset flags for other keys if needed
});

class WebSocketConnection {
    constructor() {
        this.isEnabled = false;
        this.websocket = null;
        this.peerConnection = {};
        this.callbacks = {
            onTurnOn: null,
            //onTurnOff: null
        }
        this.intervalID = null;
    }

    

    // turn on to create a new websocket for the camera messages
    turnOn(callback) {

        //initializting the HTML drawing canvas for nerf rendering
        var imgElement = document.getElementById('background_NeRF_rendering');
        if(!imgElement) 
        {
            console.log("yuanzhi creating the nerf canvas !");
            var newDiv = document.createElement("img");
            newDiv.id = "background_NeRF_rendering";
            newDiv.style.position = 'absolute';
            newDiv.style.left = '0';
            newDiv.style.top = '0';
            newDiv.style.zIndex = '-1'; // use this when in normal action
            // newDiv.style.zIndex = "9999"; // use this when doing manual alignment 
            newDiv.style.opacity = '1';
            newDiv.style.pointerEvents = 'none';
            newDiv.style.width = '100vw';
            newDiv.style.height = '100vh';
            document.body.appendChild(newDiv);

            let element = document.getElementById("background_NeRF_rendering");
                if (element) {
                    element.style.display = "block";
                    let opacity = 0;            // starting opacity
                    const step = 0.035;          // increment value
                    const intervalTime = 50;   // in milliseconds, determines how often opacity is updated

                    // Initially set the opacity to 0
                    element.style.opacity = opacity;

                    // Use setInterval to gradually increase opacity
                    let fadeInInterval = setInterval(function() {
                        opacity += step;

                        if (opacity > 1) {
                            opacity = 1;
                            clearInterval(fadeInInterval); // Stop the interval once opacity is 1
                        }

                        element.style.opacity = opacity;
                    }, intervalTime);
                }
        }

        // var gs_canvas = document.getElementById('gaussian-splatting_canvas');
        // if(!gs_canvas) 
        // {
        //     // Create the canvas if it doesn't exist
        //     var gaussianSplatCanvas = document.createElement("canvas");
        //     gaussianSplatCanvas.id = "gaussian-splatting_canvas"; // The ID expected by main.js
        //     gaussianSplatCanvas.style.zIndex = "9999"; // Ensure it's on top
        //     gaussianSplatCanvas.style.position = 'absolute';
        //     gaussianSplatCanvas.style.left = '0';
        //     gaussianSplatCanvas.style.top = '0';
        //     gaussianSplatCanvas.width = window.innerWidth;
        //     gaussianSplatCanvas.height = window.innerHeight;
        //     document.body.appendChild(gaussianSplatCanvas);

        //     let element = document.getElementById("gaussian-splatting_canvas");
        //         if (element) {
        //             element.style.display = "block";
        //         }
        // }

        this.isEnabled = true;
        if (callback) {
            this.callbacks.onTurnOn = callback;
        }
        this.connect();
        
    }

    // turn off to stop sending camera messages over the websocket
    turnOff(_callback) {
        this.isEnabled = false;
        this.stopSendCam();
        var imgElement = document.getElementById('background_NeRF_rendering');
        if(imgElement) 
        {
            imgElement.style.display = "none";
        }

        // var gs_canvas = document.getElementById('gaussian-splatting_canvas');
        // if(gs_canvas) 
        // {
        //     gs_canvas.style.display = "none";
        // }
    }

    // runs the first time you turnOn 
    connect() {
        if (this.websocket) {
            if (typeof this.callbacks.onTurnOn === 'function') {
                this.callbacks.onTurnOn();
                console.log('turn on (again)');
                // var imgElement = document.getElementById('background_NeRF_rendering');
                // if(imgElement) 
                // {
                //     imgElement.style.display = "block";
                // }

                //fade-in effect for the NeRF canvas
                let element = document.getElementById("background_NeRF_rendering");
                if (element) {
                    element.style.display = "block";
                    let opacity = 0;            // starting opacity
                    const step = 0.035;          // increment value
                    const intervalTime = 50;   // in milliseconds, determines how often opacity is updated

                    // Initially set the opacity to 0
                    element.style.opacity = opacity;

                    // Use setInterval to gradually increase opacity
                    let fadeInInterval = setInterval(function() {
                        opacity += step;
                        
                        if (opacity > finalOpacity) {
                            opacity = finalOpacity;
                            clearInterval(fadeInInterval); // Stop the interval once opacity is 1
                        }

                        element.style.opacity = opacity;
                    }, intervalTime);
                }

                //console.log("yuanzhi camera is moving");
                this.startSendCam(() => 
                {
                    //console.log('yuanzhi is sending cam Pos!');
                    this.sendCamPos();
                }, 1000/24); 

                
            }
            return;
        };

        // I think we need to use a standard WebSocket, because socket.io can't send messages encoded by msgpack in the format nerfstudio expects
        this.websocket = new WebSocket(PYTHON_WEBSOCKET_URL);

        this.websocket.onopen = (e => {
            console.log('Yuanzhi opened webSocket connection !!!');
            this.startSendCam(() => 
                {
                    //console.log('yuanzhi is sending cam Pos!');
                    this.sendCamPos();
                }, 1000/24); 
            // we can only establish the webrtc connection after the websocket is ready
            //this.establishWebRTCConnection();
        });

        this.websocket.onclose = (e => {
            console.log('Yuanzhi closed webSocket connection ...');
        });

        this.websocket.onerror = (e => {
            console.error('error with Yuanzhi websocket', e);
        });
        

        this.websocket.onmessage = async function (event) {
            // Reduce websocket backpressure.
            try {
                const arrayBuffer = await event.data.arrayBuffer();
                const message = await unpack(new Uint8Array(arrayBuffer));
                //console.log("yuanzhi received a messgae !");
                //console.log(message)
                if(message.type == 'BackgroundImageMessage')
                {
                    var imgElement = document.getElementById('background_NeRF_rendering');
                    if(imgElement) 
                    {
                        imgElement.setAttribute(
                            'src',
                            `data:${message.media_type};base64,${message.base64_data}`
                        );
                    }

                }
                

            } catch (error) {
                console.error(`Error handling message: ${error}`);
            } 
        };

    }

    startSendCam(callback, ms) {
        // if (this.intervalId !== null) {
        //   console.error('Already doing something. Please stop the current job before starting a new one.');
        //   return;
        // }
    
        if (typeof callback !== 'function') {
          console.error('First argument must be a function');
          return;
        }
    
        if (typeof ms !== 'number' || ms <= 0) {
          console.error('Second argument must be a positive number');
          return;
        }
    
        this.intervalId = setInterval(callback, ms);
    }
    
    stopSendCam() {
        if (this.intervalId === null) {
          console.error('No current job to stop.');
          return;
        }
        console.log("yuanzhi stopped sending fake msg !");
        clearInterval(this.intervalId);
        this.intervalId = null;
    }

    sendCamPos()
    {
        //detect if the virtualCam is moving first
        //console.log("in the sendCam function !!!");
        //console.log("counter is:" + counter);

        const floorOffset = realityEditor.gui.ar.areaCreator.calculateFloorOffset() // in my example, it returns -1344.81
        let cameraNode = realityEditor.sceneGraph.getSceneNodeById('CAMERA');

        let gpNode = realityEditor.sceneGraph.getSceneNodeById(realityEditor.sceneGraph.NAMES.GROUNDPLANE + realityEditor.sceneGraph.TAGS.ROTATE_X);
        if (!gpNode) {
            gpNode = realityEditor.sceneGraph.getSceneNodeById(realityEditor.sceneGraph.NAMES.GROUNDPLANE);
        }
        let newCamMatrix = cameraNode.getMatrixRelativeTo(gpNode);
        //console.log(newCamMatrix)

        isMovingCam = false;
        for(let i = 0; i<16; i++)
        {
            if(newCamMatrix[i] !== oldCamMatrix[i])
            {
                isMovingCam = true;
                oldCamMatrix = newCamMatrix.slice();
                //console.log("cam is MOVING !!!");
                break;
            }
        }
        //console.log("cam is NOT moving !!!");
        if(isMovingCam)
        {
            counter = 0;
            newCamPosNeeded = true;
        }
        if(!newCamPosNeeded){return;}

        if(!isMovingCam)
        {
            counter = counter + 1;
            if(counter > 200)
            {
                newCamPosNeeded = false;
                return;
            }
        }

        

        // array([  [ 9.57559476e-01, -2.88234053e-01, 9.89877789e-04, -2.56754693e+00],
        //          [ 2.79956634e-01,  9.29232406e-01, -2.41146053e-01,-7.41498688e+00],
        //          [ 6.85866777e-02,  2.31188811e-01,  9.70488331e-01, 1.39277160e+00],
        //          [ 0.00000000e+00,  0.00000000e+00,  0.00000000e+00, 1.00000000e+00]])
        // avgScale = 0.07125885689133157

        //new matrix transformation way !!!
        // First, apply the floorOffset and global SCALE
        const SCALE = 1 / 1000;
        const scaleF = 1.0  //you get this from CloudCompare, I know, its very sad....
        const offset_x = 0;
        const offset_y = 0;
        const offset_z = 0;
        //old code
        newCamMatrix[12] = (newCamMatrix[12]*SCALE + offset_x)*scaleF;
        newCamMatrix[13] = ((newCamMatrix[13] + floorOffset)*SCALE + offset_y)*scaleF;
        newCamMatrix[14] = (newCamMatrix[14]*SCALE + offset_z)*scaleF;

        // new code

        // newCamMatrix[12] *= SCALE;
        // newCamMatrix[13] = (newCamMatrix[13] + floorOffset) * SCALE;
        // newCamMatrix[14] *= SCALE;

        // this fking thing needs to ALSO be in the >>column convention<< !!!!!!!!
        // if you have a normal matrix, transpose it !!!!
        // this is the one we use in NerfStudio with only translation and scaleF
        // const transfMatrix = [
        //     1.0,        0,      0,          offset_x,
        //     0,          1.0,    0,          offset_y,
        //     0,          0,      1.0,        offset_z,
        //     0,          0,      0,          1.0
        // ];
        
        // this is the first full transform matrix we need to try
        // const transfMatrix = [
            // 0.234858408570 , -0.103778563440, -0.434047728777, -0.166607648134,
            // -0.078834064305, -0.492416858673,  0.075078077614, -0.081815689802,
            // -0.439263701439,  0.032886747271, -0.245543763041, -0.056163605303,
            // 0,                0,               0,               1.0
        // ];
        // //scaleF = 0.504307
        // // but we shouldb't be needing this since it's already in the matrix, therefore scaleF = 1.0
        // const scaleF = 0.504307;
        

        // this is the second full transform matrix we need to try
        // const transfMatrix = [
        //     0.973352611065 , -0.287162810564, -1.698833227158,  0.063655108213,
        //     -0.370926827192, -1.940358996391,  0.115465357900, -0.232672274113,
        //     -1.682530760765,  0.261641860008, -1.008238792419, -0.366404503584,
        //     0,                0,               0,               1.0
        // ];
        //scaleF = 1.97887 
        // but we shouldb't be needing this since it's already in the matrix, therefore
        // const scaleF = 1.0;
        //TODO: add additional transformation on top of this transMatrix and apply 1 rotation at a time to see effect

        
        function transpose(matrix) {
            if (matrix.length !== 16) {
                console.error("Matrix is not a 4x4 matrix");
                return;
            }
        
            return [
                matrix[0], matrix[4], matrix[8], matrix[12],
                matrix[1], matrix[5], matrix[9], matrix[13],
                matrix[2], matrix[6], matrix[10], matrix[14],
                matrix[3], matrix[7], matrix[11], matrix[15]
            ];
        }

        // const transposedMatrix = transpose(transfMatrix);

        function ApplyTransMatrix(sourceMatrix, transMatrix, scaleF)
        {
            let resultMatrix = new Array(16).fill(0);

            for(let row = 0; row < 4; row++) {
                for(let col = 0; col < 4; col++) {
                    let sum = 0; // Initialize sum for each element
                    for(let k = 0; k < 4; k++) {
                        sum += sourceMatrix[row * 4 + k] * transMatrix[k * 4 + col];
                    }
                    resultMatrix[row * 4 + col] = sum; // Assign the calculated value
                }
            }
    
            resultMatrix[12] = resultMatrix[12] * scaleF;
            resultMatrix[13] = resultMatrix[13] * scaleF;
            resultMatrix[14] = resultMatrix[14] * scaleF;

            return resultMatrix
        }


        let array1D = transformationMatrix.elements;
        //let transposedMatrix = transpose(array1D);
        let resultMatrix_1 = ApplyTransMatrix(newCamMatrix, array1D, scaleF)


        //format the outgoing camera pos message !!!
        const message = 
        {
            type: "CameraMessage",
            aspect: window.innerWidth/window.innerHeight,
            render_aspect: window.innerWidth/window.innerHeight,
            fov: 41.22673,
            matrix: resultMatrix_1,
            camera_type: "perspective",
            is_moving: isMovingCam,
            timestamp: +new Date(),
        };

        //send msg !!!
        this.websocket.send(pack(message));
        console.log("Yuanzhi is sending new cam pos...");

    }


 
}

exports.WebSocketConnection = WebSocketConnection;

})(realityEditor.websocket);
