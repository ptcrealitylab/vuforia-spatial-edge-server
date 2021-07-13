// Constructor with subset of object information necessary for the web frontend
function Objects() {
    this.name = '';
    this.initialized = false;
    this.frames = {};
    this.visualization = 'AR';
    this.active = false;
    this.zone = '';
    this.screenPort = '';
    this.isWorldObject = false;
    this.sharingEnabled = false; // world objects can enable their frames to be visually attached to other objects
    this.isExpanded = true;
    this.targetsExist = {
        datExists: false,
        xmlExists: false,
        jpgExists: false
    };
}

function SpatialLocator(objectID, toolID, nodeID) {
    this.objectID = objectID;
    this.toolID = toolID;
    this.nodeID = nodeID;
}

let spatialLocator = {
    whereIs: {},
    howFarIs: {},
    whereWas: {},
    velocityOf: {}
};

let recordState = true;

// Constructor with subset of frame information necessary for the web frontend
function Frame() { // eslint-disable-line no-unused-vars
    this.name = '';
    this.location = 'local'; // or 'global'
    this.src = ''; // the frame type, e.g. 'slider-2d' or 'graphUI'
}

let collapsedObjects = {};
let objectKeyToHighlight = null;
let defaultHardwareInterfaceSelected = 'kepware';

realityServer.hideAllTabs = function () {
    this.domObjects.querySelector('#manageObjectsContents').classList.remove('selectedTab');
    this.domObjects.querySelector('#manageFramesContents').classList.remove('selectedTab');
    this.domObjects.querySelector('#manageHardwareInterfacesContents').classList.remove('selectedTab');

    this.domObjects.querySelector('#manageObjectsContents').classList.add('hiddenTab');
    this.domObjects.querySelector('#manageFramesContents').classList.add('hiddenTab');
    this.domObjects.querySelector('#manageHardwareInterfacesContents').classList.add('hiddenTab');
};

realityServer.getDomContents = function () {
    return this.domObjects.querySelector('#' + realityServer.selectedTab + 'Contents');
};

realityServer.getCommonContents = function () {
    return this.domObjects.querySelector('#commonContents');
};

let remoteOperatorUrl = 'http://' + realityServer.states.ipAdress.interfaces[realityServer.states.ipAdress.activeInterface] + ':8081';
let isRemoteOperatorSupported = false;

realityServer.initialize = function () {
    realityServer.downloadImage = new Image();
    realityServer.downloadImage.src = '../libraries/gui/resources/icondownload.svg';
    realityServer.downloadImageP = new Image();
    realityServer.downloadImageP.src = '../libraries/gui/resources/icondownloadP.svg';

    console.log(realityServer.states);

    collapsedObjects = JSON.parse(window.localStorage.getItem('collapsedObjects')) || {};
    for (let objectKey in collapsedObjects) {
        if (realityServer.objects.hasOwnProperty(objectKey)) {
            realityServer.objects[objectKey].isExpanded = !collapsedObjects[objectKey]; // expanded is opposite of collapsed
        }
    }

    // clicking on header refreshes -> goes back to objects tab
    document.getElementById('logo').addEventListener('click', function () {
        window.location.reload();
    });

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', function(e) {
        setTimeout(function() {
            console.log('pointerup');
            onPointerMove(e);
        }, 10);

    }); // also trigger at the end of clicks

    document.getElementById('subtitle').innerText = 'Version: ' + realityServer.states.version + ' - Server IP: ' +
        realityServer.states.ipAdress.interfaces[realityServer.states.ipAdress.activeInterface] + ':' + realityServer.states.serverPort;

    // set up objects with default properties
    let defaultObject = new Objects();
    for (let objectKey in realityServer.objects) {
        let thisObject = realityServer.objects[objectKey];
        for (let key in defaultObject) {
            if (typeof thisObject[key] === 'undefined') {
                thisObject[key] = JSON.parse(JSON.stringify(defaultObject[key]));
            }
        }
    }

    continueAfterCheckingRemoteOperator(function() {
        this.update();
        this.initializeHelp();
    }.bind(this));
};

function continueAfterCheckingRemoteOperator(callback) {
    var request = new XMLHttpRequest();
    request.open('GET', remoteOperatorUrl, true);
    request.onreadystatechange = function() {
        if (request.readyState === 4) {
            if (request.status === 200) {
                isRemoteOperatorSupported = true;
                console.log('remoteOperator: YES');
            } else {
                isRemoteOperatorSupported = false;
                console.log('remoteOperator: NO');
            }
            callback();
        }
    }.bind(this);
    request.send();
}

let showHelpText = 'Show Help';
let hideHelpText = 'Hide Help';

let showHelpTooltip = false;
let tooltipDiv = null;

let lastMovedTimestamp = Date.now();

function onPointerMove(e) {
    tooltipDiv.style.display = 'none';

    if (!showHelpTooltip) { return; }
    if (!tooltipDiv) { return; }

    lastMovedTimestamp = Date.now();

    let x = e.clientX, y = e.clientY;
    let elementMouseIsOver = document.elementFromPoint(x, y);
    // console.log(elementMouseIsOver);

    let text = elementMouseIsOver.dataset.tooltipText;
    let levelsOfSearch = 3;
    while (levelsOfSearch > 0 && !text) {
        // console.log('no text on this element, searching parent');
        levelsOfSearch -= 1;
        if (elementMouseIsOver.parentElement) {
            elementMouseIsOver = elementMouseIsOver.parentElement;
            text = elementMouseIsOver.dataset.tooltipText;
        } else {
            levelsOfSearch = 0;
        }
    }

    if (text) {
        let thisTime = Date.now();
        setTimeout(function () {
            onPointerHover(thisTime, x, y, text);
        }, 300);
    }
}

function onPointerHover(timestamp, x, y, text) {
    if (lastMovedTimestamp !== timestamp || !showHelpTooltip) {
        return;
    }
    // let elementMouseIsOver = document.elementFromPoint(x, y);
    tooltipDiv.style.display = '';
    tooltipDiv.style.left = 0; // set to left so we can compute width //x + 'px';
    tooltipDiv.style.top = (y + window.scrollY) + 'px';
    tooltipDiv.innerText = text;
    tooltipDiv.style.fontSize = '14px';
    let computedWidth = tooltipDiv.getClientRects()[0].width;
    let margin = 10;
    if (computedWidth > window.innerWidth - margin) {
        tooltipDiv.style.fontSize = '12px';
        computedWidth = tooltipDiv.getClientRects()[0].width;
        if (computedWidth > window.innerWidth - margin) {
            tooltipDiv.style.fontSize = '10px';
            computedWidth = tooltipDiv.getClientRects()[0].width;
        }
    } else {
        // tooltipDiv.classList.remove('tooltipMiniText');
        // tooltipDiv.style.fontSize = '14px';
    }

    let constrainedLeft =  Math.min(window.innerWidth - computedWidth - margin, (x + window.scrollX));
    tooltipDiv.style.left = constrainedLeft + 'px';
    // console.log('hover');
}

realityServer.initializeHelp = function () {
    // if there are no objects, show help by default. otherwise hide help by default.
    if (Object.keys(realityServer.objects).length === 0 || window.localStorage.getItem('showHelp')) {
        showHelp();
    } else {
        hideHelp();
    }

    document.getElementById('showHelpButton').addEventListener('click', function () {
        // toggle the help text
        let isHelpActive = document.getElementById('showHelpButton').innerText === hideHelpText;
        if (isHelpActive) {
            hideHelp();
            window.localStorage.removeItem('showHelp');
        } else {
            showHelp();
        }
    });

    // create the tooltipDiv
    if (!tooltipDiv) {
        tooltipDiv = document.createElement('div');
        tooltipDiv.classList.add('tooltip', 'grey', 'button', 'item');
        tooltipDiv.id = 'tooltip';
        document.body.appendChild(tooltipDiv);
    }
};

function setTooltipTextForElement(element, helpText) {
    if (typeof element === 'string') {
        element = document.querySelector(element);
    }
    if (element) {
        element.dataset.tooltipText = helpText;
    }
}

function setTooltipTextForManageObjects() {
    setTooltipTextForElement('#addObject', 'Define an object with an Image, Object, or Model target where AR content' +
        ' will "stick to" when looking at it with the Spatial Toolbox');
    setTooltipTextForElement('#addRegion', 'Create a "region" object whose boundaries can be later defined' +
        ' as a subsection of the world. Tools dropped into that subsection of the world will stick to that region.');
    setTooltipTextForElement('#addWorldObject', 'Create a "world" object with an Area or Image target, to' +
        ' specify the (0,0,0) position of your space and where any objects without targets can be anchored');
    setTooltipTextForElement('#rec', 'While turned on, saves a debug log of all object activity to the objectLogs' +
        ' directory');
    setTooltipTextForElement('#whereIs', 'Select this while the Spatial Toolbox app is open to trigger a' +
        ' spatial search for the selected objects or tools');
    setTooltipTextForElement('#whereWas', 'Visualize where selected objects or tools have moved over time (in the' +
        ' app)');
    setTooltipTextForElement('#howFarIs', 'Visualize the distance between selected objects or tools (in the app)');
    setTooltipTextForElement('#velocityOf', 'Visualize the velocity of selected objects or tools (in the app)');
    setTooltipTextForElement('#netInterface', 'If multiple network interfaces are present here, select the one you' +
        ' want to use, otherwise this server might not be discoverable on the network');
}

function showHelp() {
    // show help text
    let objectDescription = document.getElementById('objectDescription');
    if (objectDescription) {
        objectDescription.style.display = '';
    }
    let framesDescription = document.getElementById('globalFramesDescription');
    if (framesDescription) {
        framesDescription.style.display = '';
    }
    let hardwareInterfacesDescription = document.getElementById('hardwareInterfacesDescription');
    if (hardwareInterfacesDescription) {
        hardwareInterfacesDescription.style.display = '';
    }

    // make the button say "Hide Help" instead of "Help"
    document.getElementById('showHelpButton').innerText = hideHelpText;

    setTooltipTextForElement(document.getElementById('showHelpButton'),
        'For advanced users: hide all help text and tutorials');
    showHelpTooltip = true;

    window.localStorage.setItem('showHelp', true);
}

function hideHelp() {
    // hide all help text
    let objectDescription = document.getElementById('objectDescription');
    if (objectDescription) {
        objectDescription.style.display = 'none';
    }
    let framesDescription = document.getElementById('globalFramesDescription');
    if (framesDescription) {
        framesDescription.style.display = 'none';
    }
    let hardwareInterfacesDescription = document.getElementById('hardwareInterfacesDescription');
    if (hardwareInterfacesDescription) {
        hardwareInterfacesDescription.style.display = 'none';
    }

    // make the button say "Help" instead of "Hide Help"
    document.getElementById('showHelpButton').innerText = showHelpText;

    showHelpTooltip = false;
    if (tooltipDiv) {
        tooltipDiv.style.display = 'none';
    }
}

function updateVisibilityOfTutorials() {
    if (document.getElementById('showHelpButton').innerText === showHelpText) {
        hideHelp();
    } else {
        showHelp();
    }
}

realityServer.forEachSortedObjectKey = function (callback) {
    let sorted = realityServer.sortObject(realityServer.objects);
    sorted.forEach(function (sortedKey) {
        callback(sortedKey[1]);
    });
};

