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
}

// Constructor with subset of frame information necessary for the web frontend
function Frame() {
    this.name = '';
    this.location = 'local'; // or 'global'
    this.src = ''; // the frame type, e.g. 'slider-2d' or 'graphUI'
}

realityServer.hideAllTabs = function() {
    this.domObjects.querySelector('#manageObjectsContents').classList.remove('selectedTab');
    this.domObjects.querySelector('#manageFramesContents').classList.remove('selectedTab');
    this.domObjects.querySelector('#manageHardwareInterfacesContents').classList.remove('selectedTab');
    
    this.domObjects.querySelector('#manageObjectsContents').classList.add('hiddenTab');
    this.domObjects.querySelector('#manageFramesContents').classList.add('hiddenTab');
    this.domObjects.querySelector('#manageHardwareInterfacesContents').classList.add('hiddenTab');
};

realityServer.getDomContents = function() {
    return this.domObjects.querySelector('#' + realityServer.selectedTab + 'Contents');
};

realityServer.getCommonContents = function() {
    return this.domObjects.querySelector('#commonContents');
};

realityServer.initialize = function () {
    realityServer.downloadImage = new Image();
    realityServer.downloadImage.src="../libraries/gui/resources/icondownload.svg";
    realityServer.downloadImageP = new Image();
    realityServer.downloadImageP.src="../libraries/gui/resources/icondownloadP.svg";

    console.log(realityServer.states);

    document.getElementById("subtitle").innerText = "Reality Server - V. "+ realityServer.states.version +" - Server IP: " +
        realityServer.states.ipAdress.interfaces[realityServer.states.ipAdress.activeInterface]+":"+realityServer.states.serverPort;

    this.update();
};

realityServer.forEachSortedObjectKey = function(callback) {
    var sorted = realityServer.sortObject(realityServer.objects);
    sorted.forEach(function(sortedKey) {
        callback(sortedKey[1]);
    });
};

