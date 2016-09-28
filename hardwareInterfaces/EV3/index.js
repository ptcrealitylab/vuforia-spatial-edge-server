/**
 * @preserve
 *
 *                                     .,,,;;,'''..
 *                                 .'','...     ..',,,.
 *                               .,,,,,,',,',;;:;,.  .,l,
 *                              .,',.     ...     ,;,   :l.
 *                             ':;.    .'.:do;;.    .c   ol;'.
 *      ';;'                   ;.;    ', .dkl';,    .c   :; .'.',::,,'''.
 *     ',,;;;,.                ; .,'     .'''.    .'.   .d;''.''''.
 *    .oxddl;::,,.             ',  .'''.   .... .'.   ,:;..
 *     .'cOX0OOkdoc.            .,'.   .. .....     'lc.
 *    .:;,,::co0XOko'              ....''..'.'''''''.
 *    .dxk0KKdc:cdOXKl............. .. ..,c....
 *     .',lxOOxl:'':xkl,',......'....    ,'.
 *          .';:oo:...                        .
 *               .cd,    ╔═╗┌─┐┬─┐┬  ┬┌─┐┬─┐   .
 *                 .l;   ╚═╗├┤ ├┬┘└┐┌┘├┤ ├┬┘   '
 *                   'l. ╚═╝└─┘┴└─ └┘ └─┘┴└─  '.
 *                    .o.                   ...
 *                     .''''','.;:''.........
 *                          .'  .l
 *                         .:.   l'
 *                        .:.    .l.
 *                       .x:      :k;,.
 *                       cxlc;    cdc,,;;.
 *                      'l :..   .c  ,
 *                      o.
 *                     .,
 *
 *             ╦ ╦┬ ┬┌┐ ┬─┐┬┌┬┐  ╔═╗┌┐  ┬┌─┐┌─┐┌┬┐┌─┐
 *             ╠═╣└┬┘├┴┐├┬┘│ ││  ║ ║├┴┐ │├┤ │   │ └─┐
 *             ╩ ╩ ┴ └─┘┴└─┴─┴┘  ╚═╝└─┘└┘└─┘└─┘ ┴ └─┘
 *
 * Created by Valentin on 10/22/14.
 * Modified by Carsten on 12/06/15.
 *
 * Copyright (c) 2015 Valentin Heun
 *
 * All ascii characters above must be included in any redistribution.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Set to true to enable the hardware interface
 **/
exports.enabled = true;