realityServer.updateManageObjects = function (thisItem2) {

    this.getDomContents().appendChild(this.templates['start'].content.cloneNode(true));
    //  this.domObjects.appendChild(document.getElementById("textEntryFrame").content.cloneNode(true));

    /////// Tutorial ///////
    document.getElementById('objectDescription').appendChild(this.templates['objectTutorial'].content.cloneNode(true));
    // update tutorial based on current application state
    let tutorialStateNumber = 0;
    let objectKeys = Object.keys(realityServer.objects);

    if (objectKeys.length === 0) { // if there are no objects
        tutorialStateNumber = 1;

    } else if (objectKeys.filter(function (key) {
        return realityServer.objects[key].initialized; // if there are objects initialized with targets
    }).length === 0) {
        tutorialStateNumber = 2;

    } else if (objectKeys.filter(function (key) {
        return Object.keys(realityServer.objects[key].frames).length > 0;
    }).length === 0) { // if there are no objects with frames
        tutorialStateNumber = 3;

    } else {
        let isExactlyOneObject = objectKeys.filter(function (key) {
            return realityServer.objects[key].initialized; // if there are objects initialized with targets
        }).length === 1;

        let hasExactlyOneFrame = objectKeys.filter(function (key) {
            return Object.keys(realityServer.objects[key].frames).length === 1;
        }).length === 1;

        // show the tutorial complete step
        if (isExactlyOneObject && hasExactlyOneFrame) {
            tutorialStateNumber = 4;
        }
    }

    if (tutorialStateNumber !== 0 && tutorialStateNumber !== 1) {
        document.getElementById('mainDescription').classList.add('hiddenTab');
    }
    if (tutorialStateNumber !== 1) {
        document.getElementById('createObjectDescription').classList.add('hiddenTab');
    }
    if (tutorialStateNumber !== 2) {
        document.getElementById('addTargetDescription').classList.add('hiddenTab');
    }
    if (tutorialStateNumber !== 3) {
        document.getElementById('addFrameDescription').classList.add('hiddenTab');
    }
    if (tutorialStateNumber !== 4) {
        document.getElementById('frameAddedDescription').classList.add('hiddenTab');
    }
    updateVisibilityOfTutorials();
    /////// ^ Tutorial ^ ///////

    document.getElementById('addObject').addEventListener('click', realityServer.gotClick, false);
    document.getElementById('addRegion').addEventListener('click', realityServer.gotClick, false);
    document.getElementById('addWorldObject').addEventListener('click', realityServer.gotClick, false);
    document.getElementById('whereIs').addEventListener('click', realityServer.gotClick, false);
    document.getElementById('whereWas').addEventListener('click', realityServer.gotClick, false);
    document.getElementById('howFarIs').addEventListener('click', realityServer.gotClick, false);
    document.getElementById('velocityOf').addEventListener('click', realityServer.gotClick, false);
    document.getElementById('rec').addEventListener('click', realityServer.gotClick, false);


    realityServer.forEachSortedObjectKey(function (objectKey) {
        if (objectKey === 'allTargetsPlaceholder000000000000') {
            return;
        }

        let thisObject = this.objects[objectKey];

        console.log('--------' + thisItem2);

        if (!thisItem2 || thisItem2 === objectKey) {

            if (thisObject.isWorldObject) {

                thisObject.dom = this.templates['worldObject'].content.cloneNode(true); // world object template
                thisObject.dom.querySelector('.worldObject').id = 'object' + objectKey;
                thisObject.dom.querySelector('.name').innerText = thisObject.name;

                thisObject.dom.querySelector('.target').setAttribute('objectId', objectKey);
                thisObject.dom.querySelector('.target').setAttribute('isWorldObject', true);
                thisObject.dom.querySelector('.target').addEventListener('click', realityServer.gotClick, false);

                setTooltipTextForElement(thisObject.dom.querySelector('.name'),
                    'World objects are special objects (best used with Area Targets) that only need to be looked at' +
                    ' once per AR session to localize the Toolbox app within your space');

                setTooltipTextForElement(thisObject.dom.querySelector('.zone'),
                    'Zone is optional and limits which apps will discover this object. Don\'t change this unless you know what you\'re doing.');

                setTooltipTextForElement(thisObject.dom.querySelector('.target'),
                    'Edit which target data will define the origin of this space\'s coordinate system. Works best' +
                    ' with Area Targets but an Image Target that won\'t move is also fine.');

                setTooltipTextForElement(thisObject.dom.querySelector('.sharing'),
                    'The tool sharing feature will be introduced in a future update. Currently has no effect.');

                setTooltipTextForElement(thisObject.dom.querySelector('.remove'),
                    'Permanently delete this world object and all data associated with it');

                setTooltipTextForElement(thisObject.dom.querySelector('.download'),
                    'Download a .zip backup of this world object. Unzip it into your spatialToolbox directory to' +
                    ' restore the object on this or a different edge server.');

                function addDeleteListener(button, container, thisObjectKey) { // eslint-disable-line no-inner-declarations
                    button.addEventListener('click', function () {
                        // add a expandcollapse div with Sure? Yes
                        let alreadyOpen = container.querySelector('.expandcollapse');
                        if (alreadyOpen) {
                            realityServer.removeAnimated(alreadyOpen.querySelector('.deleteOK'));
                            return;
                        }
                        let deleteConfirmation = realityServer.templates['deleteOKId'].content.cloneNode(true);
                        container.appendChild(deleteConfirmation);

                        container.querySelector('.deleteYes').addEventListener('click', function () {
                            realityServer.removeAnimated(container.querySelector('.deleteOK'));

                            realityServer.sendRequest('/', 'POST', function (state) {
                                if (state === 'ok') {
                                    delete realityServer.objects[thisObjectKey];
                                    window.location.reload();
                                }
                                realityServer.update();
                            }, 'action=delete&name=' + realityServer.objects[thisObjectKey].name + '&frame=');
                        });
                    });
                }

                addDeleteListener(thisObject.dom.querySelector('.remove'), thisObject.dom.querySelector('.worldObject'), objectKey);

                if (Object.keys(thisObject.frames).length > 0) {
                    thisObject.dom.querySelector('.triangle').classList.remove('hidden');
                    thisObject.dom.querySelector('.triangle').classList.add('clickAble');
                    addExpandedToggle(thisObject.dom.querySelector('.triangle'), objectKey, thisObject);

                    if (thisObject.isExpanded) {
                        thisObject.dom.querySelector('.triangle').classList.add('triangleDown');
                    } else {
                        thisObject.dom.querySelector('.triangle').classList.remove('triangleDown');
                    }
                }

                if (thisObject.initialized) {

                    // on/off and download buttons are always clickable if initialized
                    thisObject.dom.querySelector('.active').classList.add('clickAble');
                    thisObject.dom.querySelector('.download').classList.add('clickAble');

                    // let targetUrl = 'http://localhost:8080/obj/' + thisObject.name + '/target/target.jpg';
                    // thisObject.dom.querySelector(".target").style.backgroundImage = 'url("' + targetUrl + '")';
                    // thisObject.dom.querySelector(".target").style.backgroundSize = 'cover';

                    // make on/off button green or yellow, and certain buttons clickable or faded out, depending on active state
                    if (thisObject.active) {
                        if (isRemoteOperatorSupported) { // world object button only needs to be clickable in this case
                            realityServer.changeActiveState(thisObject.dom, true, objectKey);
                        }

                        realityServer.switchClass(thisObject.dom.querySelector('.active'), 'yellow', 'green');
                        thisObject.dom.querySelector('.active').innerText = 'On';

                        thisObject.dom.querySelector('.sharing').classList.add('clickAble');
                        thisObject.dom.querySelector('.sharing').classList.add('clickAble');

                        addSharingToggle(thisObject.dom.querySelector('.sharing'), objectKey, thisObject);

                        setTooltipTextForElement(thisObject.dom.querySelector('.active'),
                            'Click here to temporarily disable the object, hiding it from Spatial Toolbox apps in the' +
                            ' network');

                    } else {
                        realityServer.switchClass(thisObject.dom.querySelector('.active'), 'green', 'yellow');
                        thisObject.dom.querySelector('.active').innerText = 'Off';

                        thisObject.dom.querySelector('.name').classList.add('inactive');
                        thisObject.dom.querySelector('.zone').classList.add('inactive');
                        thisObject.dom.querySelector('.sharing').classList.add('inactive');

                        setTooltipTextForElement(thisObject.dom.querySelector('.active'),
                            'This world object is inactive. Click here to enable the object.');

                        // realityServer.setDeactive
                    }

                    // download zip file if click on download button
                    thisObject.dom.querySelector('.download').addEventListener('click', function (_e) {
                        window.location.href = '/object/' + realityServer.objects[objectKey].name + '/zipBackup/';
                    });

                    // world objects with targets should have a green "Edit Origin" button when fully initialized
                    if (thisObject.targetsExist.datExists || thisObject.targetsExist.jpgExists) {
                        realityServer.switchClass(thisObject.dom.querySelector('.target'), 'yellow', 'green');
                        realityServer.switchClass(thisObject.dom.querySelector('.target'), 'targetWidthMedium', 'one');
                        thisObject.dom.querySelector('.target').innerText = 'Edit Origin';

                        // only add the icon if it exists
                        if (thisObject.targetsExist.jpgExists) {
                            let ipAddress = realityServer.states.ipAdress.interfaces[realityServer.states.ipAdress.activeInterface];
                            thisObject.dom.querySelector('.objectTargetIcon').src = 'http://' + ipAddress + ':' + realityServer.states.serverPort + '/obj/' + thisObject.name + '/target/target.jpg';
                        }

                    } else {
                        // world objects without targets should have an "Add Origin Target" button instead
                        setTimeout(function (thisObjectKey) {
                            let thisObjectElement = document.getElementById('object' + thisObjectKey);
                            if (thisObjectElement) {
                                if (thisObjectElement.querySelector('.objectIcon')) {
                                    thisObjectElement.querySelector('.objectIcon').remove();
                                }
                                realityServer.switchClass(thisObjectElement.querySelector('.target'), 'one', 'targetWidthMedium');
                                thisObjectElement.querySelector('.target').innerText = 'Add Origin Target';
                            }
                        }, 10, objectKey); // interferes with other layout in Safari if happens immediately
                    }

                    // make Frame Sharing button turn green or yellow depending on state
                    if (thisObject.sharingEnabled) {
                        realityServer.switchClass(thisObject.dom.querySelector('.sharing'), 'yellow', 'green');
                        thisObject.dom.querySelector('.sharing').innerText = 'Tool Sharing On';

                    } else {
                        realityServer.switchClass(thisObject.dom.querySelector('.sharing'), 'green', 'yellow');
                        thisObject.dom.querySelector('.sharing').innerText = 'Tool Sharing Off';
                    }

                    addEnabledToggle(thisObject.dom.querySelector('.active'), objectKey, thisObject); // create inside closure so interfaceInfo doesn't change after definition

                } else { // if not initializes with target files...

                    thisObject.dom.querySelector('.name').classList.add('inactive');
                    thisObject.dom.querySelector('.zone').classList.add('inactive');
                    thisObject.dom.querySelector('.sharing').classList.add('inactive');
                    thisObject.dom.querySelector('.download').classList.add('inactive');
                    thisObject.dom.querySelector('.active').classList.add('inactive');

                    // make on/off button yellow always if not properly initialized
                    realityServer.switchClass(thisObject.dom.querySelector('.active'), 'green', 'yellow');
                    thisObject.dom.querySelector('.active').innerText = 'Off';

                    // make Add Target button yellow
                    realityServer.switchClass(thisObject.dom.querySelector('.target'), 'green', 'yellow');
                    realityServer.switchClass(thisObject.dom.querySelector('.target'), 'one', 'targetWidthMedium');

                    setTooltipTextForElement(thisObject.dom.querySelector('.target'),
                        'Add a target file to finish setting up this world object');

                    // if (thisObject.dom.querySelector('.objectIcon')) {
                    thisObject.dom.querySelector('.objectIcon').remove(); //.parentElement.removeChild(thisObject.dom.querySelector('.objectIcon'));
                    // }
                    // if (thisObject.dom.querySelector('.objectIconSpace')) {
                    // thisObject.dom.querySelector('.objectIconSpace').remove(); //.parentElement.removeChild(thisObject.dom.querySelector('.objectIconSpace'));
                    // }
                    // realityServer.switchClass(thisObject.dom.querySelector(".name"), "oneAndHalf", "two");
                    // thisObject.dom.querySelector('.spaceAfterTarget').style.width = '2px';

                }

                this.getDomContents().appendChild(thisObject.dom);

            } else {

                thisObject.dom = this.templates['object'].content.cloneNode(true);
                thisObject.dom.querySelector('.object').id = 'object' + objectKey;
                // check if items are active
                if (thisObject.initialized && thisObject.active) {
                    realityServer.changeActiveState(thisObject.dom, true, objectKey);

                    // set help text for each of the buttons in an activated object
                    setTooltipTextForElement(thisObject.dom.querySelector('.object').querySelector('.name'),
                        'Click here to view debug info for this object');

                    setTooltipTextForElement(thisObject.dom.querySelector('.object').querySelector('.zone'),
                        'Zone is optional and limits which apps will discover this object. Don\'t change this unless you know what you\'re doing.');

                    setTooltipTextForElement(thisObject.dom.querySelector('.object').querySelector('.target'),
                        'Edit which target data the app should look for to see the content (tools) attached to this object');

                    setTooltipTextForElement(thisObject.dom.querySelector('.object').querySelector('.addFrame'),
                        'Click here to attach a custom tool (piece of AR content) to this object');

                    setTooltipTextForElement(thisObject.dom.querySelector('.object').querySelector('.visualization'),
                        'For most objects this should stay "AR". If you have the vuforia-spatial-screens-addon' +
                        ' installed, this will indicate if your object has been configured as a screen HMI.');

                    setTooltipTextForElement(thisObject.dom.querySelector('.object').querySelector('.active'),
                        'Click here to temporarily disable the object, hiding it from Spatial Toolbox apps in the network');

                } else {
                    realityServer.changeActiveState(thisObject.dom, false, objectKey);

                    setTooltipTextForElement(thisObject.dom.querySelector('.object').querySelector('.active'),
                        'This object is inactive and won\'t be seen by Spatial Toolbox apps in the network');
                }

                setTooltipTextForElement(thisObject.dom.querySelector('.object').querySelector('.remove'),
                    'Permanently delete this object and all data associated with it');

                setTooltipTextForElement(thisObject.dom.querySelector('.object').querySelector('.download'),
                    'Download a .zip backup of this object. Unzip it into your spatialToolbox directory to restore' +
                    ' the object on this or a different edge server.');

                if (thisObject.initialized) {
                    realityServer.switchClass(thisObject.dom.querySelector('.target'), 'yellow', 'green');
                    realityServer.switchClass(thisObject.dom.querySelector('.target'), 'targetWidthMedium', 'one');

                    // let targetUrl = 'http://localhost:8080/obj/' + thisObject.name + '/target/target.jpg';
                    // thisObject.dom.querySelector(".target").style.backgroundImage = 'url("' + targetUrl + '")';
                    // thisObject.dom.querySelector(".target").style.backgroundSize = 'cover';

                    let ipAddress = realityServer.states.ipAdress.interfaces[realityServer.states.ipAdress.activeInterface];
                    // add Image for Target
                    if (thisObject.targetsExist.jpgExists) {
                        thisObject.dom.querySelector('.objectTargetIcon').src = 'http://' + ipAddress + ':' + realityServer.states.serverPort + '/obj/' + thisObject.name + '/target/target.jpg';
                    } else if (thisObject.type === 'region') {
                        thisObject.dom.querySelector('.objectTargetIcon').src = '../libraries/gui/resources/region.svg';
                    } else if (thisObject.isAnchor) {
                        thisObject.dom.querySelector('.objectTargetIcon').src = '../libraries/gui/resources/anchor.svg';
                    }
                    thisObject.dom.querySelector('.target').innerText = 'Edit Target';

                } else {
                    realityServer.switchClass(thisObject.dom.querySelector('.target'), 'green', 'yellow');
                    realityServer.switchClass(thisObject.dom.querySelector('.target'), 'one', 'targetWidthMedium');

                    setTooltipTextForElement(thisObject.dom.querySelector('.target'),
                        'Add a target file or activate a world object to finish setting up this object');

                    // if (thisObject.dom.querySelector('.objectIcon')) {
                    thisObject.dom.querySelector('.objectIcon').remove(); //.parentElement.removeChild(thisObject.dom.querySelector('.objectIcon'));
                    // }
                    // if (thisObject.dom.querySelector('.objectIconSpace')) {
                    //     thisObject.dom.querySelector('.objectIconSpace').remove(); //.parentElement.removeChild(thisObject.dom.querySelector('.objectIconSpace'));
                    // }
                    // realityServer.switchClass(thisObject.dom.querySelector(".name"), "oneAndHalf", "two");
                    // thisObject.dom.querySelector('.spaceAfterTarget').style.width = '5px';
                }

                if (thisObject.active) {
                    realityServer.switchClass(thisObject.dom.querySelector('.active'), 'yellow', 'green');
                    thisObject.dom.querySelector('.active').innerText = 'On';
                } else {
                    realityServer.switchClass(thisObject.dom.querySelector('.active'), 'green', 'yellow');
                    thisObject.dom.querySelector('.active').innerText = 'Off';
                }

                if (thisObject.initialized) {
                    if (Object.keys(thisObject.frames).length > 0) {
                        thisObject.dom.querySelector('.triangle').classList.remove('hidden');
                        thisObject.dom.querySelector('.triangle').classList.remove('inactive');
                        thisObject.dom.querySelector('.triangle').classList.add('clickAble');
                        addExpandedToggle(thisObject.dom.querySelector('.triangle'), objectKey, thisObject);

                        if (thisObject.isExpanded) {
                            thisObject.dom.querySelector('.triangle').classList.add('triangleDown');
                        } else {
                            thisObject.dom.querySelector('.triangle').classList.remove('triangleDown');
                        }
                    } else {
                        thisObject.dom.querySelector('.triangle').classList.add('hidden');
                    }
                } else {
                    thisObject.dom.querySelector('.triangle').classList.add('hidden');
                }

                thisObject.dom.querySelector('.downloadIcon').src = realityServer.downloadImage.src;

                if (thisObject.zone === '' || !thisObject.zone) {
                    thisObject.dom.querySelector('.zone').innerText = 'Zone';
                } else {
                    thisObject.dom.querySelector('.zone').innerText = thisObject.zone;
                }

                if (thisObject.visualization === 'AR') thisObject.visualization = 'ar';
                if (thisObject.visualization === 'ar') {
                    thisObject.dom.querySelector('.visualization').innerText = 'AR';
                } else if (thisObject.visualization === 'screen') {
                    thisObject.dom.querySelector('.visualization').innerText = 'Screen';
                    realityServer.switchClass(thisObject.dom.querySelector('.visualization'), 'blue', 'purple');
                    realityServer.switchClass(thisObject.dom.querySelector('.addFrame'), 'blue', 'purple');
                    realityServer.switchClass(thisObject.dom.querySelector('.download'), 'blue', 'purple');

                    // TODO: ben fade it out if there isn't a connected screen port
                    // add a tool-tip that explains what screen-mode does
                    if (thisObject.screenPort) {
                        thisObject.dom.querySelector('.visualization').classList.remove('inactive');
                    } else {
                        thisObject.dom.querySelector('.visualization').classList.add('inactive');
                    }

                    thisObject.dom.querySelector('.downloadIcon').src = realityServer.downloadImageP.src;
                }

                thisObject.dom.querySelector('.name').innerText = thisObject.name;
                if (!thisItem2) {
                    this.getDomContents().appendChild(thisObject.dom);
                }

                if (thisItem2 === objectKey) {
                    let thisItem = 'object' + objectKey;
                    console.log(thisItem);
                    let thisDom = document.getElementById(thisItem);
                    console.log(thisDom);
                    thisDom.before(thisObject.dom);
                    thisDom.remove();
                }

                if (thisObject.visualization === 'screen' && thisObject.active && thisObject.isExpanded) {
                    let thisFullScreen = document.getElementById('fullScreenId').content.cloneNode(true);
                    thisFullScreen.querySelector('.fullscreen').id = 'fullscreen' + objectKey;
                    thisFullScreen.querySelector('#fullscreen' + objectKey).dataset.objectName = thisObject.name;
                    thisFullScreen.querySelector('.fullscreen').classList.add('purple');
                    thisFullScreen.querySelector('.fullscreen').classList.remove('blue');

                    let ipAddress = realityServer.states.ipAdress.interfaces[realityServer.states.ipAdress.activeInterface];

                    setTooltipTextForElement(thisFullScreen.querySelector('.fullscreen'),
                        'Open the screen HMI configured by the vuforia-spatial-screens-addon.' +
                        ' (For this object: http://' + ipAddress + ': ' + thisObject.screenPort + ')');

                    if (!thisObject.screenPort) {
                        thisFullScreen.querySelector('.fullscreen').classList.remove('purple');
                        thisFullScreen.querySelector('.fullscreen').classList.add('blue');
                        thisFullScreen.querySelector('.fullscreen').innerText = 'VIEW TARGET IMAGE';

                        setTooltipTextForElement(thisFullScreen.querySelector('.fullscreen'),
                            'Open the target image in the browser. If you configure this object with the' +
                            ' vuforia-spatial-screens-addon, this button will change to open up the screen HMI.');
                    }
                    if (!thisItem2) {
                        this.getDomContents().appendChild(thisFullScreen);
                    }
                    document.getElementById('fullscreen' + objectKey).addEventListener('click', realityServer.gotClick, false);
                }

            }

            for (let frameKey in this.objects[objectKey].frames) {
                if (!this.objects[objectKey].isExpanded) {
                    continue;
                }

                let thisFrame = this.objects[objectKey].frames[frameKey];

                // use the right template for a local frame or a global frame
                let className = thisFrame.location === 'global' ? 'globalFrame' : 'frame';
                thisFrame.dom = this.templates[className].content.cloneNode(true);

                thisFrame.dom.querySelector('.' + className).id = 'frame' + objectKey + frameKey;

                // clicking on the "Content" button opens the html for that frame
                function addLinkToContent(buttonDiv, frameType) { // eslint-disable-line no-inner-declarations
                    buttonDiv.addEventListener('click', function () { // put in a closure so it references don't mutate
                        let ipAddress = realityServer.states.ipAdress.interfaces[realityServer.states.ipAdress.activeInterface];
                        window.open('http://' + ipAddress + ':' + realityServer.states.serverPort + '/frames/' + frameType + '/index.html', '_blank'); // opens in new tab (instead of window.location.href = )
                    });
                }

                if (thisFrame.location === 'global') {
                    addLinkToContent(thisFrame.dom.querySelector('.content'), thisFrame.src);

                    if (thisObject.isWorldObject && thisObject.sharingEnabled) {
                        // thisFrame.dom.querySelector('.attachedTo').classList.remove('hidden');
                        realityServer.switchClass(thisFrame.dom.querySelector('.attachedTo'), 'hidden', 'inactive');
                        // TODO: in future, make active/visible only if it is attached to another object, and change the text to show that object's name
                    }

                    thisFrame.dom.querySelector('.name').innerText = thisFrame.src;

                    setTooltipTextForElement(thisFrame.dom.querySelector('.name'),
                        'This is a "pocket" tool added to this object from a Toolbox app\'s pocket menu. It can be' +
                        ' added, deleted, or moved to another object using the Toolbox app.');

                    setTooltipTextForElement(thisFrame.dom.querySelector('.content'),
                        'Preview this tool in your web browser. All tools are just HTML pages, but some might not load' +
                        ' properly in the browser if they have AR-specific capabilities.');

                    setTooltipTextForElement(thisFrame.dom.querySelector('.remove'),
                        'Delete this tool from the object. You can always add another from your app\'s pocket, since' +
                        ' this is a pocket tool.');

                } else {
                    thisFrame.dom.querySelector('.name').innerText = thisFrame.name;

                    setTooltipTextForElement(thisFrame.dom.querySelector('.name'),
                        'This is a "custom" tool specifically added to this object. You will see it in the toolbox if' +
                        ' you look at this object\'s target.');

                    setTooltipTextForElement(thisFrame.dom.querySelector('.content'),
                        'View a list of this custom tool\'s content files. In most cases, these can be edited in your' +
                        ' spatialToolbox/objectName/toolName directory.');

                    setTooltipTextForElement(thisFrame.dom.querySelector('.reset'),
                        'Reset the position of this tool to be centered on the object\'s target. Useful if you misplace' +
                        ' the tool.');

                    setTooltipTextForElement(thisFrame.dom.querySelector('.remove'),
                        'Permanently delete this tool from the object and all data associated with it. This is a' +
                        ' custom tool so think twice if you\'ve modified its HTML.');

                }

                if (thisObject.visualization === 'screen' && thisFrame.location !== 'global') {
                    realityServer.switchClass(thisFrame.dom.querySelector('.reset'), 'blue', 'purple');
                    realityServer.switchClass(thisFrame.dom.querySelector('.hardware'), 'blue', 'purple');
                }

                // check if items are active
                if (thisObject.initialized && thisObject.active) {
                    realityServer.changeActiveState(thisFrame.dom, true, objectKey, frameKey);
                } else {
                    realityServer.changeActiveState(thisFrame.dom, false, objectKey, frameKey);
                }

                if (!thisItem2) {
                    this.getDomContents().appendChild(thisFrame.dom, true);
                }
            }
        }

    }.bind(this));

    if (thisItem2 === '') {
        this.getDomContents().appendChild(this.templates['end'].content.cloneNode(true));
    }

    if (objectKeyToHighlight) {
        highlightObject(objectKeyToHighlight, true);
    }

    console.log(realityServer.objects);

    setTooltipTextForManageObjects();
};

