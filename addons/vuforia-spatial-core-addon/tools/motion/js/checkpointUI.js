import {toScreenPosition} from "./utils";
import EventEmitter from 'eventemitter3';

/**
 * @desc this class will hold functions for the UI for each checkpoint with a menu for parameters (rotation, height, position, speed)
 * examples include initButtons(), showCheckpointMenu(), resetCheckpointMenu(), resetMode()
 * @author Anna Fuste
 * @required eventemitter3, utils.js
 */
export class CheckpointUI extends EventEmitter{

    constructor() {

        super();

        /*const Mode = {
            NONE: 0,
            ROTATION: 1,
            HEIGHT: 2,
            SPEED: 3,
            POSITION: 4
        };
        this.checkpointMode = Mode.NONE;
         */
        this.checkpointMode = 0;     // 0 - none, 1 - rotation, 2 - speed, 3 - height

        this.checkpointMenuCountActive = false;
        this.checkpointMenuCounter = 0;

        this.deactivateCheckpointMenu();      // If checkpoint menu with rotation, speed and height should be visible

        this.activateCheckpointMenu = this.activateCheckpointMenu.bind(this);
        this.deactivateCheckpointMenu = this.deactivateCheckpointMenu.bind(this);
        this.onRotate = this.onRotate.bind(this);
        this.onHeight = this.onHeight.bind(this);
        this.onSpeed = this.onSpeed.bind(this);
        this.onPos = this.onPos.bind(this);
        this.onRotateSel = this.onRotateSel.bind(this);
        this.onSpeedSel = this.onSpeedSel.bind(this);
        this.onHeightSel = this.onHeightSel.bind(this);
        this.onPosSel = this.onPosSel.bind(this);

        this.domElement = document.createElement('div');

        this.initButtons();

    }

    initButtons(){

        /********* BUTTONS *********/

        this.rotateButton = document.createElement('button');
        this.rotateButton.id = 'rotateButton';
        this.rotateButton.addEventListener('pointerup', this.onRotate, false);
        this.rotateButton.addEventListener('pointermove', this.onRotateSel, false);
        this.domElement.appendChild( this.rotateButton );

        this.speedButton = document.createElement('button');
        this.speedButton.id = 'speedButton';
        this.speedButton.addEventListener('pointerup', this.onSpeed, false);
        this.speedButton.addEventListener('pointermove', this.onSpeedSel, false);
        this.domElement.appendChild( this.speedButton );

        this.heightButton = document.createElement('button');
        this.heightButton.id = 'heightButton';
        this.heightButton.addEventListener('pointerup', this.onHeight, false);
        this.heightButton.addEventListener('pointermove', this.onHeightSel, false);
        this.domElement.appendChild( this.heightButton );

        this.posButton = document.createElement('button');
        this.posButton.id = 'posButton';
        this.posButton.addEventListener('pointerup', this.onPos, false);
        this.posButton.addEventListener('pointermove', this.onPosSel, false);
        this.domElement.appendChild( this.posButton );

        // PEP
        //pointermove
        //pointerdown
        //pointerup
        //pointercancel

    }

    showCheckpointMenu(currentPath, camera, renderer){

        console.log('SHOW CHECKPOINT MENU');

        let newButtonPos = toScreenPosition(currentPath.selectedCheckpoint, camera, renderer);

        this.heightButton.style.visibility = 'visible';
        this.heightButton.style.left = newButtonPos.x + 110 + 'px';
        this.heightButton.style.top = newButtonPos.y - 80 + 'px';

        this.speedButton.style.visibility = 'visible';
        this.speedButton.style.left = newButtonPos.x + 40 + 'px';
        this.speedButton.style.top = newButtonPos.y - 120 + 'px';

        this.posButton.style.visibility = 'visible';
        this.posButton.style.left = newButtonPos.x - 40 + 'px';
        this.posButton.style.top = newButtonPos.y - 120 + 'px';

        this.rotateButton.style.visibility = 'visible';
        this.rotateButton.style.left = newButtonPos.x - 110 + 'px';
        this.rotateButton.style.top = newButtonPos.y - 80 + 'px';
    }

