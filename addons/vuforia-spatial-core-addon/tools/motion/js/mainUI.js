import EventEmitter from 'eventemitter3';

/**
 * @desc this class will hold functions for the Main User Interface on 2D screen. It contains the 2D buttons overlayed on the screen on top of the AR content
 * examples include initButtons(), surfaceTracked(), robotTracked(), activateButtonTouch()
 * @author Anna Fuste
 * @required eventemitter3
 */
export class MainUI {

    constructor(){

        this.eventEmitter = new EventEmitter();

        this.buttonTouch = false;   // In order to control when user interact with 2D UI vs 3D environment

        this.domElement = document.createElement('div');

        this.onPosRight = this.onPosRight.bind(this);
        this.onPosLeft = this.onPosLeft.bind(this);
        this.onPosForward = this.onPosForward.bind(this);
        this.onPosBackwards = this.onPosBackwards.bind(this);
        this.onCloseAction = this.onCloseAction.bind(this);
        this.onReset = this.onReset.bind(this);
        this.onClearPath = this.onClearPath.bind(this);
        this.onRealTimePath = this.onRealTimePath.bind(this);

        this.initButtons();

    }

    on(eventName, listener) {
        this.eventEmitter.on(eventName, listener);
    }

    removeEventListener(eventName, listener) {
        this.eventEmitter.removeListener(eventName, listener);
    }

    emit(event, payload, error = false) {
        this.eventEmitter.emit(event, payload, error);
    }

    initButtons(){

        /********* BUTTONS *********/

        this.surfaceFeedback = document.createElement('img');
        this.surfaceFeedback.src = 'assets/textures/surfaceTrackingOff.png';
        this.surfaceFeedback.id = 'surfaceFeedback';
        this.domElement.appendChild( this.surfaceFeedback );

        this.robotFeedback = document.createElement('img');
        this.robotFeedback.src = 'assets/textures/robotOff.png';
        this.robotFeedback.id = 'robotFeedback';
        this.domElement.appendChild( this.robotFeedback );

        this.closeAction = document.createElement('button');
        this.closeAction.id = 'closeAction';
        this.closeAction.addEventListener('pointerdown', this.onCloseAction, false);
        this.domElement.appendChild( this.closeAction );

        this.posRightButton = document.createElement('button');
        this.posRightButton.id = 'posRightButton';
        this.posRightButton.addEventListener('pointerdown', this.onPosRight, false);
        this.domElement.appendChild( this.posRightButton );

        this.posLeftButton = document.createElement('button');
        this.posLeftButton.id = 'posLeftButton';
        this.posLeftButton.addEventListener('pointerdown', this.onPosLeft, false);
        this.domElement.appendChild( this.posLeftButton );

        this.posForwardButton = document.createElement('button');
        this.posForwardButton.id = 'posForwardButton';
        this.posForwardButton.addEventListener('pointerdown', this.onPosForward, false);
        this.domElement.appendChild( this.posForwardButton );

        this.posBackwardsButton = document.createElement('button');
        this.posBackwardsButton.id = 'posBackwardsButton';
        this.posBackwardsButton.addEventListener('pointerdown', this.onPosBackwards, false);
        this.domElement.appendChild( this.posBackwardsButton );

        this.posArrowCenter = document.createElement('div');
        this.posArrowCenter.id = 'posArrowCenter';
        this.domElement.appendChild( this.posArrowCenter );

        this.hideCheckpointPositionMenu();
        this.hideCloseActionButton();

        /*this.resetButton = document.createElement('button');
        this.resetButton.id = 'resetButton';
        this.resetButton.addEventListener('pointerdown', this.onReset, false);
        this.domElement.appendChild( this.resetButton );*/

        this.realtimePathButton = document.createElement('button');
        this.realtimePathButton.id = 'realtimePathButton';
        this.realtimePathButton.addEventListener('pointerdown', this.onRealTimePath, false);
        this.domElement.appendChild( this.realtimePathButton );

        this.clearPathButton = document.createElement('button');
        this.clearPathButton.id = 'clearPathButton';
        this.clearPathButton.addEventListener('pointerdown', this.onClearPath, false);
        this.domElement.appendChild( this.clearPathButton );

        /*
        this.followButton = document.createElement('button');
        this.followButton.id = 'followButton';
        this.followButton.addEventListener('pointerdown', this.onFollow, false);
        //this.domElement.appendChild( this.followButton );

        this.closePathButton = document.createElement('button');
        this.closePathButton.id = 'closePathButton';
        this.closePathButton.addEventListener('pointerdown', this.onClosePath, false);
        //this.domElement.appendChild( this.closePathButton );
         */

    }

    surfaceTracked(){
        this.surfaceFeedback.src = 'assets/textures/surfaceTrackingOn.png';
    }
    robotTracked(){
        this.robotFeedback.src = 'assets/textures/robotOn.png';
    }

    activateButtonTouch(){

        console.log('this.buttonTouch true');
        this.buttonTouch = true;

        setTimeout(() => {
            console.log("Set button back to false");
            this.buttonTouch = false;
        }, 100);
    }

    onPosRight(event){
        console.log('onPosRight');
        this.activateButtonTouch();
        this.emit('positionEdit', 2);
    }

    onPosLeft(event){
        console.log('onPosLeft');
        this.activateButtonTouch();
        this.emit('positionEdit', 3);
    }

    onPosForward(event){
        this.activateButtonTouch();
        this.emit('positionEdit', 0);
    }

    onPosBackwards(event){
        this.activateButtonTouch();
        this.emit('positionEdit', 1);
    }

    onCloseAction(event){

        console.log('ON CLOSE ACTION');

        this.activateButtonTouch();
        this.emit('closeAction');
    }

    onFollow( event ) {

        console.log('FOLLOW');
        this.activateButtonTouch();

        this.emit('follow');

    }

    onReset( event ) {

        console.log('RESET');
        this.activateButtonTouch();

        this.emit('reset');

    }

    onClearPath( event ) {

        console.log('CLEAR PATH');
        this.activateButtonTouch();

        this.emit('clearPath');

    }

    onClosePath( event ) {

        console.log('CLOSE PATH');
        this.activateButtonTouch();

        this.emit('closePath');

    }

    onRealTimePath( event ){
        console.log('START REALTIME PATH');
        this.activateButtonTouch();

        this.emit('realtimePath');
    }

    hideCheckpointPositionMenu(){
        this.posBackwardsButton.style.visibility = 'hidden';
        this.posForwardButton.style.visibility = 'hidden';
        this.posLeftButton.style.visibility = 'hidden';
        this.posRightButton.style.visibility = 'hidden';
        this.posArrowCenter.style.visibility = 'hidden';
    }
    showCheckpointPositionMenu(){
        this.posBackwardsButton.style.visibility = 'visible';
        this.posForwardButton.style.visibility = 'visible';
        this.posLeftButton.style.visibility = 'visible';
        this.posRightButton.style.visibility = 'visible';
        this.posArrowCenter.style.visibility = 'visible';
    }

    hideCloseActionButton(){
        this.closeAction.style.visibility = 'hidden';
    }

    showCloseActionButton(){
        this.closeAction.style.visibility = 'visible';
    }

    update(){

    }
}