realityServer.updateManageFrames = function () {
    console.log('updateManageFrames');

    this.getDomContents().appendChild(this.templates['startFrames'].content.cloneNode(true));

    /////// Tutorial ///////
    document.getElementById('globalFramesDescription').appendChild(this.templates['globalFramesTutorial'].content.cloneNode(true));

    let tutorialStateNumber = 0;

    if (Object.keys(realityServer.globalFrames).length === 0) { // if there are no frames
        tutorialStateNumber = 1;
    } else {
        tutorialStateNumber = 2;
    }
    if (tutorialStateNumber !== 1) {
        document.getElementById('noFramesDescription').classList.add('hiddenTab');
    }
    if (tutorialStateNumber !== 2) {
        document.getElementById('foundFramesDescription').classList.add('hiddenTab');
    }
    updateVisibilityOfTutorials();
    /////// ^ Tutorial ^ ///////

    for (let frameKey in this.globalFrames) {

        let frameInfo = this.globalFrames[frameKey];
        frameInfo.dom = this.templates['frameManager'].content.cloneNode(true);
        console.log('frameInfo: ', frameInfo);

        function addLinkToContent(buttonDiv, frameType) { // eslint-disable-line no-inner-declarations
            buttonDiv.addEventListener('click', function () {
                let ipAddress = realityServer.states.ipAdress.interfaces[realityServer.states.ipAdress.activeInterface];
                // window.location.href = 'http://' + ipAddress + ':8080/frames/active/' + frameType + '/index.html';
                window.open('http://' + ipAddress + ':' + realityServer.states.serverPort + '/frames/' + frameType + '/index.html', '_blank');
            });
        }

        let contentButton = frameInfo.dom.querySelector('.content');
        addLinkToContent(contentButton, frameKey);

        let ipAddress = realityServer.states.ipAdress.interfaces[realityServer.states.ipAdress.activeInterface];
        frameInfo.dom.querySelector('.frameIcon').src = 'http://' + ipAddress + ':' + realityServer.states.serverPort + '/frames/' + frameKey + '/icon.gif';

        addZipDownload(frameInfo.dom.querySelector('.download'), frameKey);

        frameInfo.dom.querySelector('.name').innerText = frameKey;
        if (!frameInfo.metadata.enabled) {
            frameInfo.dom.querySelector('.frameIcon').classList.add('inactive');
            frameInfo.dom.querySelector('.name').classList.add('inactive');
            frameInfo.dom.querySelector('.content').classList.add('inactive');
            frameInfo.dom.querySelector('.download').classList.add('inactive');
        }

        let activeToggleButton = frameInfo.dom.querySelector('.active');

        if (frameInfo.metadata.enabled) {
            realityServer.switchClass(activeToggleButton, 'yellow', 'green');
            activeToggleButton.innerText = 'On';

            setTooltipTextForElement(frameInfo.dom.querySelector('.active'),
                'This tool is currently active and will be visible in the pocket of Spatial Toolbox apps in this' +
                ' network while pointing at objects on this server');
        } else {
            realityServer.switchClass(activeToggleButton, 'green', 'yellow');
            activeToggleButton.innerText = 'Off';

            setTooltipTextForElement(frameInfo.dom.querySelector('.active'),
                'This tool is inactive and won\'t show up in the pocket');
        }

        addFrameEnabledToggle(activeToggleButton, frameKey, frameInfo); // create inside closure so interfaceInfo doesn't change after definition

        setTooltipTextForElement(frameInfo.dom.querySelector('.content'),
            'Preview this tool in your web browser. All tools are just HTML pages,' +
            ' but some might not load properly in the browser if they have AR-specific capabilities.');

        setTooltipTextForElement(frameInfo.dom.querySelector('.download'),
            'Download a .zip backup of this tool');

        this.getDomContents().appendChild(frameInfo.dom, true);
    }
};