realityServer.updateManageObjects = function(thisItem2) {

    this.getDomContents().appendChild(this.templates["start"].content.cloneNode(true));
    //  this.domObjects.appendChild(document.getElementById("textEntryFrame").content.cloneNode(true));

    document.getElementById("addObject").addEventListener("click", realityServer.gotClick, false);
    
    document.getElementById("addWorldObject").addEventListener("click", realityServer.gotClick, false);
    
    realityServer.forEachSortedObjectKey( function(objectKey) {
        if(objectKey === "allTargetsPlaceholder000000000000") { return; }

        var thisObject = this.objects[objectKey];

        console.log("--------"+thisItem2);

        if (!thisItem2 || thisItem2 === objectKey)  {

            if (thisObject.isWorldObject) {

                thisObject.dom = this.templates['worldObject'].content.cloneNode(true); // world object template
                thisObject.dom.querySelector(".worldObject").id = "object"+objectKey;
                thisObject.dom.querySelector(".name").innerText = thisObject.name;

                thisObject.dom.querySelector(".target").setAttribute('objectId', objectKey);
                thisObject.dom.querySelector(".target").setAttribute('isWorldObject', true);
                thisObject.dom.querySelector(".target").addEventListener("click", realityServer.gotClick, false);
                
                function addDeleteListener(button, container, thisObjectKey) {
                    button.addEventListener('click', function(e) {
                        // add a expandcollapse div with Sure? Yes
                        var alreadyOpen = container.querySelector('.expandcollapse');
                        if (alreadyOpen) {
                            realityServer.removeAnimated(alreadyOpen.querySelector('.deleteOK'));
                            return;
                        }
                        var deleteConfirmation = realityServer.templates['deleteOKId'].content.cloneNode(true);
                        container.appendChild(deleteConfirmation);
                        
                        container.querySelector('.deleteYes').addEventListener('click', function(e) {
                            realityServer.removeAnimated(container.querySelector('.deleteOK'));

                            realityServer.sendRequest("/", "POST", function(state) {
                                if(state === "ok") {
                                    delete realityServer.objects[thisObjectKey];
                                    realityServer.update();
                                }
                                realityServer.update();
                            }, "action=delete&name="+realityServer.objects[thisObjectKey].name+"&frame=");
                        });
                    });
                }
                addDeleteListener(thisObject.dom.querySelector('.remove'), thisObject.dom.querySelector('.worldObject'), objectKey);

                if (thisObject.initialized) {

                    // on/off and download buttons are always clickable if initialized
                    thisObject.dom.querySelector(".active").classList.add('clickAble');
                    thisObject.dom.querySelector(".download").classList.add('clickAble');

                    // make on/off button green or yellow, and certain buttons clickable or faded out, depending on active state
                    if (thisObject.active) {
                        realityServer.switchClass(thisObject.dom.querySelector(".active"), "yellow", "green");
                        thisObject.dom.querySelector(".active").innerText = "On";

                        thisObject.dom.querySelector(".sharing").classList.add('clickAble');
                        thisObject.dom.querySelector(".sharing").classList.add('clickAble');

                        addSharingToggle(thisObject.dom.querySelector('.sharing'), objectKey, thisObject);

                    } else {
                        realityServer.switchClass(thisObject.dom.querySelector(".active"), "green", "yellow");
                        thisObject.dom.querySelector(".active").innerText = "Off";

                        thisObject.dom.querySelector(".name").classList.add('inactive');
                        thisObject.dom.querySelector(".zone").classList.add('inactive');
                        thisObject.dom.querySelector(".sharing").classList.add('inactive');
                    }

                    // download zip file if click on download button
                    thisObject.dom.querySelector('.download').addEventListener('click', function(e) {
                        window.location.href = "/object/" + realityServer.objects[objectKey].name + "/zipBackup/";
                    });

                    // make Add Target button turn green when fully initialized
                    realityServer.switchClass(thisObject.dom.querySelector(".target"), "yellow", "green");

                    // make Frame Sharing button turn green or yellow depending on state
                    if (thisObject.sharingEnabled) {
                        realityServer.switchClass(thisObject.dom.querySelector('.sharing'), "yellow", "green");
                        thisObject.dom.querySelector(".sharing").innerText = "Frame Sharing On";

                    } else {
                        realityServer.switchClass(thisObject.dom.querySelector('.sharing'), "green", "yellow");
                        thisObject.dom.querySelector(".sharing").innerText = "Frame Sharing Off";
                    }
                    
                    addEnabledToggle(thisObject.dom.querySelector(".active"), objectKey, thisObject); // create inside closure so interfaceInfo doesn't change after definition

                } else { // if not initializes with target files...
                    
                    thisObject.dom.querySelector(".name").classList.add('inactive');
                    thisObject.dom.querySelector(".zone").classList.add('inactive');
                    thisObject.dom.querySelector(".sharing").classList.add('inactive');
                    thisObject.dom.querySelector(".download").classList.add('inactive');
                    thisObject.dom.querySelector(".active").classList.add('inactive');

                    // make on/off button yellow always if not properly initialized
                    realityServer.switchClass(thisObject.dom.querySelector(".active"), "green", "yellow");
                    thisObject.dom.querySelector(".active").innerText = "Off";
                    
                    // make Add Target button yellow
                    realityServer.switchClass(thisObject.dom.querySelector(".target"), "green", "yellow");
                }
                
                this.getDomContents().appendChild(thisObject.dom);

            } else {

                thisObject.dom = this.templates['object'].content.cloneNode(true);
                thisObject.dom.querySelector(".object").id = "object" + objectKey;
                // check if items are active
                if (thisObject.initialized && thisObject.active) {
                    realityServer.changeActiveState(thisObject.dom, true, objectKey);
                } else {
                    realityServer.changeActiveState(thisObject.dom, false, objectKey);
                }

                if (thisObject.initialized) {
                    realityServer.switchClass(thisObject.dom.querySelector(".target"), "yellow", "green");
                } else {
                    realityServer.switchClass(thisObject.dom.querySelector(".target"), "green", "yellow");
                }

                if (thisObject.active) {
                    realityServer.switchClass(thisObject.dom.querySelector(".active"), "yellow", "green");
                    thisObject.dom.querySelector(".active").innerText = "On";
                } else {
                    realityServer.switchClass(thisObject.dom.querySelector(".active"), "green", "yellow");
                    thisObject.dom.querySelector(".active").innerText = "Off";
                }

                thisObject.dom.querySelector(".downloadIcon").src = realityServer.downloadImage.src;

                if (thisObject.zone === "" || !thisObject.zone) {
                    thisObject.dom.querySelector(".zone").innerText = "Zone";
                } else {
                    thisObject.dom.querySelector(".zone").innerText = thisObject.zone;
                }

                if (thisObject.visualization === "AR") thisObject.visualization = "ar";
                if (thisObject.visualization === "ar") {
                    thisObject.dom.querySelector(".visualization").innerText = "AR";
                } else if (thisObject.visualization === "screen") {
                    thisObject.dom.querySelector(".visualization").innerText = "Screen";
                    realityServer.switchClass(thisObject.dom.querySelector(".visualization"), "blue", "purple");
                    realityServer.switchClass(thisObject.dom.querySelector(".addFrame"), "blue", "purple");
                    realityServer.switchClass(thisObject.dom.querySelector(".download"), "blue", "purple");

                    thisObject.dom.querySelector(".downloadIcon").src = realityServer.downloadImageP.src;
                }


                thisObject.dom.querySelector(".name").innerText = thisObject.name;
                if (!thisItem2)
                    this.getDomContents().appendChild(thisObject.dom);


                if (thisItem2 === objectKey) {
                    var thisItem = "object" + objectKey;
                    console.log(thisItem);
                    var thisDom = document.getElementById(thisItem);
                    console.log(thisDom);
                    thisDom.before(thisObject.dom);
                    thisDom.remove();
                }


                if (thisObject.visualization === "screen") {
                    var thisFullScreen = document.getElementById("fullScreenId").content.cloneNode(true);
                    thisFullScreen.querySelector(".fullscreen").id = "fullscreen" + objectKey;
                    if (!thisItem2) {
                        this.getDomContents().appendChild(thisFullScreen);
                    }
                    document.getElementById("fullscreen" + objectKey).addEventListener("click", realityServer.gotClick, false);
                }

            }

            for (var frameKey in this.objects[objectKey].frames) {
                var thisFrame = this.objects[objectKey].frames[frameKey];

                // use the right template for a local frame or a global frame
                var className = thisFrame.location === 'global' ? 'globalFrame' : 'frame';
                thisFrame.dom = this.templates[className].content.cloneNode(true);

                thisFrame.dom.querySelector('.' + className).id = 'frame' + objectKey + frameKey;

                // clicking on the "Content" button opens the html for that frame
                function addLinkToContent(buttonDiv, frameType) {
                    buttonDiv.addEventListener('click', function(e) { // put in a closure so it references don't mutate
                        var ipAddress = realityServer.states.ipAdress.interfaces[realityServer.states.ipAdress.activeInterface];
                        window.open('http://' + ipAddress + ':8080/frames/active/' + frameType + '/index.html', '_blank'); // opens in new tab (instead of window.location.href = )
                    });
                }
                if (thisFrame.location === 'global') {
                    addLinkToContent(thisFrame.dom.querySelector('.content'), thisFrame.src);
                    
                    if (thisObject.isWorldObject && thisObject.sharingEnabled) {
                        // thisFrame.dom.querySelector('.attachedTo').classList.remove('hidden');
                        realityServer.switchClass(thisFrame.dom.querySelector('.attachedTo'), 'hidden', 'inactive');
                        // TODO: in future, make active/visible only if it is attached to another object, and change the text to show that object's name
                    }

                    thisFrame.dom.querySelector(".name").innerText = thisFrame.src;
                } else {
                    thisFrame.dom.querySelector(".name").innerText = thisFrame.name;
                }

                if (thisObject.visualization === 'screen' && thisFrame.location !== 'global') {
                    realityServer.switchClass(thisFrame.dom.querySelector(".reset"), "blue", "purple");
                    realityServer.switchClass(thisFrame.dom.querySelector(".hardware"), "blue", "purple");
                }

                // check if items are active
                if (thisObject.initialized && thisObject.active) {
                    realityServer.changeActiveState(thisFrame.dom, true, objectKey, frameKey);
                } else {
                    realityServer.changeActiveState(thisFrame.dom, false, objectKey, frameKey);
                }

                if(!thisItem2) {
                    this.getDomContents().appendChild(thisFrame.dom, true);
                }
            }
        }

    }.bind(this));
    
    if (thisItem2 === "") {
        this.getDomContents().appendChild(this.templates['end'].content.cloneNode(true));
    }

    console.log(realityServer.objects)
};

