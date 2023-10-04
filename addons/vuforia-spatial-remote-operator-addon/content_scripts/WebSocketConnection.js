
createNameSpace('realityEditor.websocket');
import { pack, unpack } from "https://deno.land/x/msgpackr@v1.9.3/index.js";

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
            newDiv.style.zIndex = "9999";
            newDiv.style.position = 'absolute';
            newDiv.style.left = '0';
            newDiv.style.top = '0';
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

                        if (opacity > 1) {
                            opacity = 1;
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

        //console.log("counter is:" + counter);

        const floorOffset = realityEditor.gui.ar.areaCreator.calculateFloorOffset() // in my example, it returns -1344.81
        let cameraNode = realityEditor.sceneGraph.getSceneNodeById('CAMERA');

        let gpNode = realityEditor.sceneGraph.getSceneNodeById(realityEditor.sceneGraph.NAMES.GROUNDPLANE + realityEditor.sceneGraph.TAGS.ROTATE_X);
        if (!gpNode) {
            gpNode = realityEditor.sceneGraph.getSceneNodeById(realityEditor.sceneGraph.NAMES.GROUNDPLANE);
        }
        let newCamMatrix = cameraNode.getMatrixRelativeTo(gpNode);
        //console.log(newCamMatrix)

        let isMovingCam = false;
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
        const scaleF = 0.13523484986150555;
        const offset_x = 0.7202233672142029;
        const offset_y = -0.5659182071685791;
        const offset_z = -1.2645909786224365;
        //old code
        // newCamMatrix[12] = (newCamMatrix[12]*SCALE + offset_x)*scaleF;
        // newCamMatrix[13] = ((newCamMatrix[13] + floorOffset)*SCALE + offset_y)*scaleF;
        // newCamMatrix[14] = (newCamMatrix[14]*SCALE + offset_z)*scaleF;

        // new code

        newCamMatrix[12] *= SCALE;
        newCamMatrix[13] = (newCamMatrix[13] + floorOffset) * SCALE;
        newCamMatrix[14] *= SCALE;

        // this fking thing needs to ALSO be in the >>column convention<< !!!!!!!!
        // if you have a normal matrix, transpose it !!!!
        const transfMatrix = [
            1.0,        0,      0,          offset_x,
            0,          1.0,    0,          offset_y,
            0,          0,      1.0,        offset_z,
            0,          0,      0,          1.0
        ];
        
        
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

        const transposedMatrix = transpose(transfMatrix);

        let resultMatrix = new Array(16).fill(0);

        for(let row = 0; row < 4; row++) {
            for(let col = 0; col < 4; col++) {
                let sum = 0; // Initialize sum for each element
                for(let k = 0; k < 4; k++) {
                    sum += newCamMatrix[row * 4 + k] * transposedMatrix[k * 4 + col];
                }
                resultMatrix[row * 4 + col] = sum; // Assign the calculated value
            }
        }

        resultMatrix[12] = resultMatrix[12] * scaleF;
        resultMatrix[13] = resultMatrix[13] * scaleF;
        resultMatrix[14] = resultMatrix[14] * scaleF;


        //format the outgoing camera pos message !!!
        const message = 
        {
            type: "CameraMessage",
            aspect: window.innerWidth/window.innerHeight,
            render_aspect: window.innerWidth/window.innerHeight,
            fov: 41.22673,
            matrix: resultMatrix,
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