realityServer.selectHardwareInterfaceSettings = function (interfaceName) {
    let ipAddress = realityServer.states.ipAdress.interfaces[realityServer.states.ipAdress.activeInterface];
    let pathToConfig = 'http://' + ipAddress + ':' + realityServer.states.serverPort + '/hardwareInterface/' + interfaceName + '/config.html';
    let configFrame = document.querySelector('.configFrame');
    configFrame.src = pathToConfig;

    let selectedButton = document.getElementById('hardwareInterface' + interfaceName);
    if (selectedButton) {
        selectedButton.classList.add('selectedButton');
    }
};

realityServer.updateManageHardwareInterfaces = function () {
    console.log('updateManageHardwareInterfaces');

    /////// Tutorial ///////
    this.getDomContents().appendChild(this.templates['startHardwareInterfaces'].content.cloneNode(true));
    document.getElementById('hardwareInterfacesDescription').appendChild(this.templates['hardwareInterfacesTutorial'].content.cloneNode(true));
    updateVisibilityOfTutorials();
    /////// ^ Tutorial ^ ///////

    let columnContainer = document.createElement('div');
    columnContainer.classList.add('row', 'group');
    this.getDomContents().appendChild(columnContainer);

    let firstColumn = document.createElement('div');
    firstColumn.classList.add('column', 'columnFortyPercent');
    columnContainer.appendChild(firstColumn);

    let secondColumn = document.createElement('div');
    secondColumn.classList.add('column', 'columnSixtyPercent');
    columnContainer.appendChild(secondColumn);

    let sortedInterfaceNames = realityServer.sortHardwareInterfaces(Object.keys(this.hardwareInterfaces));

    // for (let interfaceName in sortedInterfaceNames) {
    //for (let interfaceName in this.hardwareInterfaces) {
    for (let i = 0; i < sortedInterfaceNames.length; i++) {
        let interfaceName = sortedInterfaceNames[i];
        let interfaceInfo = this.hardwareInterfaces[interfaceName];

        if (interfaceInfo.configurable === false) { // certain hardware interfaces cannot be turned on and off through the frontend
            // activeToggleButton.classList.add('inactive');
            continue;
        }

        interfaceInfo.dom = this.templates['hardwareInterface'].content.cloneNode(true);
        // console.log('interfaceInfo: ', interfaceInfo);

        interfaceInfo.dom.querySelector('.name').querySelector('.nameText').innerText = interfaceName;
        interfaceInfo.dom.querySelector('.name').id = 'hardwareInterface' + interfaceName;
        if (!interfaceInfo.enabled) {
            interfaceInfo.dom.querySelector('.name').classList.add('inactive');
        }

        if (typeof interfaceInfo.settings !== 'undefined') {

            interfaceInfo.dom.querySelector('.gear').classList.remove('hidden');
            interfaceInfo.dom.querySelector('.gear').classList.add('clickAble');

            // interfaceInfo.dom.querySelector('.name').classList.add('clickAble');
            interfaceInfo.dom.querySelector('.gear').addEventListener('click', function () {
                realityServer.selectHardwareInterfaceSettings(interfaceName);
            });

            setTooltipTextForElement(interfaceInfo.dom.querySelector('.gear'),
                'Click this to configure the settings of the ' + interfaceName + ' interface');
        }

        let activeToggleButton = interfaceInfo.dom.querySelector('.active');
        activeToggleButton.classList.add('clickAble');

        if (interfaceInfo.enabled) {
            realityServer.switchClass(activeToggleButton, 'yellow', 'green');
            activeToggleButton.innerText = 'On';

            setTooltipTextForElement(interfaceInfo.dom.querySelector('.active'),
                'The ' + interfaceName + ' interface is currently enabled. To disable it, click this and then' +
                ' restart your server and refresh this page.');

        } else {
            realityServer.switchClass(activeToggleButton, 'green', 'yellow');
            activeToggleButton.innerText = 'Off';

            setTooltipTextForElement(interfaceInfo.dom.querySelector('.active'),
                'The ' + interfaceName + ' interface is currently disabled. To enable it, click this and then' +
                ' restart your server and refresh this page. When you do so, you can then configure it here.');
        }

        function addEnabledToggle(button, hardwareInterfaceName, hardwareInterfaceInfo) { // eslint-disable-line no-inner-declarations
            button.addEventListener('click', function () {
                if (hardwareInterfaceInfo.enabled) {
                    realityServer.sendRequest('/hardwareInterface/' + hardwareInterfaceName + '/disable/', 'GET', function (state) {
                        if (state === 'ok') {
                            hardwareInterfaceInfo.enabled = false;
                        }
                        realityServer.update();
                        showSuccessNotification('Restart your server to ensure the ' + hardwareInterfaceName + ' interface' +
                            ' is fully disabled', 5000);
                    });
                } else {
                    realityServer.sendRequest('/hardwareInterface/' + hardwareInterfaceName + '/enable/', 'GET', function (state) {
                        if (state === 'ok') {
                            hardwareInterfaceInfo.enabled = true;
                        }
                        realityServer.update();
                        showSuccessNotification('Restart your server to ensure the ' + hardwareInterfaceName + ' interface' +
                            ' is fully enabled', 5000);
                    });
                }
            });
        }

        addEnabledToggle(activeToggleButton, interfaceName, interfaceInfo); // create inside closure so interfaceInfo doesn't change after definition

        firstColumn.appendChild(interfaceInfo.dom, true);
    }

    let configFrame = document.createElement('iframe');
    configFrame.classList.add('configFrame');
    configFrame.addEventListener('pointerenter', function(e) {
        tooltipDiv.style.display = 'none'; // hide the tooltip when it enters the iframe because we lose capture of it
        lastMovedTimestamp = Date.now();
    });
    secondColumn.appendChild(configFrame, true);
};

realityServer.updateCommonContents = function (thisItem2) {

    if (thisItem2 === '') {
        realityServer.getCommonContents().innerHTML = '';

        let thisNode = this.templates['networkInterfaces'].content.cloneNode(true);

        for (let key in realityServer.states.ipAdress.interfaces) {
            console.log(key);
            let thisSubObject = this.templates['networkInterfacelets'].content.cloneNode(true);
            const netInterfaceElt = thisSubObject.querySelector('.netInterface');
            netInterfaceElt.innerText = key;
            netInterfaceElt.setAttribute('title', key);

            if (key === realityServer.states.ipAdress.activeInterface) {
                realityServer.switchClass(netInterfaceElt, 'yellow', 'green');
            } else {
                realityServer.switchClass(netInterfaceElt, 'green', 'yellow');
            }


            netInterfaceElt.addEventListener('click', realityServer.gotClick, false);

            thisNode.getElementById('subNetInterface').appendChild(thisSubObject);
        }

        console.log('thisNode', JSON.stringify(thisNode));

        this.getCommonContents().appendChild(thisNode);

        this.getCommonContents().appendChild(this.templates['tabs'].content.cloneNode(true));

        // tabName is manageObjects, manageFrames, or manageHardwareInterfaces
        function addTabListener(tabName) { // eslint-disable-line no-inner-declarations
            realityServer.getCommonContents().querySelector('#' + tabName).addEventListener('click', function () {
                if (realityServer.selectedTab === tabName && tabName === 'manageObjects') {
                    // refresh page if click on same tab
                    window.location.reload();
                } else {
                    realityServer.selectedTab = tabName;
                    realityServer.update();

                    // handle side effects for each button separately here
                    if (tabName === 'manageHardwareInterfaces') {
                        realityServer.selectHardwareInterfaceSettings(defaultHardwareInterfaceSelected);
                    }
                }
            });
        }

        addTabListener('manageObjects');
        addTabListener('manageFrames');
        addTabListener('manageHardwareInterfaces');

        setTooltipTextForElement(realityServer.getCommonContents().querySelector('#manageObjects'),
            'Set up new objects on this server and configure existing objects');

        setTooltipTextForElement(realityServer.getCommonContents().querySelector('#manageFrames'),
            'View all pocket tools that this server supports and select which ones Toolbox apps will see in' +
            ' their pocket when pointing at objects on this server');

        setTooltipTextForElement(realityServer.getCommonContents().querySelector('#manageHardwareInterfaces'),
            'View all interfaces provided by this server\'s add-ons and configure their properties to enable your AR' +
            ' content to interact with other systems and devices');
    }
};

realityServer.update = function (thisItem2) {
    if (!thisItem2) thisItem2 = '';

    // update the header
    document.getElementById('subtitle').innerText = 'Version: ' + realityServer.states.version + ' - Server IP: ' +
        realityServer.states.ipAdress.interfaces[realityServer.states.ipAdress.activeInterface] + ':' + realityServer.states.serverPort;

    // update the tab bar that is common to all
    realityServer.updateCommonContents(thisItem2);

    // switch to the correct tab
    realityServer.hideAllTabs();
    realityServer.getDomContents().classList.add('selectedTab');
    realityServer.getDomContents().innerHTML = '';

    // populate the screen with the correct tab's contents
    if (this.selectedTab === 'manageObjects') {
        this.updateManageObjects(thisItem2);

    } else if (this.selectedTab === 'manageFrames') {
        this.updateManageFrames();

    } else if (this.selectedTab === 'manageHardwareInterfaces') {
        this.updateManageHardwareInterfaces();
    }

    document.getElementById(this.selectedTab).classList.add('selectedButton');

    // this.updateHelp();
};

realityServer.printFiles = function (item) {
    let returnList = {
        files: {},
        folders: {}
    };

    for (let i = 0; i < item.children.length; i++) {
        let thisItem = item.children[i];
        if (thisItem.type === 'file') {
            returnList.files[thisItem.name] = {
                path: thisItem.path,
                extension: thisItem.extension
            };
        } else if (thisItem.type === 'directory') {
            returnList.folders[thisItem.name] = {
                path: thisItem.path,
                link: thisItem
            };
        }
    }
    return returnList;
};