realityServer.updateManageFrames = function() {
    console.log('updateManageFrames');

    this.getDomContents().appendChild(this.templates["startFrames"].content.cloneNode(true));
    
    // this.getDomContents().querySelector('#pathSelectionInput').addEventListener('change', function(e) {
    //     console.log(e);
    // });
    
    this.getDomContents().querySelector('#framesPath').innerText = realityServer.states.globalFramesPath || '';
    
    for (var frameKey in this.globalFrames) {
        
        var frameInfo = this.globalFrames[frameKey];
        frameInfo.dom = this.templates['frameManager'].content.cloneNode(true);
        console.log('frameInfo: ', frameInfo);
        
        function addLinkToContent(buttonDiv, frameType) {
            buttonDiv.addEventListener('click', function(e) {
                var ipAddress = realityServer.states.ipAdress.interfaces[realityServer.states.ipAdress.activeInterface];
                // window.location.href = 'http://' + ipAddress + ':8080/frames/active/' + frameType + '/index.html';
                window.open('http://' + ipAddress + ':8080/frames/active/' + frameType + '/index.html', '_blank');
            });
        }
        var contentButton = frameInfo.dom.querySelector('.content');
        addLinkToContent(contentButton, frameKey);

        var ipAddress = realityServer.states.ipAdress.interfaces[realityServer.states.ipAdress.activeInterface];
        frameInfo.dom.querySelector(".frameIcon").src = 'http://' + ipAddress + ':8080/frames/active/' + frameKey + '/icon.gif';
        
        addZipDownload(frameInfo.dom.querySelector('.download'), frameKey);

        frameInfo.dom.querySelector(".name").innerText = frameKey;
        if (!frameInfo.metadata.enabled) {
            frameInfo.dom.querySelector('.frameIcon').classList.add('inactive');
            frameInfo.dom.querySelector('.name').classList.add('inactive');
            frameInfo.dom.querySelector('.content').classList.add('inactive');
            frameInfo.dom.querySelector('.download').classList.add('inactive');
        }

        var activeToggleButton = frameInfo.dom.querySelector('.active');

        if (frameInfo.metadata.enabled) {
            realityServer.switchClass(activeToggleButton, 'yellow', 'green');
            activeToggleButton.innerText = 'On';
        } else {
            realityServer.switchClass(activeToggleButton, 'green', 'yellow');
            activeToggleButton.innerText = 'Off';
        }
        
        addFrameEnabledToggle(activeToggleButton, frameKey, frameInfo); // create inside closure so interfaceInfo doesn't change after definition

        this.getDomContents().appendChild(frameInfo.dom, true);
    }
};

realityServer.updateManageHardwareInterfaces = function() {
    console.log('updateManageHardwareInterfaces');

    for (var interfaceName in this.hardwareInterfaces) {

        var interfaceInfo = this.hardwareInterfaces[interfaceName];
        interfaceInfo.dom = this.templates['hardwareInterface'].content.cloneNode(true);
        console.log('interfaceInfo: ', interfaceInfo);

        interfaceInfo.dom.querySelector('.name').innerText = interfaceName;
        if (!interfaceInfo.enabled) {
            interfaceInfo.dom.querySelector('.name').classList.add('inactive');
        }
        
        var activeToggleButton = interfaceInfo.dom.querySelector('.active');
        
        if (interfaceInfo.configurable === false) { // certain hardware interfaces cannot be turned on and off through the frontend
            activeToggleButton.classList.add('inactive');
        
        } else {
            activeToggleButton.classList.add('clickAble');
        }
    
        if (interfaceInfo.enabled) {
            realityServer.switchClass(activeToggleButton, 'yellow', 'green');
            activeToggleButton.innerText = 'On';
        } else {
            realityServer.switchClass(activeToggleButton, 'green', 'yellow');
            activeToggleButton.innerText = 'Off';
        }

        function addEnabledToggle(button, hardwareInterfaceName, hardwareInterfaceInfo) {
            button.addEventListener('click', function(e) {
                if (hardwareInterfaceInfo.enabled) {
                    realityServer.sendRequest('/hardwareInterface/' + hardwareInterfaceName + '/disable/', 'GET', function (state) {
                        if (state === 'ok') {
                            hardwareInterfaceInfo.enabled = false;
                        }
                        realityServer.update();
                    });
                } else {
                    realityServer.sendRequest('/hardwareInterface/' + hardwareInterfaceName + '/enable/', 'GET', function (state) {
                        if (state === 'ok') {
                            hardwareInterfaceInfo.enabled = true;
                        }
                        realityServer.update();
                    });
                }
            });
        }
        addEnabledToggle(activeToggleButton, interfaceName, interfaceInfo); // create inside closure so interfaceInfo doesn't change after definition
        
        this.getDomContents().appendChild(interfaceInfo.dom, true);
    }
};