if (exports.enabled) {


    var speed =0; // global variable for the speed of the robot.
    var server = require(__dirname + '/../../libraries/hardwareInterfaces');
    server.enableDeveloperUI(true);
    var stop_command_tilt = false;
    var stop_command_grip=false;



    var Ev3 = require ("./module/Ev3.js");
    var Ev3_base = Ev3.base;

    var bot_brick = new Ev3_base("/dev/tty.WhiteLOW-SerialPort");
    var top_brick = new Ev3_base("/dev/tty.EV3-SerialPort"); // put your bluetooth socket.
    var motor_output_top = {"a": 0, "b":0,"c":0, "d":0};
    var motor_output_bot = {"a": 0, "b":0,"c":0, "d":0};
    var top_ready = false; // boolean to check if top EV3 Brick has been connected to the computer
    var bot_ready = false; // boolean to check if bot EV3 Brick has been connected to the computer
    var bot_target = undefined; // bot and top targets are the brick objects used to control the robot arm
    var top_target = undefined;
    /* ----------------------------------------------------------------------------------------------------------------- */
    //all global variables used for calibrating top brick
    var prev_f_twist = 100; // default to white (not moving)
    var f_twist= 100; // default to white (not moving)
    var u_tilt = ""; // default to white (not moving)
    var tilt_calibrated = false; // boolean check for if grip rotation and tilt have been calibrated
    var grip_calibrated = false; // boolean check for if grip rotation and tilt have been calibrated
    var forearm_touch_sensor = false;
    var first_pass = true;
    /* ----------------------------------------------------------------------------------------------------------------- */
    // all global variables used for calibrating bottom brick
    var shoulder_calibrated = false;
    var base_color = "";
    var shoulder_color = "";
    /* ----------------------------------------------------------------------------------------------------------------- */
    // below are completion checks for every element of calibration
    var grip_ready = true;
    var shoulder_ready = true;
    var forearm_twist_ready = true;
    var upper_tilt_ready = true;
    /* ----------------------------------------------------------------------------------------------------------------- */
    // below are boolean checks for boundry movement using reality editor
    var shoulder_forwards = true;
    var shoulder_backwards = true;
    var arm_upwards = true;
    var arm_downwards = true;
    var arm_twist_cw = true; // arm twist in clockwise directoin
    var arm_twist_ccw = true; // arm twist in counter clock wise direciton
    /* ----------------------------------------------------------------------------------------------------------------- */
    // below are the rotation angles set by the user for the robot to calibrate with

    var base_angle_correction = 0; // used by all interfaces to set the base angle of rotation.
    var shoulder_angle_correction = Math.PI/2; // used for right and left base interfaces to control shoulder rotation angle.
    var upper_tilt_angle_correction =0; // used by top upper tilt interface to control upper tilt angle
    var shoulder_stop_point =400; // the interface is 800 pixels wide, the halfway point is 400. Used for right and left shoulder interfaces.
    var grip_stop_point =300; // the interface is 600 pixels long, the halfway point is 300. Used for gripper interface.

    var forearm_angle_correction = 0;
    var grip_angle_correction = 0;

    var forearm_starting_height = 0;
    var gripper_open = true;
    var grabbing = false;
    /* ----------------------------------------------------------------------------------------------------------------- */
    // below are booleans used for markers that have both touch movement and movement based off of the phones rotation. Both should not be possible at once, or oscilations happen.
    var shoulder_tilting = false;
    var forearm_tilting = false;

    var joint_grip_active = false;
    var grip_tilting = false;
    var forearm_locked = false; // used by Gripper
    /* ----------------------------------------------------------------------------------------------------------------- */
    // below are booleans used for certain stops which require kicking the motor in the opposite direction
    var forearm_stopping = false;
    var shoulder_stopping = false;

    var test = 0;
    var grip_val = 0;

    bot_brick.connect(function(){ // this function connects the bottom brick to the computer via bluetooth. It initializes all the sensors as well.
        bot_brick.start_program(function(target){
            bot_ready=true;
            bot_target=target;
            target.registerSensor(2, target.S_TYPE_COLOR, target.SM_COL_RINTENSITY);
            target.registerSensorListener(2, function (result) {
                base_color = result;
            });
            target.registerSensor(1, target.S_TYPE_COLOR, target.SM_COL_COLOR);
            target.registerSensorListener(1, function (result) { // registers sensor in the base which looks up at the main arm
                // in this callback which is performed on every reading the sensor checks if it is at one of the boundaries and if it is sets a boolean representing movement in that direction to be false
                shoulder_color = result;
                if(result == Ev3.COL_RED)
                    shoulder_forwards=false;
                else if(result == Ev3.COL_BLACK)
                    shoulder_backwards=false;
                else{
                    shoulder_forwards=true;
                    shoulder_backwards=true;
                }

            });
            target.registerSensor(3,target.S_TYPE_TOUCH,0);
            target.registerSensorListener(3,function(result){ // the red button to reset the system and cause calibration to begin
                if(result){
                    grip_ready=false;
                    shoulder_ready=false;
                    forearm_twist_ready=false;
                    upper_tilt_ready=false;
                    tilt_calibrated=false;
                    first_pass=true;
                    grip_calibrated=false;
                    shoulder_calibrated=false;
                    motor_output_top = {"a": 0, "b":0,"c":0, "d":0};
                    motor_output_bot = {"a": 0, "b":0,"c":0, "d":0};
                }
            });

        })
    });
    //
    top_brick.connect(function(){ // connects top brick to ev3
        top_brick.start_program(function(target){
            top_ready=true;
            top_target = target; // target is what is used to send commands to the robot
            target.registerSensor(1,target.S_TYPE_TOUCH,0);
            target.registerSensorListener(1,function(result){
                forearm_touch_sensor = result;
            });

            target.registerSensor(3, target.S_TYPE_COLOR, target.SM_COL_COLOR);
            target.registerSensorListener(3, function (result) {
                //console.log("Result has value:" + result + "and prev value was " + f_twist_res);
                prev_f_twist = f_twist;
                f_twist = result;
                if(result == Ev3.COL_RED){
                    arm_twist_ccw=false;
                }
                else if(result == Ev3.COL_BROWN){
                    arm_twist_cw=false;
                }
                else{
                    arm_twist_cw=true;
                    arm_twist_ccw=true;
                }
            });
            target.registerSensor(2, target.S_TYPE_COLOR, target.SM_COL_COLOR);
            target.registerSensorListener(2, function (result) {
                u_tilt = result;
                if(result == Ev3.COL_NULL || result==Ev3.COL_BLACK || result==Ev3.COL_BROWN || result == Ev3.COL_GREEN){
                    arm_downwards=false;
                    //stopForearm();
                }
                else if(result == Ev3.COL_WHITE)
                    arm_upwards=false;
                else{
                    arm_upwards=true;
                    arm_downwards=true;
                }
                //console.log(result);
            });
        })
    });

    var main_loop = setInterval(function(){ // main loop of the entire system. Runs 10 times/second. First checks if bot/top are connected, then pulls readings from them, and then check if the robot needs to be calibrated. If all aspects of the robot arm are ready, then it takes whatever is stored in the database for motor speeds and sets it to the robot arm.
        if(bot_ready && top_ready){
            bot_target.pullReadings();
            top_target.pullReadings();
            if(shoulder_ready && upper_tilt_ready && forearm_twist_ready && grip_ready){
                var top_output = top_target.getOutputSequence(motor_output_top["a"], motor_output_top["b"], motor_output_top["c"], motor_output_top["d"]);
                if (top_output) {
                    top_target.sp.write(top_output, function (err, len) {
                        if (err) {

                            console.log(motor_output_top);
                            console.log(top_output);
                            console.log(JSON.stringify([].slice.call(arguments)));
                        }
                    });
                }

                var bot_output = bot_target.getOutputSequence(motor_output_bot["a"], motor_output_bot["b"], motor_output_bot["c"], motor_output_bot["d"]);
                if (bot_output) {
                    bot_target.sp.write(bot_output, function (err, len) {
                        if (err) {
                            console.log(motor_output_bot);
                            console.log(bot_output);
                            console.log(JSON.stringify([].slice.call(arguments)));
                        }
                    });
                }
            }
            else { // means that the robot needs to be calibrated and calibration routine begins.
                if (!first_pass) {
                    resetForearmTwist(f_twist);
                }
                else {
                    motor_output_top['d'] = 5;
                    first_pass = false;
                }
                if (!tilt_calibrated)
                    tilt_calibrated = resetUpperTilt(u_tilt);
                if (!grip_calibrated)
                    grip_calibrated = resetGrip(forearm_touch_sensor);
                else{
                  //  console.log("The motor speed is: " + motor_output_top['b']);
                }
                if (!shoulder_calibrated)
                    shoulder_calibrated = resetShoulder(shoulder_color);
               // console.log("Im writing a command with values" + motor_output_top["a"], motor_output_top["b"], motor_output_top["c"], motor_output_top["d"]);
                var top_output = top_target.getOutputSequence(motor_output_top["a"], motor_output_top["b"], motor_output_top["c"], motor_output_top["d"]);
                top_target.sp.write(top_output, function () {});
                var bot_output = bot_target.getOutputSequence(motor_output_bot["a"], motor_output_bot["b"], motor_output_bot["c"], motor_output_bot["d"]);
                bot_target.sp.write(bot_output, function () {});
            }

        }
    },100);



    function map(x, in_min, in_max, out_min,out_max) {
        if (x > in_max) x = in_max;
        if (x < in_min) x = in_min;
        return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
    }
    function stopForearm(){ // function to kick back the motor in the opposite directino to stop arm moving from inertia
        if(motor_output_top['a'] >5){
            if(motor_output_top['a']>40)
                motor_output_top['a']=-20;
            else if(motor_output_top['a']>15)
                motor_output_top['a']=-5;
            else
                motor_output_top['a']=-3;
            setTimeout(function(){
                motor_output_top['a']=0;
                forearm_stopping=false;
            },100);
        }
        else{
            motor_output_top['a']=0;
            forearm_stopping=false;
        }
        motor_output_top['d']=0;
    }

    function stopShoulder(){ //function to kick back the motor in the opposite directino to stop arm moving from inertia
        if(Math.abs(motor_output_bot.c) >15){
            if(motor_output_bot.c>40){
                motor_output_bot.c=-20;
                motor_output_bot.b=-20;
            }
            else if(motor_output_bot.c>15){
                motor_output_bot.c=-5;
                motor_output_bot.b=-5;
            }
            else if(motor_output_bot.b<-40){
                motor_output_bot.c=20;
                motor_output_bot.b=20;
            }
            else{
                motor_output_bot.c=5;
                motor_output_bot.b=5;
            }
            setTimeout(function(){
                motor_output_bot.b=0;
                motor_output_bot.c=0;
                shoulder_stopping=false;
            },100);
        }
        else{
            motor_output_bot.b=0;
            motor_output_bot.c=0;
            shoulder_stopping=false;
        }
    }



    function resetForearmTwist(value){  // used by calibration
        if(value == Ev3.COL_BLACK) { // sees black and at middle point
            motor_output_top['d'] = 0;
            forearm_twist_ready=true; // forearm will be fully calibrated and rotate perfectly to be middle.
        }
        else if(value == Ev3.COL_BROWN)
            motor_output_top['d']= 10;
        else if(value == Ev3.COL_RED)
            motor_output_top['d']= -8;
    }

    function resetUpperTilt(value){ // used by calibration
        if(value != Ev3.COL_WHITE){
            motor_output_top['a'] = -35;
            return false;
        }
        else{
            motor_output_top['a']=35;
            setTimeout(function(){
                motor_output_top['a']=0;
                upper_tilt_ready=true;
            },2550);
            return true; // shoulder will be perfectly vertical and fully calibrated
        }
    }

    function resetGrip(value){// used by calibration
        if(!value){
            motor_output_top['c'] = 13;
            return false;
        }
        else{
            motor_output_top['c'] = -30;
            motor_output_bot.d=-10;
            //motor_output_top['b'] = -30;
           // console.log("he's going up sir");
            setTimeout(function(){
                motor_output_top['c'] = 0;
                motor_output_top['b'] = 0;
                motor_output_bot.d=0;
                gripper_open=true;
                grip_ready=true;
               // console.log("command has been sent");
            },2800);
            return true; // grip has hit the touch sensor and is fully calibrated
        }
    }

    function resetShoulder(value){// used by calibration
        if(value != Ev3.COL_RED){
            motor_output_bot['c'] = -12;
            motor_output_bot['b'] = -12;
            return false;
        }
        else{
            motor_output_bot['c'] = 30;
            motor_output_bot['b'] = 30;
            setTimeout(function(){
                motor_output_bot['c'] = 0;
                motor_output_bot['b'] = 0;
                shoulder_ready=true;
            },2000);
            return true; // shoulder will be perfectly vertical and fully calibrated
        }
    }

    function resetBase(value){ // used by calibration
        if(value >= 98){
            motor_output_bot['a']= 0;
        }
        else
            motor_output_bot['a']= 20;
    }






    server.addNode("Gripper6AxisEV3", "Vertical Touch", "default");
    server.addNode("Gripper6AxisEV3", "Horizontal Touch", "default");
    server.addNode("Gripper6AxisEV3", "pitch", "default");
    server.addNode("Gripper6AxisEV3", "Height Tracking", "default");
    server.addNode("Gripper6AxisEV3", "roll", "default");
    server.addNode("Gripper6AxisEV3", "Upper Tilt + Top Joint", "default");
    server.addNode("Gripper6AxisEV3", "Grip Rotation", "default");
    server.addNode("Gripper6AxisEV3", "Grip Tilt", "default");
    server.addNode("Gripper6AxisEV3", "grab", "default");
    server.addNode("Gripper6AxisEV3", "kickback joint tilt", "default");

    server.addNode("TopForearm6AxisEV3", "Vertical Touch_ft", "default");
    server.addNode("TopForearm6AxisEV3", "Horizontal Touch_ft", "default");
    server.addNode("TopForearm6AxisEV3", "pitch_ft", "default");
    server.addNode("TopForearm6AxisEV3", "Height Tracking_ft", "default");
    server.addNode("TopForearm6AxisEV3", "Forearm Rotation", "default");

    server.addNode("TopUpperTilt6AxisEV3", "yaw_ut", "default");
    server.addNode("TopUpperTilt6AxisEV3", "Vertical Touch_ut", "default");
    server.addNode("TopUpperTilt6AxisEV3", "roll_ut", "default");

    server.addNode("RightUpperTilt6AxisEV3", "yaw_ur", "default");
    server.addNode("RightUpperTilt6AxisEV3", "Horizontal Touch_ur", "default");
    server.addNode("RightUpperTilt6AxisEV3", "pitch_ur", "default");
    server.addNode("RightUpperTilt6AxisEV3", "Upper Tilt", "default");
    server.addNode("RightUpperTilt6AxisEV3", "Arm + Shoulder", "default");
    server.addNode("RightUpperTilt6AxisEV3", "kickback arm", "default");
    server.addNode("RightUpperTilt6AxisEV3", "kickback arm + shoulder", "default");

    server.addNode("RightShoulder6AxisEV3", "Horizontal Touch_sr", "default");
    server.addNode("RightShoulder6AxisEV3", "pitch_sr", "default");

    server.addNode("RightBase6AxisEV3", "pitch_br", "default");
    server.addNode("RightBase6AxisEV3", "yaw_br", "default");
    server.addNode("RightBase6AxisEV3", "kickback_br", "default");
    server.addNode("RightBase6AxisEV3", "Base Rotation", "default");
    server.addNode("RightBase6AxisEV3", "Base Joint", "default");
    /**
     * *******************************
     */

    server.addReadListener("RightUpperTilt6AxisEV3", "Upper Tilt", function (item) {
        if(bot_ready && top_ready) {
            if (shoulder_ready && upper_tilt_ready && forearm_twist_ready && grip_ready) { // makes sure that calibration is not running
               var value = Math.floor(map(item.number,0,1,-100,100));

                // code
                forearm_tilting=true;
                speed = value;
                test = value;

            }
        }
    });


    server.addReadListener("Gripper6AxisEV3", "Upper Tilt + Top Joint", function (item) {
        if(bot_ready && top_ready) {
            if (shoulder_ready && upper_tilt_ready && forearm_twist_ready && grip_ready) { // makes sure that calibration is not running
               var value = Math.floor(map(item.number,0,1,-100,100));

                // code
                speed = value;
                if(!arm_downwards && speed >0 && !forearm_stopping){
                    forearm_stopping=true;
                    stopForearm();
                    speed =0;
                }
                else {
                    speed = value;
                    if (!arm_downwards && speed > 0 && !forearm_stopping) {
                        forearm_stopping = true;
                        stopForearm();
                    }
                    else if (!arm_upwards && speed < 0 && !forearm_stopping) {
                        forearm_stopping = true;
                        stopForearm();
                    }
                    else {
                        motor_output_top['a'] = speed;
                    }
                    //  console.log("gripval: " + grip_val);
                    speed = Math.floor(grip_val);
                    motor_output_top['c'] = speed;
                }

            }
        }
    });
    server.addReadListener("Gripper6AxisEV3", "Grip Rotation", function (item) {
        if(bot_ready && top_ready) {
            if (shoulder_ready && upper_tilt_ready && forearm_twist_ready && grip_ready) { // makes sure that calibration is not running
               var value = Math.floor(map(item.number,0,1,-100,100));

                // code
                speed = value;
                motor_output_top.b = speed;

            }
        }
    });
    server.addReadListener("Gripper6AxisEV3", "Grip Tilt", function (item) {
        if(bot_ready && top_ready) {
            if (shoulder_ready && upper_tilt_ready && forearm_twist_ready && grip_ready) { // makes sure that calibration is not running
              var  value = Math.floor(map(item.number,0,1,-100,100));

                // code
                grip_val=value;

            }
        }
    });
    server.addReadListener("Gripper6AxisEV3", "grab", function (item) {
        if(bot_ready && top_ready) {
            if (shoulder_ready && upper_tilt_ready && forearm_twist_ready && grip_ready) { // makes sure that calibration is not running
               var value = Math.floor(map(item.number,0,1,-100,100));

                // code
                if(!grabbing){
                    grabbing=true;
                    if(gripper_open){
                        motor_output_bot.d=15;
                        gripper_open=false;
                    }
                    else{
                        motor_output_bot.d=-15;
                        gripper_open=true;
                    }
                    setTimeout(function(){
                        motor_output_bot.d=0;
                        grabbing=false;
                    },1500);
                }

            }
        }
    });
    server.addReadListener("TopForearm6AxisEV3", "Forearm Rotation", function (item) {
        if(bot_ready && top_ready) {
            if (shoulder_ready && upper_tilt_ready && forearm_twist_ready && grip_ready) { // makes sure that calibration is not running
               var value = Math.floor(map(item.number,0,1,-100,100));

                // code
                speed = value;
                if(speed < 0 && !arm_twist_cw){
                    motor_output_top['d']=0;
                }
                if(speed > 0 && !arm_twist_ccw){
                    motor_output_top['d']=0;
                }
                motor_output_top.d = speed;

            }
        }
    });
    server.addReadListener("RightUpperTilt6AxisEV3","Arm + Shoulder" , function (item) {
        if(bot_ready && top_ready) {
            if (shoulder_ready && upper_tilt_ready && forearm_twist_ready && grip_ready) { // makes sure that calibration is not running
               var value = Math.floor(map(item.number,0,1,-100,100));

                // code
                speed = -value;
                shoulder_tilting = true;
                if (!shoulder_forwards && speed < 0)
                    speed = 0;
                else if (!shoulder_backwards && speed > 0)
                    speed = 0;
                motor_output_bot.b = speed;
                motor_output_bot.c = speed;
                speed = Math.floor(-5 / 7 * value + test);
                if (!arm_downwards && speed > 0 && !forearm_stopping) {
                    forearm_stopping = true;
                    stopForearm();
                    speed = 0;
                }
                else if (!arm_upwards && speed < 0 && !forearm_stopping) {
                    forearm_stopping = true;
                    stopForearm();
                    speed = 0;
                }
                else
                    motor_output_top.a = speed;

            }
        }
    });
    server.addReadListener("RightBase6AxisEV3","Base Rotation" , function (item) {
        if(bot_ready && top_ready) {
            if (shoulder_ready && upper_tilt_ready && forearm_twist_ready && grip_ready) { // makes sure that calibration is not running
               var value = Math.floor(map(item.number,0,1,-100,100));

                // code
                speed = value;
                motor_output_bot.a = value;

            }
        }
    });
    server.addReadListener("RightBase6AxisEV3","Base Joint" , function (item) {
        if(bot_ready && top_ready) {
            if (shoulder_ready && upper_tilt_ready && forearm_twist_ready && grip_ready) { // makes sure that calibration is not running
               var value = Math.floor(map(item.number,0,1,-100,100));

                // code
                //console.log("base joint " + value);
                speed = value;

                if(!shoulder_forwards && speed <0)
                    speed=0;
                else if(!shoulder_backwards && speed >0)
                    speed =0;
                //  console.log("I recieved a value of " + value + " and speed: " + speed + " and i should go down " + shoulder_forwards);
                motor_output_bot['b'] = speed;
                motor_output_bot['c'] = speed;

            }
        }
    });

    server.addEventListener("reset", function () {

    });

    server.addEventListener("shutdown", function () {
        console.log("shutting down from exports.shutdown!");
        if(top_target!==undefined)
            top_target.disconnect();
        if(bot_target!==undefined)
            bot_target.disconnect();
        return;
    });
    server.enableDeveloperUI(true);
}