function showGenerateXml(parentElement, objectKey) {
    let visualFeedback = parentElement;
    let generateXmlButton = visualFeedback.querySelector('.generateXml');
    console.log('generateXmlButton', generateXmlButton);
    generateXmlButton.addEventListener('click', function () {
        if (!visualFeedback.querySelector('.textEntry')) {
            let textEntryElements = document.getElementById('textEntryTargetSize').content.cloneNode(true);

            textEntryElements.querySelector('.setSizeButton').addEventListener('click', function () {

                let newWidth = parseFloat(this.parentElement.querySelector('.sizeWidth').innerText);
                let newHeight = parseFloat(this.parentElement.querySelector('.sizeHeight').innerText);

                if (!isNaN(newWidth) && typeof newWidth === 'number' && newWidth > 0 &&
                    !isNaN(newHeight) && typeof newHeight === 'number' && newHeight > 0) {

                    // let targetName = realityServer.objects[objectKey];
                    realityServer.sendRequest('/object/' + objectKey + '/generateXml/', 'POST', function (state) {
                        if (state === 'ok') {
                            console.log('successfully generated xml from width ' + newWidth + ' and height ' + newHeight);
                            let notificationText = 'Successfully set ' + objectKey + ' target size to ' + newWidth + 'm wide by ' + newHeight + 'm tall';
                            showSuccessNotification(notificationText, 8000);
                        }
                        let removeNode = visualFeedback.querySelector('.textEntry');
                        realityServer.removeAnimated(removeNode);
                    }, 'name=' + realityServer.objects[objectKey].name + '&width=' + newWidth + '&height=' + newHeight);

                } else {
                    let notificationText = 'Please enter a positive number for width and height';
                    showErrorNotification(notificationText, 3000);
                }

            });

            visualFeedback.appendChild(textEntryElements);
        } else {
            let removeNode = visualFeedback.querySelector('.textEntry');
            realityServer.removeAnimated(removeNode);
        }
    });
}

realityServer.spatialButtonState = {
    whereIs: false,
    howFarIs: false,
    whereWas: false,
    velocityOf: false
};