realityServer.updateCommonContents = function(thisItem2) {

    if (thisItem2 === "") {
        realityServer.getCommonContents().innerHTML = "";

        var thisNode = this.templates["networkInterfaces"].content.cloneNode(true);

        for(key in realityServer.states.ipAdress.interfaces) {
            console.log(key);
            var thisSubObject = this.templates["networkInterfacelets"].content.cloneNode(true);
            thisSubObject.querySelector(".netInterface").innerText = key;

            if(key === realityServer.states.ipAdress.activeInterface) {
                realityServer.switchClass( thisSubObject.querySelector(".netInterface"), "yellow", "green");
            } else {
                realityServer.switchClass( thisSubObject.querySelector(".netInterface"), "green", "yellow");
            }


            thisSubObject.querySelector(".netInterface").addEventListener("click", realityServer.gotClick, false);

            thisNode.getElementById("subNetInterface").appendChild(thisSubObject);
        }

        console.log('thisNode', JSON.stringify(thisNode));

        this.getCommonContents().appendChild(thisNode);

        this.getCommonContents().appendChild(this.templates["tabs"].content.cloneNode(true));

        // tabName is manageObjects, manageFrames, or manageHardwareInterfaces
        function addTabListener(tabName) {
            realityServer.getCommonContents().querySelector('#' + tabName).addEventListener('click', function(e) {
                realityServer.selectedTab = tabName;
                realityServer.update();
            });
        }

        addTabListener('manageObjects');
        addTabListener('manageFrames');
        addTabListener('manageHardwareInterfaces');
    }
};

realityServer.update = function (thisItem2) {
    if(!thisItem2) thisItem2 = "";

    // update the header
    document.getElementById("subtitle").innerText = "Reality Server - V. "+ realityServer.states.version +" - Server IP: " +
        realityServer.states.ipAdress.interfaces[realityServer.states.ipAdress.activeInterface]+":"+realityServer.states.serverPort;
    
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

};

realityServer.printFiles = function(item) {
    var returnList = {
        files: {},
        folders:{}
    };

    for (var i = 0; i < item.children.length; i++) {
        var thisItem = item.children[i];
        if(thisItem.type === "file"){
            returnList.files[thisItem.name] = {
                path: thisItem.path,
                extension: thisItem.extension
            };
        } else if(thisItem.type === "directory"){
            returnList.folders[thisItem.name] = {
                path: thisItem.path,
                link: thisItem
            };
        }
    }
    return returnList;
};