    resetCheckpointMenu(){
        this.heightButton.style.backgroundImage = 'url("assets/textures/VolumetricVideo_UI_Height02.png")';
        this.heightButton.style.visibility = 'hidden';

        this.speedButton.style.backgroundImage = 'url("assets/textures/VolumetricVideo_UI_Speed02.png")';
        this.speedButton.style.visibility = 'hidden';

        this.rotateButton.style.backgroundImage = 'url("assets/textures/VolumetricVideo_UI_Rotation02.png")';
        this.rotateButton.style.visibility = 'hidden';

        this.posButton.style.backgroundImage = 'url("assets/textures/VolumetricVideo_UI_Pos02.png")';
        this.posButton.style.visibility = 'hidden';
    }

    resetMode(){
        this.checkpointMode = 0;
        this.checkpointMenuCountActive = false;
        this.checkpointMenuCounter = 0;
        this.checkpointMenuVisible = false;
    }

    activateCheckpointMenu(){
        console.log('ACTIVATE CHECKPOINT MENU');
        this.checkpointMenuVisible = true;
    }

    deactivateCheckpointMenu(){
        this.checkpointMenuVisible = false;
    }

    onHeightSel( event ) {
        this.heightButton.style.backgroundImage = 'url("assets/textures/VolumetricVideo_UI_Height01.png")';
        this.speedButton.style.backgroundImage = 'url("assets/textures/VolumetricVideo_UI_Speed02.png")';
        this.rotateButton.style.backgroundImage = 'url("assets/textures/VolumetricVideo_UI_Rotation02.png")';
        this.posButton.style.backgroundImage = 'url("assets/textures/VolumetricVideo_UI_Pos02.png")';
    }

    onSpeedSel( event ) {
        this.speedButton.style.backgroundImage = 'url("assets/textures/VolumetricVideo_UI_Speed01.png")';
        this.rotateButton.style.backgroundImage = 'url("assets/textures/VolumetricVideo_UI_Rotation02.png")';
        this.heightButton.style.backgroundImage = 'url("assets/textures/VolumetricVideo_UI_Height02.png")';
        this.posButton.style.backgroundImage = 'url("assets/textures/VolumetricVideo_UI_Pos02.png")';
    }

    onRotateSel( event ) {
        this.rotateButton.style.backgroundImage = 'url("assets/textures/VolumetricVideo_UI_Rotation01.png")';
        this.heightButton.style.backgroundImage = 'url("assets/textures/VolumetricVideo_UI_Height02.png")';
        this.speedButton.style.backgroundImage = 'url("assets/textures/VolumetricVideo_UI_Speed02.png")';
        this.posButton.style.backgroundImage = 'url("assets/textures/VolumetricVideo_UI_Pos02.png")';
    }

    onPosSel( event ) {
        this.rotateButton.style.backgroundImage = 'url("assets/textures/VolumetricVideo_UI_Rotation02.png")';
        this.heightButton.style.backgroundImage = 'url("assets/textures/VolumetricVideo_UI_Height02.png")';
        this.speedButton.style.backgroundImage = 'url("assets/textures/VolumetricVideo_UI_Speed02.png")';
        this.posButton.style.backgroundImage = 'url("assets/textures/VolumetricVideo_UI_Pos01.png")';
    }

    onRotate( event ) {

        console.log('Rotate');

        this.checkpointMode = 1;

        this.emit('rotate');

    }

    onSpeed( event ) {

        this.checkpointMode = 2;

        this.emit('speed');

        console.log('Speed');

    }
    onHeight( event ) {

        this.checkpointMode = 3;

        this.emit('height');

        console.log('Height');

    }

    onPos( event ) {
        this.checkpointMode = 4;
        this.emit('position');
        console.log('Position');
    }

    isCheckpointMenuVisible(){
        return this.checkpointMenuVisible;
    }

}