realityServer.gotClick = function (event) {
    let thisEventObject = event.currentTarget;
    let buttonClassList = thisEventObject.classList;
    let objectKey = thisEventObject.getAttribute('objectid');
    let frameKey = thisEventObject.getAttribute('frameid');

    let thisObject = realityServer.objects[objectKey];

    if (buttonClassList.contains('download')) {
        window.location.href = '/object/' + thisObject.name + '/zipBackup/';
    }


    /**
     *  SPATIAL QUESTIONS ..
     */


    function buttonSwitch(name) {

        if (buttonClassList.contains(name)) {
            if (realityServer.spatialButtonState[name]) {
                let element = document.getElementById(name);
                element.classList.remove('selectedButton');

                document.querySelectorAll('.name').forEach(function(item) {
                    let objectID = item.getAttribute('objectid');
                    let toolID = item.getAttribute('frameid');
                    let thisKey = objectID;
                    if (toolID) thisKey = toolID;
                    if (spatialLocator[name][thisKey]) delete spatialLocator[name][thisKey];
                });


                realityServer.spatialButtonState[name] = false;
            } else {
                let element = document.getElementById(name);
                element.classList.add('selectedButton');
                realityServer.spatialButtonState[name] = true;
            }
        }
    }

    if (buttonClassList.contains('rec')) {
        if (recordState) {
            recordState = false;
            let element = document.getElementById('rec');
            element.classList.remove('white');
            element.classList.add('red');
            realityServer.sendRequest('/webUI/REC/START', 'POST', function(_state) {
            }, '');
        } else {
            recordState = true;
            let element = document.getElementById('rec');
            element.classList.remove('red');
            element.classList.add('white');
            realityServer.sendRequest('/webUI/REC/STOP', 'POST', function(_state) {
            }, '');
        }
    }

    buttonSwitch('whereIs');
    buttonSwitch('whereWas');
    buttonSwitch('howFarIs');
    buttonSwitch('velocityOf');

    if (realityServer.spatialButtonState.howFarIs || realityServer.spatialButtonState.whereIs || realityServer.spatialButtonState.whereWas || realityServer.spatialButtonState.velocityOf) {
        focusOnNames();
        if (buttonClassList.contains('name')) {
            if (thisEventObject.classList.contains('selectedButton')) {
                thisEventObject.classList.remove('selectedButton');
            } else {
                thisEventObject.classList.add('selectedButton');
                console.log(objectKey, frameKey, '');
            }
        }


        let allItems = document.querySelectorAll('.name');
        allItems.forEach(function(item) {

            let objectID = item.getAttribute('objectid');
            if (!objectID) objectID = '';

            console.log(item);
            let toolID = item.getAttribute('frameid');
            if (!toolID) toolID = '';

            let nodeID = item.getAttribute('nodeid');
            if (!nodeID) nodeID = '';

            let thisKey = objectID;
            if (toolID) thisKey = toolID;

            if (item.classList.contains('selectedButton')) {
                console.log(objectKey, frameKey, '');

                if (realityServer.spatialButtonState.whereIs)
                    spatialLocator.whereIs[thisKey] = new SpatialLocator(objectID, toolID, '');

                if (realityServer.spatialButtonState.whereWas)
                    spatialLocator.whereWas[thisKey] = new SpatialLocator(objectID, toolID, '');

                if (realityServer.spatialButtonState.howFarIs)
                    spatialLocator.howFarIs[thisKey] = new SpatialLocator(objectID, toolID, '');

                if (realityServer.spatialButtonState.velocityOf)
                    spatialLocator.velocityOf[thisKey] = new SpatialLocator(objectID, toolID, '');

            } else {
                if (spatialLocator.whereIs[thisKey]) delete spatialLocator.whereIs[thisKey];
                if (spatialLocator.whereWas[thisKey]) delete spatialLocator.whereWas[thisKey];
                if (spatialLocator.howFarIs[thisKey]) delete spatialLocator.howFarIs[thisKey];
                if (spatialLocator.velocityOf[thisKey]) delete spatialLocator.velocityOf[thisKey];
            }
        });

        if (buttonClassList.contains('name')) {
            sendSpatialState();
        }

        if (buttonClassList.contains('howFarIs') || (buttonClassList.contains('whereWas')) || (buttonClassList.contains('velocityOf')) || (buttonClassList.contains('whereIs'))) {
            sendSpatialState();
        }
        return;
    } else {
        unFocusNames();
    }

    function sendSpatialState() {
        let messageBody = 'locator=' + JSON.stringify(spatialLocator);
        realityServer.sendRequest('/webUI/spatial/locator', 'POST', function(_state) {
        }, messageBody);
    }

    function focusOnNames() {

        let allItems = document.querySelectorAll('.frame, .globalFrame, .worldObject, .object');

        allItems.forEach(function(item) {
            item.querySelectorAll('div').forEach(function(button) {
                realityServer.switchClass(button, 'clickAble', 'inactive');
            });
            item.querySelectorAll('.name').forEach(function(name) {
                realityServer.switchClass(name, 'inactive', 'clickAble');
            });
        });
    }

    function unFocusNames() {

        let allItems = document.querySelectorAll('.frame, .globalFrame, .worldObject, .object');

        allItems.forEach(function(item) {
            item.querySelectorAll('div').forEach(function(button) {
                realityServer.switchClass(button, 'inactive', 'clickAble');
                button.classList.remove('selectedButton');
            });
        });
    }


    /**
     *  TARGET..
     */
    if (buttonClassList.contains('target')) {

        let referenceNode = document.getElementById('object' + objectKey);

        // create a dropdown
        if (realityServer.dropZoneId !== 'targetDropZone' + objectKey) {
            let elementList = document.querySelectorAll('.dropZoneElement');
            for (let i = 0; i < elementList.length; ++i) {
                realityServer.removeAnimated(elementList[i], 'expandcollapseTarget', 'expandTarget', 'collapseTarget');
            }

            let newNode = document.getElementById('targetId').content.cloneNode(true);
            newNode.querySelector('.dropZoneElement').id = 'targetDropZone' + objectKey;
            newNode.querySelector('.imagegen-button').dataset.objectName = thisObject.name;
            newNode.querySelector('.imageremove-button').dataset.objectName = thisObject.name;

            // add help text

            setTooltipTextForElement(newNode.querySelector('.name'),
                'Each object has a unique ID. If generating a target using a Vuforia application, make sure to' +
                ' name it exactly this. If just uploading a .jpg, the name of the file doesn\'t matter.');

            setTooltipTextForElement(newNode.querySelector('.fileinput-button'),
                'Select files to upload. Supported formats: .jpg, .dat, .xml, .zip');

            setTooltipTextForElement(newNode.querySelector('.imagegen-button'),
                'Click here to automatically generate an image target for this object instead of uploading one');

            setTooltipTextForElement(newNode.querySelector('.imageremove-button'),
                'Click here to delete all target data previously added to this object. Cannot be undone.');

            if (!thisObject.targetName) {
                // generate a random UUID if not yet initialized with a persistent UUID
                if (objectKey === thisObject.name) {
                    thisObject.targetName = thisObject.name + realityServer.uuidTime();
                }
            }

            if (objectKey !== thisObject.name) {
                thisObject.targetName = objectKey;
            }

            newNode.querySelector('.name').innerText = thisObject.targetName;
            referenceNode.after(newNode);

            let visualFeedback = document.getElementById('targetDropZone' + objectKey).querySelector('.dropZoneFeedback');
            if (visualFeedback && thisObject && thisObject.targetsExist) {
                if (thisObject.targetsExist.datExists) {
                    realityServer.switchClass(visualFeedback.querySelector('.hasDat'), 'red', 'green');
                    visualFeedback.querySelector('.hasDat').innerText = 'Has .dat';
                } else if (thisObject.targetsExist.jpgExists) {
                    realityServer.switchClass(visualFeedback.querySelector('.hasDat'), 'red', 'white');
                    visualFeedback.querySelector('.hasDat').innerText = '.dat optional';

                    setTooltipTextForElement(visualFeedback.querySelector('.hasDat'),
                        'You don\'t need to upload a .dat file for this object since you gave it a .jpg, but adding' +
                        ' one (generated from Vuforia developer tools) may improve tracking stability');
                }
                if (thisObject.targetsExist.xmlExists) {
                    realityServer.switchClass(visualFeedback.querySelector('.hasXml'), 'red', 'green');
                    visualFeedback.querySelector('.hasXml').innerText = 'Has .xml';
                }
                if (thisObject.targetsExist.jpgExists) {
                    realityServer.switchClass(visualFeedback.querySelector('.hasJpg'), 'red', 'green');
                    visualFeedback.querySelector('.hasJpg').innerText = 'Has .jpg';
                } else if (thisObject.targetsExist.datExists) {
                    realityServer.switchClass(visualFeedback.querySelector('.hasJpg'), 'red', 'yellow');
                    setTooltipTextForElement(visualFeedback.querySelector('.hasJpg'),
                        'You already uploaded a .dat file to be the target data, but you should still upload a .jpg' +
                        ' to act as this object\'s icon');
                }

                if (!thisObject.targetsExist.jpgExists && !thisObject.targetsExist.datExists) {
                    realityServer.switchClass(visualFeedback.querySelector('.generateXml'), 'green', 'hidden');
                } else {
                    realityServer.switchClass(visualFeedback.querySelector('.generateXml'), 'hidden', 'green');

                    setTooltipTextForElement(visualFeedback.querySelector('.generateXml'),
                        'You must accurately enter the width and height (in meters) for AR content to scale' +
                        ' correctly when attached to this object. Defaults to 0.3 meters (12 inches).');
                    showGenerateXml(visualFeedback, objectKey);
                }
            }

            realityServer.dropZoneId = 'targetDropZone' + objectKey;

            let previewNode = document.querySelector('#templateZone');
            let previewTemplate = previewNode.parentNode.innerHTML;
            //previewNode.parentNode.removeChild(previewNode);
            realityServer.myTargetDropzone = {};
            realityServer.myTargetDropzone = new Dropzone(document.getElementById('targetDropZone' + objectKey), {
                url: '/content/' + thisObject.name,
                autoProcessQueue: true,
                headers: {'type': 'targetUpload'},
                parallelUploads: 20,
                createImageThumbnails: false,
                previewTemplate: previewTemplate,
                autoQueue: true,
                clickable: '.fileinput-button'
            });

            realityServer.myTargetDropzone.on('addedfile', function (_file) {
            });

            realityServer.myTargetDropzone.on('drop', function () {
                realityServer.myTargetDropzone.enqueueFiles(realityServer.myTargetDropzone.getFilesWithStatus(Dropzone.ADDED));
            });

            realityServer.myTargetDropzone.on('totaluploadprogress', function (progress) {
                let maxWidth = 514;
                if (document.querySelector('.dropZoneContent')) {
                    maxWidth = document.querySelector('.dropZoneContent').getClientRects()[0].width;
                }
                realityServer.getDomContents().querySelector('.dropZoneContentBackground').style.width = (maxWidth / 100 * progress) + 'px';
            });

            realityServer.myTargetDropzone.on('sending', function () {
                //  document.querySelector("#total-progress").style.opacity = "1";
            });

            realityServer.myTargetDropzone.on('queuecomplete', function () {
            });

            realityServer.myTargetDropzone.on('success', function (file, responseText) {
                console.log(responseText);

                let notificationText = 'Successfully uploaded ' + file.name + ' to the object' +
                    ' named ' + responseText.name;
                showSuccessNotification(notificationText, 5000);

                thisObject = realityServer.objects[objectKey];

                realityServer.getDomContents().querySelector('.dropZoneContentBackground').style.width = '0px';

                if (typeof responseText.initialized !== 'undefined') {

                    if (responseText.targetExists) { // this is from the ZIP upload

                        if (realityServer.objects[responseText.name]) {
                            realityServer.objects[responseText.id] = realityServer.objects[responseText.name];
                            let thisObject = document.getElementById('object' + responseText.name);
                            thisObject.id = 'object' + responseText.id;
                            let objectList = thisObject.querySelectorAll('button');

                            for (let i = 0; i < objectList.length; i++) {
                                // TODO: don't assign same id to every button (not sure about side effects of removing, so assigned to github issue #19)
                                objectList[i].id = responseText.id;
                            }

                            delete realityServer.objects[responseText.name];
                            // realityServer.objects = realityServer.sortObject(realityServer.objects);
                        }

                        if (responseText.jpgExists && responseText.targetExists) {
                            realityServer.objects[responseText.id].initialized = true;
                            realityServer.objects[responseText.id].active = true;
                            realityServer.switchClass(document.getElementById('object' + responseText.id).querySelector('.target'), 'yellow', 'green');
                            realityServer.switchClass(document.getElementById('object' + responseText.id).querySelector('.target'), 'targetWidthMedium', 'one');
                        }
                        window.location.reload();
                        realityServer.update();

                    } else {
                        // update initialized - except world objects are always initialized true
                        thisObject.initialized = responseText.initialized || thisObject.isWorldObject;

                        // update targetsExist
                        thisObject.targetsExist.jpgExists = responseText.jpgExists;
                        thisObject.targetsExist.xmlExists = responseText.xmlExists;
                        thisObject.targetsExist.datExists = responseText.datExists;

                        let visualFeedback = document.getElementById('targetDropZone' + objectKey).querySelector('.dropZoneFeedback');
                        if (visualFeedback) {
                            if (responseText.jpgExists) {
                                realityServer.switchClass(visualFeedback.querySelector('.hasJpg'), 'red', 'hidden');
                            } else {
                                let newColor = responseText.datExists ? 'yellow' : 'red';
                                realityServer.switchClass(visualFeedback.querySelector('.hasJpg'), 'hidden', newColor);
                            }
                            if (responseText.xmlExists) {
                                realityServer.switchClass(visualFeedback.querySelector('.hasXml'), 'red', 'hidden');
                            } else {
                                realityServer.switchClass(visualFeedback.querySelector('.hasXml'), 'hidden', 'red');
                            }
                            if (responseText.datExists) {
                                realityServer.switchClass(visualFeedback.querySelector('.hasDat'), 'red', 'hidden');
                            } else {
                                let newColor = responseText.datExists ? 'yellow' : 'red';
                                realityServer.switchClass(visualFeedback.querySelector('.hasDat'), 'hidden', newColor);
                            }

                            if (!responseText.jpgExists && !responseText.datExists) {
                                realityServer.switchClass(visualFeedback.querySelector('.generateXml'), 'green', 'hidden');
                            } else {
                                realityServer.switchClass(visualFeedback.querySelector('.generateXml'), 'hidden', 'green');
                                showGenerateXml(visualFeedback, objectKey);
                            }
                        }

                        if (thisObject.initialized) {
                            // activate the object
                            thisObject.active = true;

                            if (typeof responseText.id !== 'undefined') {
                                thisObject.targetName = responseText.id;
                            }

                            // rename object from objectName to objectID generated from server
                            if (typeof realityServer.objects[responseText.name] !== 'undefined') {
                                realityServer.objects[responseText.id] = realityServer.objects[responseText.name];
                                delete realityServer.objects[responseText.name];
                            }

                            // re-render after a slight delay, so the user can acknowledge what happened
                            setTimeout(function () {
                                window.location.reload();
                                realityServer.update();
                            }, 300);
                        }
                    }

                } else {
                    if (responseText === 'ok') {

                        let xmlGenerated = false;

                        if (file.type === 'image/jpeg') {
                            thisObject.targetsExist.jpgExists = true;
                            let visualFeedback = document.getElementById('targetDropZone' + objectKey).querySelector('.dropZoneFeedback');
                            if (visualFeedback) {
                                realityServer.switchClass(visualFeedback.querySelector('.hasJpg'), 'red', 'hidden');
                            }
                            // this assumes XML gets auto-generated along with jpg
                            xmlGenerated = true;

                        } else if (file.name === 'target.dat') {
                            thisObject.targetsExist.datExists = true;
                            let visualFeedback = document.getElementById('targetDropZone' + objectKey).querySelector('.dropZoneFeedback');
                            if (visualFeedback) {
                                realityServer.switchClass(visualFeedback.querySelector('.hasDat'), 'red', 'hidden');
                            }
                            // this assumes XML gets auto-generated along with dat
                            xmlGenerated = true;
                        }

                        if (xmlGenerated) {
                            thisObject.targetsExist.xmlExists = true;
                            let visualFeedback = document.getElementById('targetDropZone' + objectKey).querySelector('.dropZoneFeedback');
                            if (visualFeedback) {
                                realityServer.switchClass(visualFeedback.querySelector('.hasXml'), 'red', 'hidden');
                            }
                        }

                        let targetFiles = thisObject.targetsExist;
                        if (targetFiles.jpgExists && targetFiles.xmlExists && targetFiles.datExists) {
                            thisObject.initialized = true;
                            thisObject.active = true;
                            realityServer.switchClass(document.getElementById('object' + objectKey).querySelector('.target'), 'yellow', 'green');
                            realityServer.switchClass(document.getElementById('object' + objectKey).querySelector('.target'), 'targetWidthMedium', 'one');
                            window.location.reload();
                            realityServer.update();
                        }
                    }
                }

            });

            realityServer.myTargetDropzone.on('error', function (file, message) {
                realityServer.getDomContents().querySelector('.dropZoneContentBackground').style.width = '0px';

                if (typeof message.error !== 'undefined') {
                    showErrorNotification(message.error, 10000); // show for 10 seconds
                }
            });
        } else {
            realityServer.dropZoneId = '';
            let removeNode = document.getElementById('targetDropZone' + objectKey);
            console.log(removeNode);
            //  removeNode.remove();
            realityServer.removeAnimated(removeNode, 'expandcollapseTarget', 'expandTarget', 'collapseTarget');
        }

        // realityServer.objects[objectKey].dom.appendChild(document.getElementById("target").content.cloneNode(true));

        // window.location.href='/target/' + realityServer.objects[objectKey].name;
    } else {
        let elementList = document.querySelectorAll('.dropZoneElement');
        for (let i = 0; i < elementList.length; ++i) {
            realityServer.removeAnimated(elementList[i]);
            //elementList[i].remove();
            realityServer.dropZoneId = '';
        }
    }

    /**
     *  INFO
     */
    if (buttonClassList.contains('name')) {
        window.location.href = '/info/' + thisObject.name;
    }

    if (buttonClassList.contains('worldName')) {
        if (isRemoteOperatorSupported) {
            window.location.href = remoteOperatorUrl;
        }
    }

    if (buttonClassList.contains('netInterface')) {
        realityServer.sendRequest('/server/networkInterface/' + this.innerText, 'GET', function (state) {
            if (JSON.parse(state).activeInterface) {
                realityServer.states.ipAdress = JSON.parse(state);
            }
            realityServer.update();
        });
    }

    /**
     *  ACTIVE
     */
    if (buttonClassList.contains('active')) {
        if (thisObject.initialized) {
            if (thisObject.active) {
                realityServer.sendRequest('/object/' + objectKey + '/deactivate/', 'GET', function (state) {
                    if (state === 'ok') {
                        thisObject.active = false;
                    }
                    realityServer.update();
                });

            } else {
                realityServer.sendRequest('/object/' + objectKey + '/activate/', 'GET', function (state) {
                    if (state === 'ok') {
                        thisObject.active = true;
                    }
                    realityServer.update();
                });

            }
        }
    }

    /**
     *  VISUALIZATION
     */
    if (buttonClassList.contains('visualization')) {
        if (thisObject.visualization === 'ar') {
            realityServer.sendRequest('/object/' + objectKey + '/screen/', 'GET', function (state) {
                if (state === 'ok') {
                    thisObject.visualization = 'screen';
                }
                realityServer.update();
            });
        } else {
            realityServer.sendRequest('/object/' + objectKey + '/ar/', 'GET', function (state) {
                if (state === 'ok') {
                    thisObject.visualization = 'ar';
                }
                realityServer.update();
            });
        }
    }

    if (buttonClassList.contains('fullscreen')) {
        console.log('fullscreen');
        realityServer.toggleFullScreen(thisEventObject);
    }

    /**
     *  reset
     */
    if (buttonClassList.contains('reset')) {
        let oldID = null;
        if (realityServer.getDomContents().querySelector('.resetYes')) {
            oldID = 'frame' + realityServer.getDomContents().querySelector('.resetYes').getAttribute('objectID') + realityServer.getDomContents().querySelector('.resetYes').getAttribute('frameID');
        }
        if (realityServer.getDomContents().querySelector('.resetOK')) {
            let thisYes = realityServer.getDomContents().querySelector('.resetOK');
            realityServer.removeAnimated(thisYes);
            // thisYes.remove();
        }
        console.log(oldID);
        if (oldID !== 'frame' + objectKey + frameKey) {
            let referenceNode = document.getElementById('frame' + objectKey + frameKey);
            let newNode = document.getElementById('resetOKId').content.cloneNode(true);
            newNode.querySelector('.resetYes').addEventListener('click', realityServer.gotClick, false);
            newNode.querySelector('.resetYes').setAttribute('objectID', objectKey);
            newNode.querySelector('.resetYes').setAttribute('frameID', frameKey);
            referenceNode.after(newNode);
        }

    } else {
        if (document.querySelector('.resetOK')) {
            let removeNode = document.querySelector('.resetOK');
            realityServer.removeAnimated(removeNode);
            //removeNode.remove();
        }
    }

    if (buttonClassList.contains('resetYes')) {
        console.log('okreset');

        realityServer.sendRequest('/object/' + objectKey + '/' + frameKey + '/reset/', 'GET', function (state) {
            if (state === 'ok') {
                realityServer.update();
            }
        });
    }

    if (buttonClassList.contains('content')) {
        let referenceNode = document.createElement('div');
        let thisNode = thisEventObject.parentNode.parentNode.querySelector('.appendix');
        thisNode.appendChild(referenceNode);

        if (thisNode.getAttribute('showUI') === 'true') {
            let last = thisNode.lastChild;
            while (last) {
                thisNode.removeChild(last);
                last = thisNode.lastChild;
            }
            thisNode.setAttribute('showUI', 'false');
        } else {
            thisNode.setAttribute('showUI', 'true');

            //   window.location.href= "/content/" + realityServer.objects[objectKey].name + "/"+realityServer.objects[objectKey].frames[frameKey].name;

            realityServer.sendRequest('/object/' + thisObject.name + '/' + thisObject.frames[frameKey].name + '/frameFolder', 'GET', function (state) {

                console.log('got here');
                console.log('-----------------------------xx---------------------');
                console.log(state);

                if (state) {
                    let tree = JSON.parse(state);
                    // console.log(tree.children);
                    let newNode = {};
                    let thisLevel = realityServer.printFiles(tree);
                    getLevels(thisLevel, 0);

                    newNode = document.getElementById('contentDropZoneId').content.cloneNode(true);
                    referenceNode.before(newNode);

                    function getLevels(thisLevel, level) { // eslint-disable-line no-inner-declarations
                        level = level + 1;
                        let nameDepth, xDepth, xDepth2;

                        if (level === 1) {

                            nameDepth = 'three';
                            xDepth = 'two';
                            xDepth2 = 'one';
                        }
                        if (level === 2) {

                            nameDepth = 'four';
                            xDepth = 'one';
                            xDepth2 = 'zero';
                        }
                        if (level === 3) {
                            nameDepth = 'five';
                            xDepth = 'zero';
                            xDepth2 = 'zero';
                        }

                        // todo: change the depth for the folders

                        for (let fileKey in thisLevel.files) {
                            newNode = document.getElementById('fileId').content.cloneNode(true);
                            newNode.querySelector('.fileName').setAttribute('file', thisLevel.files[fileKey].path);
                            newNode.querySelector('.remove').setAttribute('path', thisLevel.files[fileKey].path);
                            newNode.querySelector('.fileName').innerText = fileKey;
                            realityServer.switchClass(newNode.querySelector('.nameSpace'), 'two', nameDepth);
                            realityServer.switchClass(newNode.querySelector('.removeSpace'), 'two', xDepth);
                            newNode.querySelector('.fileName').addEventListener('click', function () {
                                window.location.href = this.getAttribute('file');
                            }, false);

                            referenceNode.appendChild(newNode);
                        }
                        for (let folderKey in thisLevel.folders) {
                            if (level < 3) {
                                newNode = document.getElementById('folderId').content.cloneNode(true);
                                newNode.querySelector('.folderName').innerText = folderKey;
                                realityServer.switchClass(newNode.querySelector('.nameSpace'), 'two', nameDepth);
                                realityServer.switchClass(newNode.querySelector('.removeSpace'), 'two', xDepth2);
                                referenceNode.appendChild(newNode);
                                getLevels(realityServer.printFiles(thisLevel.folders[folderKey].link), level);
                            }
                        }

                    }
                }
            });
        }
    }


    /**
     *  REMOVE
     */
    if (buttonClassList.contains('remove')) {
        let whatKindOfObject = null;
        if (frameKey) {
            whatKindOfObject = 'frame';
        } else {
            whatKindOfObject = 'object';
        }

        let oldID = null;
        if (realityServer.getDomContents().querySelector('.deleteYes')) {
            oldID = whatKindOfObject + realityServer.getDomContents().querySelector('.deleteYes').getAttribute('objectID') + realityServer.getDomContents().querySelector('.deleteYes').getAttribute('frameID');
        }
        if (realityServer.getDomContents().querySelector('.deleteOK')) {
            let thisYes = realityServer.getDomContents().querySelector('.deleteOK');
            realityServer.removeAnimated(thisYes);
            //thisYes.remove();
        }
        console.log(oldID);
        if (oldID !== whatKindOfObject + objectKey + frameKey) {
            let referenceNode = document.getElementById(whatKindOfObject + objectKey + frameKey);
            let newNode = document.getElementById('deleteOKId').content.cloneNode(true);
            newNode.querySelector('.deleteYes').addEventListener('click', realityServer.gotClick, false);
            newNode.querySelector('.deleteYes').setAttribute('objectID', objectKey);
            newNode.querySelector('.deleteYes').setAttribute('frameID', frameKey);
            referenceNode.after(newNode);
        }
    } else {
        if (document.querySelector('.deleteOK')) {
            let removeNode = document.querySelector('.deleteOK');
            realityServer.removeAnimated(removeNode);
            // removeNode.remove();
        }
    }

    if (buttonClassList.contains('deleteYes')) {

        if (!frameKey) frameKey = '';
        realityServer.sendRequest('/', 'POST', function (state) {
            if (state === 'ok') {
                if (frameKey !== '') {
                    delete thisObject.frames[frameKey];
                    realityServer.update();
                } else {
                    delete realityServer.objects[objectKey];
                    realityServer.update();
                }
            }
            realityServer.update();
        }, 'action=delete&name=' + thisObject.name + '&frame=' + frameKey);

        /*
        realityServer.sendRequest("/object/" + objectKey + "/"+ frameKey+"/reset/", "GET", function (state) {
            if (state === "ok") {
                realityServer.update();
            }
        });
        */
    }

    /**
     *  ADD OBJECT
     */
    if (buttonClassList.contains('addObject') || buttonClassList.contains('addWorldObject') || buttonClassList.contains('addRegion')) {
        console.log(document.getElementById('textEntryObject'));

        if (!document.getElementById('textEntryObject')) {
            let textEntryElements = document.getElementById('textEntryId').content.cloneNode(true);
            textEntryElements.querySelector('.addButton').addEventListener('click', realityServer.gotClick, false);
            textEntryElements.querySelector('.textfield').addEventListener('keypress', realityServer.onTextFieldKeyPress, false);
            textEntryElements.querySelector('.textEntry').id = 'textEntryObject';

            if (buttonClassList.contains('addWorldObject')) {
                textEntryElements.getElementById('textEntryObject').setAttribute('isWorldObject', true);
            } else if (buttonClassList.contains('addRegion')) {
                textEntryElements.getElementById('textEntryObject').setAttribute('isRegion', true);
            }

            document.getElementById('addObject').parentNode.appendChild(textEntryElements);
        } else {
            let removeNode = document.getElementById('textEntryObject');
            realityServer.removeAnimated(removeNode);
        }
    }

    if (buttonClassList.contains('addButton')) {

        let shouldAddWorldObject = document.getElementById('textEntryObject').getAttribute('isWorldObject');
        let shouldAddRegion = document.getElementById('textEntryObject').getAttribute('isRegion');

        let textContent = document.getElementById('textEntryObject').querySelector('.textfield').innerText;

        if (!isNameOk(textContent)) {
            return;
        }

        console.log(textContent);
        let removeNode = document.getElementById('textEntryObject');
        realityServer.removeAnimated(removeNode);

        let objectName = textContent;
        if (shouldAddWorldObject) {
            objectName = '_WORLD_' + textContent;
        } else if (shouldAddRegion) {
            objectName = '_REGION_' + textContent;
        }

        realityServer.sendRequest('/', 'POST', function (state) {
            if (state === 'ok') {
                // this is how non-world objects get set up so they can be initialized later when they receive target data
                realityServer.objects[objectName] = new Objects();
                realityServer.objects[objectName].name = objectName;

                if (shouldAddWorldObject) {
                    realityServer.objects[objectName].isWorldObject = true;
                } else if (shouldAddRegion) {
                    realityServer.objects[objectName].type = 'region';
                }
            } else {
                // this is how world objects get instantly initialized
                try {
                    let msgContent = JSON.parse(state);
                    // generate a placeholder xml file for this object
                    let defaultSize = 0.3;
                    realityServer.sendRequest('/object/' + msgContent.id + '/generateXml/', 'POST', function (state) {
                        if (state === 'ok') {
                            console.log('successfully generated xml for world object');

                            realityServer.objects[msgContent.id] = new Objects();
                            realityServer.objects[msgContent.id].name = msgContent.name;
                            realityServer.objects[msgContent.id].type = msgContent.type;
                            realityServer.objects[msgContent.id].isWorldObject = true;
                            //    realityServer.objects[msgContent.id].initialized = true;

                            // make them automatically activate after a slight delay
                            setTimeout(function () {
                                realityServer.sendRequest('/object/' + msgContent.id + '/activate/', 'GET', function (state) {
                                    if (state === 'ok') {
                                        //   realityServer.objects[msgContent.id].active = true;
                                    }
                                    realityServer.update();
                                });
                            }, 100);
                        }
                    }, 'name=' + msgContent.name + '&width=' + defaultSize + '&height=' + defaultSize);

                } catch (e) {
                    console.warn('json parse error for (action=new&name=\'' + objectName + '\') response: ' + state);
                }
            }

            // realityServer.objects = realityServer.sortObject(realityServer.objects);
            realityServer.update();
            // todo this needs to be changed to a proper read response for the latest objects
            window.location.reload();
        }, 'action=new&name=' + objectName + '&isWorld=' + shouldAddWorldObject + '&isRegion=' + shouldAddRegion);
    }

    if (buttonClassList.contains('addButtonFrame')) {
        let textContent = document.querySelector('.textEntryFrame').querySelector('.textfield').innerText;

        if (!isNameOk(textContent)) {
            return;
        }

        console.log(textContent);
        let removeNode = document.querySelector('.textEntryFrame');
        realityServer.removeAnimated(removeNode);

        realityServer.sendRequest('/', 'POST', function (state) {
            if (state === 'ok') {
                thisObject.frames[textContent] = new Objects();
                thisObject.frames[textContent].name = textContent;
            }
            realityServer.update();
        }, 'action=new&name=' + thisObject.name + '&frame=' + textContent);
    }

    /**
     *  ADD FRAME
     */

    if (buttonClassList.contains('zone')) {
        thisEventObject.style.color = 'rgb(255,255,255)';

        realityServer.sendRequest('/', 'POST', function (state) {
            if (state === 'ok') {
                thisEventObject.style.color = 'rgb(41,253,47)';
                thisObject.zone = thisEventObject.innerText;
            }
        }, 'action=zone&name=' + thisObject.name + '&zone=' + thisEventObject.innerText);

        console.log(thisEventObject.innerText);
    }
    if (buttonClassList.contains('addFrame')) {

        let oldID = null;
        if (realityServer.getDomContents().querySelector('.addButtonFrame')) {
            oldID = 'object' + realityServer.getDomContents().querySelector('.addButtonFrame').getAttribute('objectID');
        }
        if (realityServer.getDomContents().querySelector('.textEntryFrame')) {
            let thisYes = realityServer.getDomContents().querySelector('.textEntryFrame');
            realityServer.removeAnimated(thisYes);
            // thisYes.remove();
        }
        console.log('object ' + objectKey);
        console.log('frame ' + frameKey);
        if (oldID !== 'object' + objectKey) {
            let referenceNode = document.getElementById('object' + objectKey);
            let newNode = document.getElementById('textEntryFrameId').content.cloneNode(true);
            newNode.querySelector('.addButtonFrame').addEventListener('click', realityServer.gotClick, false);
            newNode.querySelector('.textfield').addEventListener('keypress', realityServer.onTextFieldKeyPress, false);
            newNode.querySelector('.addButtonFrame').setAttribute('objectID', objectKey);
            newNode.querySelector('.addButtonFrame').setAttribute('frameID', frameKey);
            referenceNode.after(newNode);
        }


        /*
        frameKey = prompt("Enter Frame Name:");
        if (frameKey !== "") {
            realityServer.objects[objectKey].frames[frameKey] = new Frame();
            realityServer.objects[objectKey].frames[frameKey].name = frameKey;
        }
        realityServer.update();
        */
    } else {
        if (document.querySelector('.textEntryFrame')) {
            let removeNode = document.querySelector('.textEntryFrame');
            realityServer.removeAnimated(removeNode);
            // removeNode.remove();
        }
    }
};