realityServer.gotClick = function (event) {
    var thisEventObject = event.currentTarget;
    var buttonClassList = thisEventObject.classList;
    var objectKey = thisEventObject.getAttribute("objectid");
    var frameKey = thisEventObject.getAttribute("frameid");

    var thisObject = {};

    if (frameKey) {
        thisObject = realityServer.objects[objectKey].frames[frameKey];
    } else {
        thisObject = realityServer.objects[objectKey];
    };

    if (buttonClassList.contains("download")) {
        window.location.href= "/object/" + realityServer.objects[objectKey].name + "/zipBackup/";
    }

    /**
     *  TARGET..
     */
    if (buttonClassList.contains("target")) {

        var referenceNode = document.getElementById("object"+objectKey);

        // create a dropdown
        if (realityServer.dropZoneId !== "targetDropZone"+objectKey) {
            var elementList = document.querySelectorAll(".dropZoneElement");
            for (var i = 0; i < elementList.length; ++i) {
                realityServer.removeAnimated(elementList[i], "expandcollapseTarget", "expandTarget", "collapseTarget");
            }

            var newNode = document.getElementById("targetId").content.cloneNode(true);
            newNode.querySelector(".dropZoneElement").id = "targetDropZone"+objectKey;

            if (!realityServer.objects[objectKey].targetName) {
                realityServer.objects[objectKey].targetName = realityServer.objects[objectKey].name+realityServer.uuidTime();
            }

            newNode.querySelector(".name").innerText =realityServer.objects[objectKey].targetName;
            referenceNode.after(newNode);

            realityServer.dropZoneId = "targetDropZone"+objectKey;

            var previewNode = document.querySelector("#templateZone");
            var previewTemplate = previewNode.parentNode.innerHTML;
            //previewNode.parentNode.removeChild(previewNode);
            realityServer.myTargetDropzone = {};
            realityServer.myTargetDropzone = new Dropzone(document.getElementById("targetDropZone"+objectKey), {
                url: "/content/" + realityServer.objects[objectKey].name ,
                autoProcessQueue: true,
                headers: { "type": "targetUpload" },
                parallelUploads: 20,
                createImageThumbnails: false,
                previewTemplate: previewTemplate,
                autoQueue: true,
                clickable: ".fileinput-button"
            });
            realityServer.myTargetDropzone.on("addedfile", function (file) {


            });
            realityServer.myTargetDropzone.on("drop", function (file) {

                realityServer.myTargetDropzone.enqueueFiles(realityServer.myTargetDropzone.getFilesWithStatus(Dropzone.ADDED));
            });

            realityServer.myTargetDropzone.on("totaluploadprogress", function (progress) {
                realityServer.getDomContents().querySelector(".dropZoneContentBackground").style.width = (456 /100 *progress) +"px";
            });
            realityServer.myTargetDropzone.on("sending", function (file) {
                //  document.querySelector("#total-progress").style.opacity = "1";
            });

            realityServer.myTargetDropzone.on("queuecomplete", function (progress) {

            });

            realityServer.myTargetDropzone.on("success", function (file, responseText) {
                console.log(responseText);
               // var conText = JSON.parse(responseText);

                console.log("test");
                realityServer.getDomContents().querySelector(".dropZoneContentBackground").style.width = "0px";

                if(responseText.initialized){
                    if( realityServer.objects[responseText.name])
                    {
                        realityServer.objects[responseText.id] =  realityServer.objects[responseText.name];
                       var thisObject  = document.getElementById("object"+responseText.name);
                       thisObject.id = "object"+responseText.id;
                        var objectList = thisObject.querySelectorAll("button");

                        for(var i = 0; i < objectList.length; i++){
                            objectList[i].id = responseText.id;
                        }

                      delete realityServer.objects[responseText.name];

                        // realityServer.objects = realityServer.sortObject(realityServer.objects);
                    }

                    if(responseText.jpgExists && responseText.targetExists) {
                        realityServer.objects[responseText.id].initialized = true;
                        realityServer.objects[responseText.id].active = true;
                        realityServer.switchClass(document.getElementById("object"+responseText.id).querySelector(".target"), "yellow", "green");
                    }
                    realityServer.update(responseText.id);


                  //  realityServer.changeActiveState(realityServer.objects[objectKey].dom, true, objectKey);
                   // realityServer.switchClass(document.getElementById("object"+objectKey).querySelector(".target"), "yellow", "green");
                }

            });
        } else {
            realityServer.dropZoneId = "";
            var removeNode = document.getElementById("targetDropZone"+objectKey);
            console.log(removeNode);
          //  removeNode.remove();
            realityServer.removeAnimated(removeNode, "expandcollapseTarget", "expandTarget", "collapseTarget");
        }

        // realityServer.objects[objectKey].dom.appendChild(document.getElementById("target").content.cloneNode(true));

        // window.location.href='/target/' + realityServer.objects[objectKey].name;
    } else {
        var elementList = document.querySelectorAll(".dropZoneElement");
        for (var i = 0; i < elementList.length; ++i) {
            realityServer.removeAnimated(elementList[i]);
            //elementList[i].remove();
            realityServer.dropZoneId = "";
        }
    }

    /**
     *  INFO
     */
    if (buttonClassList.contains("name")) {
        window.location.href='/info/' + realityServer.objects[objectKey].name;
    }

    if (buttonClassList.contains("netInterface")) {
        realityServer.sendRequest("/server/networkInterface/" + this.innerText, "GET", function (state) {
            if (JSON.parse(state).activeInterface) {
                realityServer.states.ipAdress = JSON.parse(state);
            }
            realityServer.update();
        });
    }

    /**
     *  ACTIVE
     */
    if (buttonClassList.contains("active")) {
        if(thisObject.initialized) {
            if (thisObject.active) {
                realityServer.sendRequest("/object/" + objectKey + "/deactivate/", "GET", function (state) {
                    if (state === "ok") {
                        thisObject.active = false;
                    }
                    realityServer.update();
                });

            } else {
                realityServer.sendRequest("/object/" + objectKey + "/activate/", "GET", function (state) {
                    if (state === "ok") {
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
    if (buttonClassList.contains("visualization")) {
        if (thisObject.visualization === "ar") {
            realityServer.sendRequest("/object/" + objectKey + "/screen/", "GET", function (state) {
                if (state === "ok") {
                    thisObject.visualization = "screen";
                }
                realityServer.update();
            });
        } else {
            realityServer.sendRequest("/object/" + objectKey + "/ar/", "GET", function (state) {
                if (state === "ok") {
                    thisObject.visualization = "ar";
                }
                realityServer.update();
            });
        }
    }

    if (buttonClassList.contains("fullscreen")) {
        console.log("fullscreen");
        realityServer.toggleFullScreen(thisEventObject);
    }

    /**
     *  reset
     */
    if (buttonClassList.contains("reset")) {
        var oldID = null;
        if(realityServer.getDomContents().querySelector(".resetYes")){
            oldID = "frame"+realityServer.getDomContents().querySelector(".resetYes").getAttribute('objectID')+realityServer.getDomContents().querySelector(".resetYes").getAttribute('frameID');
        }
        if(realityServer.getDomContents().querySelector(".resetOK")){
            var thisYes = realityServer.getDomContents().querySelector(".resetOK");
            realityServer.removeAnimated(thisYes);
           // thisYes.remove();
        }
        console.log(oldID);
        if(oldID !== "frame"+objectKey+frameKey) {
            var referenceNode = document.getElementById("frame" + objectKey + frameKey);
            var newNode = document.getElementById("resetOKId").content.cloneNode(true);
            newNode.querySelector(".resetYes").addEventListener("click", realityServer.gotClick, false);
            newNode.querySelector(".resetYes").setAttribute('objectID', objectKey);
            newNode.querySelector(".resetYes").setAttribute('frameID', frameKey);
            referenceNode.after(newNode);
        }

    } else {
        if(document.querySelector(".resetOK")) {
            var removeNode = document.querySelector(".resetOK");
            realityServer.removeAnimated(removeNode);
            //removeNode.remove();
        }
    }

    if (buttonClassList.contains("resetYes")) {
       console.log("okreset");

        realityServer.sendRequest("/object/" + objectKey + "/"+ frameKey+"/reset/", "GET", function (state) {
            if (state === "ok") {
                realityServer.update();
            }
        });
    }

    if (buttonClassList.contains("content")) {
        referenceNode = document.createElement("div");
        var thisNode = thisEventObject.parentNode.parentNode.querySelector(".appendix");
        thisNode.appendChild(referenceNode);

        if(thisNode.getAttribute("showUI") === "true")
        {
            var last;
            while (last = thisNode.lastChild) thisNode.removeChild(last);
            thisNode.setAttribute("showUI", "false");
        } else {
            thisNode.setAttribute("showUI", "true");

     //   window.location.href= "/content/" + realityServer.objects[objectKey].name + "/"+realityServer.objects[objectKey].frames[frameKey].name;

        realityServer.sendRequest("/object/" + realityServer.objects[objectKey].name + "/"+ realityServer.objects[objectKey].frames[frameKey].name    +"/frameFolder", "GET", function (state) {

            console.log("got here");
            console.log("-----------------------------xx---------------------");
            console.log(state);

            if (state) {
              var tree =  JSON.parse(state);
                // console.log(tree.children);
                var newNode = {};
               var thisLevel = realityServer.printFiles(tree);
                getLevels (thisLevel, 0);

                newNode = document.getElementById("contentDropZoneId").content.cloneNode(true);
                referenceNode.before(newNode);

                function getLevels (thisLevel, level){
                    level = level+1;
                    var nameDepth , xDepth, xDepth2;

                    if(level === 1){

                        nameDepth = "three";
                        xDepth = "two";
                        xDepth2 = "one";
                    }
                    if(level === 2){

                        nameDepth = "four";
                        xDepth = "one";
                        xDepth2 = "zero";
                    }
                    if(level === 3){
                        nameDepth = "five";
                        xDepth = "zero";
                        xDepth2 = "zero";
                    }

                    // todo: change the depth for the folders

                    for(var fileKey in thisLevel.files) {
                        newNode = document.getElementById("fileId").content.cloneNode(true);
                        newNode.querySelector(".fileName").setAttribute("file", thisLevel.files[fileKey].path);
                        newNode.querySelector(".remove").setAttribute("path", thisLevel.files[fileKey].path);
                        newNode.querySelector(".fileName").innerText = fileKey;
                        realityServer.switchClass(newNode.querySelector(".nameSpace"), "two", nameDepth);
                        realityServer.switchClass(newNode.querySelector(".removeSpace"), "two", xDepth);
                        newNode.querySelector(".fileName").addEventListener("click", function (){window.location.href= this.getAttribute("file");}, false);

                       referenceNode.appendChild(newNode);
                    }
                    for(var folderKey in thisLevel.folders) {
                        if(level < 3) {
                            newNode = document.getElementById("folderId").content.cloneNode(true);
                            newNode.querySelector(".folderName").innerText = folderKey;
                            realityServer.switchClass(newNode.querySelector(".nameSpace"), "two", nameDepth);
                            realityServer.switchClass(newNode.querySelector(".removeSpace"), "two", xDepth2);
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
    if (buttonClassList.contains("remove")) {
        var whatKindOfObject = null;
        if(frameKey){
            whatKindOfObject = "frame";
        } else {
            whatKindOfObject = "object";
        }

        var oldID = null;
        if(realityServer.getDomContents().querySelector(".deleteYes")){
            oldID = whatKindOfObject+realityServer.getDomContents().querySelector(".deleteYes").getAttribute('objectID')+realityServer.getDomContents().querySelector(".deleteYes").getAttribute('frameID');
        }
        if(realityServer.getDomContents().querySelector(".deleteOK")){
            var thisYes = realityServer.getDomContents().querySelector(".deleteOK");
            realityServer.removeAnimated(thisYes);
            //thisYes.remove();
        }
        console.log(oldID);
        if(oldID !== whatKindOfObject+objectKey+frameKey) {
            var referenceNode = document.getElementById(whatKindOfObject + objectKey + frameKey);
            var newNode = document.getElementById("deleteOKId").content.cloneNode(true);
            newNode.querySelector(".deleteYes").addEventListener("click", realityServer.gotClick, false);
            newNode.querySelector(".deleteYes").setAttribute('objectID', objectKey);
            newNode.querySelector(".deleteYes").setAttribute('frameID', frameKey);
            referenceNode.after(newNode);
        }
    } else {
        if(document.querySelector(".deleteOK")){
            var removeNode = document.querySelector(".deleteOK");
            realityServer.removeAnimated(removeNode);
           // removeNode.remove();
        }
    }

    if (buttonClassList.contains("deleteYes")) {

        if(!frameKey) frameKey = "";
            realityServer.sendRequest("/", "POST", function(state){
                if(state === "ok") {
                    if (frameKey !== "") {
                        delete realityServer.objects[objectKey].frames[frameKey];
                        realityServer.update();
                    } else {
                        delete  realityServer.objects[objectKey];
                        realityServer.update();
                    }
                }
                realityServer.update();}, "action=delete&name="+realityServer.objects[objectKey].name+"&frame="+frameKey);

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
    if (buttonClassList.contains("addObject") || buttonClassList.contains("addWorldObject")) {
        console.log(document.getElementById("textEntryObject"));
        
        if (!document.getElementById("textEntryObject")){
            var textEntryElements = document.getElementById("textEntryId").content.cloneNode(true);
            textEntryElements.querySelector(".addButton").addEventListener("click", realityServer.gotClick, false);
            textEntryElements.querySelector(".textfield").addEventListener("keypress", realityServer.onTextFieldKeyPress, false);
            textEntryElements.querySelector(".textEntry").id = "textEntryObject";
            
            if (buttonClassList.contains('addWorldObject')) {
                textEntryElements.getElementById('textEntryObject').setAttribute('isWorldObject', true);
            }
            
            document.getElementById("addObject").parentNode.appendChild(textEntryElements);
        } else {
            var removeNode = document.getElementById("textEntryObject");
            realityServer.removeAnimated(removeNode);
        }
    }

    if (buttonClassList.contains("addButton")) {

        var shouldAddWorldObject = document.getElementById('textEntryObject').getAttribute('isWorldObject');

        var textContent = document.getElementById("textEntryObject").querySelector(".textfield").innerText;
        
        if (textContent === "Enter Name") {
            return;
        } else {
            console.log(textContent);
            var removeNode = document.getElementById("textEntryObject");
            realityServer.removeAnimated(removeNode);

            if (textContent !== "") {
                
                var objectName = textContent;
                if (shouldAddWorldObject) {
                    objectName = '_WORLD_' + textContent;
                }
                
                realityServer.sendRequest("/", "POST", function(state) {
                    if (state === "ok") {
                        realityServer.objects[objectName] = new Objects();
                        realityServer.objects[objectName].name = objectName;
                        
                        if (shouldAddWorldObject) {
                            realityServer.objects[objectName].isWorldObject = true;
                        }
                    }

                    // realityServer.objects = realityServer.sortObject(realityServer.objects);
                    realityServer.update();
                }, "action=new&name="+objectName);
            }
        }
    }

    if (buttonClassList.contains("addButtonFrame")) {
        var textContent = document.querySelector(".textEntryFrame").querySelector(".textfield").innerText;
        if(textContent === "Enter Name") {return;}
        else {
            console.log(textContent);
            var removeNode = document.querySelector(".textEntryFrame");
            realityServer.removeAnimated(removeNode);
           // removeNode.remove();

            if (textContent !== "") {
                realityServer.sendRequest("/", "POST", function(state){
                    if(state === "ok") {
                        realityServer.objects[objectKey].frames[textContent] = new Objects();
                        realityServer.objects[objectKey].frames[textContent].name = textContent;
                    }
                    realityServer.update();}, "action=new&name="+realityServer.objects[objectKey].name+"&frame="+textContent);
            }
        }//
    }

    /**
     *  ADD FRAME
     */

    if (buttonClassList.contains("zone")) {
        thisEventObject.style.color = "rgb(255,255,255)";

        realityServer.sendRequest("/", "POST", function(state){
            if(state === "ok") {
                thisEventObject.style.color = "rgb(41,253,47)";
                realityServer.objects[objectKey].zone = thisEventObject.innerText;
            }
            }, "action=zone&name="+realityServer.objects[objectKey].name+"&zone="+thisEventObject.innerText);

        console.log(thisEventObject.innerText);
    }
    if (buttonClassList.contains("addFrame")) {

        var oldID = null;
        if(realityServer.getDomContents().querySelector(".addButtonFrame")){
            oldID = "object"+realityServer.getDomContents().querySelector(".addButtonFrame").getAttribute('objectID');
        }
        if(realityServer.getDomContents().querySelector(".textEntryFrame")){
            var thisYes = realityServer.getDomContents().querySelector(".textEntryFrame");
            realityServer.removeAnimated(thisYes);
           // thisYes.remove();
        }
        console.log("object "+objectKey);
        console.log("frame "+frameKey);
        if(oldID !== "object"+objectKey) {
            var referenceNode = document.getElementById("object" + objectKey);
            var newNode = document.getElementById("textEntryFrameId").content.cloneNode(true);
            newNode.querySelector(".addButtonFrame").addEventListener("click", realityServer.gotClick, false);
            newNode.querySelector(".textfield").addEventListener("keypress", realityServer.onTextFieldKeyPress, false);
            newNode.querySelector(".addButtonFrame").setAttribute('objectID', objectKey);
            newNode.querySelector(".addButtonFrame").setAttribute('frameID', frameKey);
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
        if(document.querySelector(".textEntryFrame")){
            var removeNode = document.querySelector(".textEntryFrame");
            realityServer.removeAnimated(removeNode);
           // removeNode.remove();
        }
    }
};

realityServer.onTextFieldKeyPress = function(event) {
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

realityServer.sendRequest = function(url, httpStyle, callback, body) {
    if (!body) { body = ""; }
    var req = new XMLHttpRequest();
    try {
        req.open(httpStyle, url, true);
        if(httpStyle === "POST"){
            req.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        }
        // Just like regular ol' XHR
        req.onreadystatechange = function () {
            if (req.readyState === 4) {
                if (req.status === 200) {
                    // JSON.parse(req.responseText) etc.
                    if(req.responseText)
                    callback(req.responseText);
                } else {
                    // Handle error case
                    callback("err");
                    console.log("could not load content");
                }
            }
        };
        if(httpStyle === "POST"){
            req.send(body);
        } else {
            req.send();
        }

    }
    catch (e) {
        callback("err");
        console.log("could not connect to" + url);
    }
};

realityServer.changeActiveState = function (thisObjectDom, activate, objectKey, frameKey) {
    if (!frameKey) frameKey = "";
    var allItems = thisObjectDom.querySelectorAll(".item");//document.getElementsByClassName("button");

    for (var x = 0; x < allItems.length; x++) {
        allItems[x].setAttribute('objectID', objectKey);
        allItems[x].setAttribute('frameID', frameKey);
        if(!allItems[x].classList.contains("hardware"))
        this.switchClass(allItems[x], "inactive");

        if ((!activate && !allItems[x].classList.contains("remove") && !allItems[x].classList.contains("target"))) {
            realityServer.setDeactive (allItems[x]);
        } else {
        if(!allItems[x].classList.contains("hardware"))
            realityServer.setActive(allItems[x]);
        }

        if(realityServer.objects[objectKey].initialized && (allItems[x].classList.contains("active") || allItems[x].classList.contains("download"))){
            if(!allItems[x].classList.contains("hardware"))
            realityServer.setActive(allItems[x]);
        }
    }
};

realityServer.switchClass = function (item, classNameOld, classNameNew) {
    if (classNameNew === "" || !classNameNew) {
        if (item.classList.contains(classNameOld)) {
            item.classList.remove(classNameOld);
        }
    } else if (classNameOld === "") {
        item.classList.add(classNameNew);
    } else {
        if (item.classList.contains(classNameOld)) {
            item.classList.remove(classNameOld);
        }
        item.classList.add(classNameNew);
    }
};

realityServer.setDeactive = function(item){
    item.classList.add("inactive");
    if (item.classList.contains("clickAble"))
        item.classList.remove("clickAble");
    item.style.cursor = "default";
    item.style.pointerEvents = "none";
    if (item.classList.contains("zone")) {
        item.removeEventListener("keyup", realityServer.gotClick, false);
    } else {
        item.removeEventListener("click", realityServer.gotClick, false);
    }
};

realityServer.setActive = function(item){
    if (item.classList.contains("inactive"))
        item.classList.remove("inactive");
    // if (!item.classList.contains("name")) {
    item.style.pointerEvents = "all";
    item.style.cursor = "pointer";
    item.classList.add("clickAble");


    if (item.classList.contains("zone")){
        item.addEventListener("keyup", realityServer.gotClick, false);
    } else {
        item.addEventListener("click", realityServer.gotClick, false);
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

    var thisIframe = document.getElementById("fullscreenIframe");

    if(!thisIframe){
        thisIframe = document.createElement('iframe');
        thisIframe.style.width = "0px";
        thisIframe.style.height = "0px";
        thisIframe.style.border = "0px";
        thisIframe.id = "fullscreenIframe";
        document.body.appendChild(thisIframe);
    }

    var screenPort = realityServer.objects[item.id.slice('fullscreen'.length)].screenPort;
    thisIframe.src = "http://"+realityServer.states.ipAdress.interfaces[realityServer.states.ipAdress.activeInterface]+":" + screenPort;

    var thisScreen = thisIframe;
   // if(item) thisScreen = item;

    if (!thisScreen.mozFullScreen && !document.webkitFullScreen) {
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

realityServer.removeAnimated = function (item, target, expand, collapse){
    if(!target) target = "expandcollapse";
    if(!expand) expand = "expand";
    if(!collapse) collapse = "collapse";
    var parent = item.parentNode;

    if(parent.classList.contains(target)){
        if(parent.classList.contains(expand)){
            parent.classList.remove(expand);
        }
        parent.classList.add(collapse);
        setTimeout(function() {
            parent.remove();
        }, 500);
    } else {
        parent.remove();
    }
};

realityServer.sortObject = function (objects) {
    var objectInfo = [];
    var worldObjectInfo = [];
    
    for (var objectKey in objects) {
        if (!objects.hasOwnProperty(objectKey)) { continue; }
        
        if (objects[objectKey].isWorldObject) {
            worldObjectInfo.push([ objects[objectKey].name, objectKey ]);
        } else {
            objectInfo.push([ objects[objectKey].name, objectKey ]);
        }
    }
    
    // sort alphabetically for non-world objects, and for world objects, and then combine them
    objectInfo.sort(function(a, b) {
        return (a[0].toLowerCase() > b[0].toLowerCase()) ? 1 : -1;
    });
    worldObjectInfo.sort(function(a, b) {
        return (a[0].toLowerCase() > b[0].toLowerCase()) ? 1 : -1;
    });
    
    return objectInfo.concat(worldObjectInfo);
};

realityServer.uuidTime = function () {
    var dateUuidTime = new Date();
    var abcUuidTime = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    var stampUuidTime = parseInt(Math.floor((Math.random() * 199) + 1) + "" + dateUuidTime.getTime()).toString(36);
    while (stampUuidTime.length < 12) stampUuidTime = abcUuidTime.charAt(Math.floor(Math.random() * abcUuidTime.length)) + stampUuidTime;
    return stampUuidTime;
};

// toggle between activated and deactivated
function addEnabledToggle(button, objectKey, thisObject) {
    button.addEventListener('click', function(e) {
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
    button.addEventListener('click', function(e) {
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
    button.addEventListener('click', function(e) {
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

// download zip of global frame directory
function addZipDownload(button, frameName) {
    button.addEventListener('click', function(e) {
        window.location.href = "/frame/" + frameName + "/zipBackup/";
    });
}

realityServer.initialize();