/**
 * Verifies that the name of a new object or frame meets certain criteria
 * (e.g. alphanumeric)
 * Also shows an error message if the name doesn't qualify for a non-obvious reason
 * @param textContent
 * @return {boolean}
 */
function isNameOk(textContent) {
    if (textContent === 'Enter Name') {
        return false;
    }
    if (textContent === '') {
        return false;
    }
    let isAlphanumeric = /^[a-zA-Z0-9]+$/i.test(textContent);
    if (!isAlphanumeric) {
        showErrorNotification('Name must be alphanumeric');
    }
    return isAlphanumeric;
}

realityServer.onTextFieldKeyPress = function (event) {
    if (event.key !== 'Enter') {
        return;
    }
    event.preventDefault();
    const parent = event.target.parentNode;
    if (parent.classList.contains('textEntryFrame')) {
        parent.querySelector('.addButtonFrame').click();
    } else if (parent.id === 'textEntryObject') {
        parent.querySelector('.addButton').click();
    }
};

realityServer.sendRequest = function (url, httpStyle, callback, body) {
    if (!body) {
        body = '';
    }
    let req = new XMLHttpRequest();
    try {
        req.open(httpStyle, url, true);
        if (httpStyle === 'POST') {
            req.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        }
        // Just like regular ol' XHR
        req.onreadystatechange = function () {
            if (req.readyState === 4) {
                if (req.status === 200) {
                    // JSON.parse(req.responseText) etc.
                    if (req.responseText)
                        callback(req.responseText);
                } else {
                    // Handle error case
                    callback('err');
                    console.log('could not load content');
                }
            }
        };
        if (httpStyle === 'POST') {
            req.send(body);
        } else {
            req.send();
        }

    } catch (e) {
        callback('err');
        console.log('could not connect to' + url);
    }
};

realityServer.changeActiveState = function (thisObjectDom, activate, objectKey, frameKey) {
    if (!frameKey) frameKey = '';
    let allItems = thisObjectDom.querySelectorAll('.item');//document.getElementsByClassName("button");
    let objectInfo = this.objects[objectKey];

    for (let x = 0; x < allItems.length; x++) {
        allItems[x].setAttribute('objectID', objectKey);
        allItems[x].setAttribute('frameID', frameKey);
        if (!allItems[x].classList.contains('hardware'))
            this.switchClass(allItems[x], 'inactive');

        if ((!activate && !allItems[x].classList.contains('remove') && !allItems[x].classList.contains('triangle')) && (!allItems[x].classList.contains('target') || objectInfo.initialized)) {
            realityServer.setDeactive(allItems[x]);
        } else if (!allItems[x].classList.contains('hardware')) {
            realityServer.setActive(allItems[x]);
        }

        if (realityServer.objects[objectKey].initialized && (allItems[x].classList.contains('active') || allItems[x].classList.contains('download'))) {
            if (!allItems[x].classList.contains('hardware')) {
                realityServer.setActive(allItems[x]);
            }
        }
    }
};

realityServer.switchClass = function (item, classNameOld, classNameNew) {
    if (classNameNew === '' || !classNameNew) {
        if (item.classList.contains(classNameOld)) {
            item.classList.remove(classNameOld);
        }
    } else if (classNameOld === '') {
        item.classList.add(classNameNew);
    } else {
        if (item.classList.contains(classNameOld)) {
            item.classList.remove(classNameOld);
        }
        item.classList.add(classNameNew);
    }
};

realityServer.setDeactive = function (item) {
    item.classList.add('inactive');
    if (item.classList.contains('clickAble'))
        item.classList.remove('clickAble');
    item.style.cursor = 'default';
    item.style.pointerEvents = 'none';
    if (item.classList.contains('zone')) {
        item.removeEventListener('keyup', realityServer.gotClick, false);
    } else {
        item.removeEventListener('click', realityServer.gotClick, false);
    }
};

realityServer.setActive = function (item) {
    if (item.classList.contains('inactive'))
        item.classList.remove('inactive');
    // if (!item.classList.contains("name")) {
    item.style.pointerEvents = 'all';
    item.style.cursor = '';
    item.classList.add('clickAble');


    if (item.classList.contains('zone')) {
        item.addEventListener('keyup', realityServer.gotClick, false);
    } else {
        item.addEventListener('click', realityServer.gotClick, false);
    }
    /* onkeyup="realityServer.gotClick(this)"
    // define logic for buttons

    document.getElementById("addObject").addEventListener("click", realityServer.gotClick, false);
    */
    /* } else {
         item.removeEventListener("click", realityServer.gotClick, false);
         item.style.pointerEvents = "none";
         item.style.cursor = "default";
         if (item.classList.contains("clickAble"))
             item.classList.remove("clickAble");
     }*/
};


realityServer.toggleFullScreen = function (item) {
    let thisIframe = document.getElementById('fullscreenIframe');

    if (!thisIframe) {
        thisIframe = document.createElement('iframe');
        thisIframe.style.width = '0px';
        thisIframe.style.height = '0px';
        thisIframe.style.border = '0px';
        thisIframe.id = 'fullscreenIframe';
        document.body.appendChild(thisIframe);
    }

    let thisScreen = thisIframe;
    // if(item) thisScreen = item;

    let thisScreenPort = realityServer.objects[item.id.slice('fullscreen'.length)].screenPort;

    if (!thisScreen.mozFullScreen && !document.webkitFullScreen) {

        // if we have set up a screen port, open up that hardware interface application

        if (thisScreenPort) {
            thisIframe.src = 'http://' + realityServer.states.ipAdress.interfaces[realityServer.states.ipAdress.activeInterface] + ':' + thisScreenPort;
        } else {
            // otherwise just view the target image in fullscreen
            thisIframe.src = 'about:blank'; // Clear iframe before loading
            const targetUrl = `/obj/${item.dataset.objectName}/target/target.jpg`;
            const iframeContents = `<div style="text-align: center;"><div style="background: url(${targetUrl}) no-repeat center; background-size: contain; height: 100%; width: 100%;"></div></div>`;
            fetch(targetUrl).then((response) => {
                if (response.ok) {
                    thisIframe.contentDocument.write(iframeContents);
                    thisIframe.contentDocument.close();
                } else {
                    setGeneratedTarget(item, () => {
                        thisIframe.contentDocument.write(iframeContents);
                        thisIframe.contentDocument.close();
                    });
                }
            });
        }

        if (thisScreen.mozRequestFullScreen) {
            thisScreen.mozRequestFullScreen();
        } else {
            thisScreen.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
        }
    } else {
        if (thisScreen.mozCancelFullScreen) {
            thisScreen.mozCancelFullScreen();
        } else {
            thisScreen.webkitCancelFullScreen();
        }
    }
};

realityServer.removeAnimated = function (item, target, expand, collapse) {
    if (!item) return;
    if (!target) target = 'expandcollapse';
    if (!expand) expand = 'expand';
    if (!collapse) collapse = 'collapse';
    let parent = item.parentNode;

    if (parent.classList.contains(target)) {
        if (parent.classList.contains(expand)) {
            parent.classList.remove(expand);
        }
        parent.classList.add(collapse);
        setTimeout(function () {
            parent.remove();
        }, 500);
    } else {
        parent.remove();
    }
};

realityServer.sortObject = function (objects) {
    let objectInfo = [];
    let worldObjectInfo = [];

    for (let objectKey in objects) {
        if (!objects.hasOwnProperty(objectKey)) {
            continue;
        }

        if (objects[objectKey].isWorldObject) {
            worldObjectInfo.push([objects[objectKey].name, objectKey]);
        } else {
            objectInfo.push([objects[objectKey].name, objectKey]);
        }
    }

    // sort alphabetically for non-world objects, and for world objects, and then combine them
    objectInfo.sort(function (a, b) {
        return (a[0].toLowerCase() > b[0].toLowerCase()) ? 1 : -1;
    });
    worldObjectInfo.sort(function (a, b) {
        return (a[0].toLowerCase() > b[0].toLowerCase()) ? 1 : -1;
    });

    return objectInfo.concat(worldObjectInfo);
};

realityServer.sortHardwareInterfaces = function (interfaceNames) {
    let keysToPrioritize = ['kepware'];
    let result = [];

    // adds each prioritized hardware interface first
    keysToPrioritize.forEach(function (name) {
        if (interfaceNames.indexOf(name) > -1) {
            result.push(name);
        }
    });

    // adds unprioritized hardware interfaces afterwards
    interfaceNames.forEach(function (name) {
        if (keysToPrioritize.indexOf(name) === -1) {
            result.push(name);
        }
    });

    return result;
};

realityServer.uuidTime = function () {
    let dateUuidTime = new Date();
    let abcUuidTime = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let stampUuidTime = parseInt(Math.floor((Math.random() * 199) + 1) + '' + dateUuidTime.getTime()).toString(36);
    while (stampUuidTime.length < 11) stampUuidTime = abcUuidTime.charAt(Math.floor(Math.random() * abcUuidTime.length)) + stampUuidTime;
    return '_' + stampUuidTime;
};

// toggle between activated and deactivated
function addEnabledToggle(button, objectKey, thisObject) {
    button.addEventListener('click', function () {
        if (thisObject.active) {
            realityServer.sendRequest('/object/' + objectKey + '/deactivate/', 'GET', function (state) {
                if (state === 'ok') {
                    thisObject.active = false;
                }
                realityServer.update();
            });
        } else {
            realityServer.sendRequest('/object/' + objectKey + '/activate/', 'GET', function (state) {
                if (state === 'ok') {
                    thisObject.active = true;
                }
                realityServer.update();
            });
        }
    });
}

// toggle between enabled and disabled frame
function addFrameEnabledToggle(button, frameName, frameInfo) {
    button.addEventListener('click', function () {
        if (frameInfo.metadata.enabled) {
            realityServer.sendRequest('/globalFrame/' + frameName + '/disable/', 'GET', function (state) {
                if (state === 'ok') {
                    frameInfo.metadata.enabled = false;
                }
                realityServer.update();
            });
        } else {
            realityServer.sendRequest('/globalFrame/' + frameName + '/enable/', 'GET', function (state) {
                if (state === 'ok') {
                    frameInfo.metadata.enabled = true;
                }
                realityServer.update();
            });
        }
    });
}

// toggle between frame sharing enabled/disabled
function addSharingToggle(button, objectKey, thisObject) {
    button.addEventListener('click', function () {
        if (thisObject.sharingEnabled) {
            realityServer.sendRequest('/object/' + objectKey + '/disableFrameSharing/', 'GET', function (state) {
                if (state === 'ok') {
                    thisObject.sharingEnabled = false;
                    console.log(objectKey, thisObject.sharingEnabled);
                }
                realityServer.update();
            });
        } else {
            realityServer.sendRequest('/object/' + objectKey + '/enableFrameSharing/', 'GET', function (state) {
                if (state === 'ok') {
                    thisObject.sharingEnabled = true;
                    console.log(objectKey, thisObject.sharingEnabled);
                }
                realityServer.update();
            });
        }
    });
}

function addExpandedToggle(button, objectKey, thisObject) {
    button.addEventListener('click', function () {
        console.log('toggle expanded');
        thisObject.isExpanded = !thisObject.isExpanded;

        collapsedObjects[objectKey] = !(thisObject.isExpanded); // stores which ones are collapsed (opposite of expanded)
        window.localStorage.setItem('collapsedObjects', JSON.stringify(collapsedObjects));

        console.log(thisObject.isExpanded);
        realityServer.update();
    });

    button.addEventListener('pointerenter', function () {
        // console.log('enter ' + objectKey);
        objectKeyToHighlight = objectKey;
        highlightObject(objectKey, true);
    });

    button.addEventListener('pointerleave', function () {
        // console.log('leave ' + objectKey);
        highlightObject(objectKey, false);
        objectKeyToHighlight = null;
    });
}

function highlightObject(objectKey, shouldHighlight) {
    let objectDom = document.getElementById('object' + objectKey);//.querySelector('.object');
    // highlight the object row
    if (objectDom) {
        objectDom.style.backgroundColor = shouldHighlight ? 'rgba(255,255,255,0.1)' : '';
    }
    // highlight the frame rows, if there are any
    let thisObject = realityServer.objects[objectKey];
    Object.keys(thisObject.frames).forEach(function (frameKey) {
        let frameDom = document.getElementById('frame' + objectKey + frameKey);
        if (frameDom) {
            frameDom.style.backgroundColor = shouldHighlight ? 'rgba(255,255,255,0.1)' : '';
        }
    });
    // highlight the fullscreen button row, if there is one
    let fullscreenDiv = document.getElementById('fullscreen' + objectKey);
    if (fullscreenDiv) {
        fullscreenDiv.parentElement.style.backgroundColor = shouldHighlight ? 'rgba(255,255,255,0.1)' : '';
    }
}

// download zip of global frame directory
function addZipDownload(button, frameName) {
    button.addEventListener('click', function () {
        window.location.href = '/frame/' + frameName + '/zipBackup/';
    });
}

function voronoiTarget(canvas, callback) {
    const width = 128 * 16;
    const height = 128 * 9;
    const targetCellSize = 60;
    const count = Math.floor(width * height / (targetCellSize * targetCellSize));
    const topCount = Math.floor(count / 12);
    const lineWidth = 8;
    const topLineWidth = 16;

    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    const gfx = canvas.getContext('2d');
    canvas.width = gfx.width = width;
    canvas.height = gfx.height = height;

    const points = [];
    const topPoints = [];

    for (let i = 0; i < count; i++) {
        points.push([
            Math.random() * (width - lineWidth) + lineWidth / 2,
            Math.random() * (height - lineWidth) + lineWidth / 2
        ]);
    }

    for (let i = 0; i < topCount; i++) {
        topPoints.push([
            Math.random() * (width - topLineWidth) + topLineWidth / 2,
            Math.random() * (height - topLineWidth) + topLineWidth / 2
        ]);
    }

    const del = d3.Delaunay.from(points);
    const topDel = d3.Delaunay.from(topPoints);
    const vor = del.voronoi([0, 0, width, height]);
    const topVor = topDel.voronoi([0, 0, width, height]);

    // Background fill
    gfx.fillStyle = '#3A3A3A';
    gfx.fillRect(0, 0, width, height);

    // Background lines
    gfx.strokeStyle = '#474747';
    gfx.lineWidth = lineWidth;
    gfx.beginPath();
    vor.render(gfx);
    gfx.stroke();

    // Top lines
    gfx.strokeStyle = '#666666';
    gfx.lineWidth = topLineWidth;
    gfx.beginPath();
    topVor.render(gfx);
    gfx.stroke();

    // Marker border
    gfx.strokeRect(lineWidth / 2, lineWidth / 2, width - lineWidth, height - lineWidth);

    canvas.toBlob(callback, 'image/jpeg');
}

function setGeneratedTarget(clickedElem, callback) {
    const objectName = clickedElem.dataset.objectName;
    voronoiTarget(document.querySelector('.imagegen-canvas'), (blob) => {
        const formData = new FormData();
        formData.append('file', blob, 'autogen-target.jpg');
        fetch(`/content/${objectName}`, {
            body: formData,
            headers: {
                'type': 'targetUpload'
            },
            method: 'post'
        }).then((_response) => {
            callback();
        });
    });
}

// Useful if you want to generate a target image and download it to the user's computer
// function downloadGeneratedTarget(clickedElem) {
//   const data = voronoiTarget(document.querySelector('.imagegen-canvas'));
//   clickedElem.href = data;
//   clickedElem.download = 'autogen-target.jpg';
// }

function removeTarget(clickedElem, callback) {
    const objectName = clickedElem.dataset.objectName;
    realityServer.sendRequest('/content/' + objectName, 'DELETE', function (_state) {
        callback();
    });
}

realityServer.initialize();
