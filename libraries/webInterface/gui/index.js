
function Objects() {
    this.name = "";
    this.initialized = false;
    this.frames = {};
    this.visualization = "ar";
    this.active = false;
};

function Frame() {
    this.name = "";
};
realityServer.initialize = function () {
    realityServer.downloadImage = new Image();
    realityServer.downloadImage.src="../libraries/gui/resources/icondownload.svg";
    realityServer.downloadImageP = new Image();
    realityServer.downloadImageP.src="../libraries/gui/resources/icondownloadP.svg";

    console.log(realityServer.states);

    document.getElementById("subtitle").innerText = "Reality Server - V. "+ realityServer.states.version +" - Server IP: " +
        realityServer.states.ipAdress+":"+realityServer.states.serverPort;

    this.update();

};

realityServer.update = function () {

    realityServer.domObjects.innerHTML = "";
    this.domObjects.appendChild(this.templates[0].content.cloneNode(true));
  //  this.domObjects.appendChild(document.getElementById("textEntryFrame").content.cloneNode(true));
    document.getElementById("addObject").addEventListener("click", realityServer.gotClick, false);

    for (var objectKey in this.objects) {
        if(objectKey === "allTargetsPlaceholder000000000000") continue;

        var thisObject = this.objects[objectKey];
        thisObject.dom = this.templates[1].content.cloneNode(true);
        thisObject.dom.querySelector(".object").id = "object"+objectKey;
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

        if(thisObject.zone === "" || !thisObject.zone){
            thisObject.dom.querySelector(".zone").innerText = "Zone";
        } else {
            thisObject.dom.querySelector(".zone").innerText = thisObject.zone;
        }

        console.log(thisObject.visualization);
        if(thisObject.visualization === "AR") thisObject.visualization = "ar";
        if(thisObject.visualization === "ar"){
            thisObject.dom.querySelector(".visualization").innerText = "AR";
        } else if(thisObject.visualization === "screen") {
            thisObject.dom.querySelector(".visualization").innerText = "Screen";
            realityServer.switchClass(thisObject.dom.querySelector(".visualization"), "blue", "purple");
            realityServer.switchClass(thisObject.dom.querySelector(".addFrame"), "blue", "purple");
            realityServer.switchClass(thisObject.dom.querySelector(".download"), "blue", "purple");

            thisObject.dom.querySelector(".downloadIcon").src = realityServer.downloadImageP.src;
        }


        thisObject.dom.querySelector(".name").innerText = thisObject.name;

        this.domObjects.appendChild(thisObject.dom);
        if(thisObject.visualization === "screen") {
            var thisFullScreen = document.getElementById("fullScreenId").content.cloneNode(true);
            thisFullScreen.querySelector(".fullscreen").id = "fullscreen"+objectKey;
            this.domObjects.appendChild(thisFullScreen);
            document.getElementById("fullscreen"+objectKey).addEventListener("click", realityServer.gotClick, false);
        }

        for (var frameKey in this.objects[objectKey].frames) {
            var thisFrame = this.objects[objectKey].frames[frameKey];
            thisFrame.dom = this.templates[2].content.cloneNode(true);


            thisFrame.dom.querySelector(".frame").id = "frame"+objectKey+frameKey;

            if(thisObject.visualization === "screen") {
                realityServer.switchClass(thisFrame.dom.querySelector(".reset"), "blue", "purple");
                realityServer.switchClass(thisFrame.dom.querySelector(".hardware"), "blue", "purple");
            }

            // check if items are active
            if (thisObject.initialized && thisObject.active) {
                realityServer.changeActiveState(thisFrame.dom, true, objectKey, frameKey);
            } else {
                realityServer.changeActiveState(thisFrame.dom, false, objectKey, frameKey);
            }
            thisFrame.dom.querySelector(".name").innerText = thisFrame.name;

            this.domObjects.appendChild(thisFrame.dom, true);
        }
    }
    this.domObjects.appendChild(this.templates[3].content.cloneNode(true));

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

        if(realityServer.dropZoneId !== "targetDropZone"+objectKey) {
            var elementList = document.querySelectorAll(".dropZoneElement");
            for (var i = 0; i < elementList.length; ++i) {
                elementList[i].remove();
            }


            var newNode = document.getElementById("targetId").content.cloneNode(true);
            newNode.querySelector(".dropZoneElement").id = "targetDropZone"+objectKey;
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
                realityServer.domObjects.querySelector(".dropZoneContentBackground").style.width = (456 /100 *progress) +"px";
            });
            realityServer.myTargetDropzone.on("sending", function (file) {
                //  document.querySelector("#total-progress").style.opacity = "1";
            });

            realityServer.myTargetDropzone.on("queuecomplete", function (progress) {

            });

            realityServer.myTargetDropzone.on("success", function (file, responseText) {
                if(responseText !== "ok"){
                    realityServer.domObjects.querySelector(".dropZoneContentBackground").style.width = "0px";
                    realityServer.objects[responseText].initialized = true;
                    realityServer.changeActiveState(realityServer.objects[objectKey].dom, true, objectKey);
                    realityServer.switchClass(document.getElementById("object"+objectKey).querySelector(".target"), "yellow", "green");
                }

            });
        } else {
            realityServer.dropZoneId = "";
            var removeNode = document.getElementById("targetDropZone"+objectKey);
            console.log(removeNode);
            removeNode.remove();
        }

        // realityServer.objects[objectKey].dom.appendChild(document.getElementById("target").content.cloneNode(true));

        // window.location.href='/target/' + realityServer.objects[objectKey].name;
    } else {
        var elementList = document.querySelectorAll(".dropZoneElement");
        for (var i = 0; i < elementList.length; ++i) {
            elementList[i].remove();
            realityServer.dropZoneId = "";
        }
    }

    /**
     *  INFO
     */
    if (buttonClassList.contains("name")) {
        window.location.href='/info/' + realityServer.objects[objectKey].name;
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
        if(realityServer.domObjects.querySelector(".resetYes")){
            oldID = "frame"+realityServer.domObjects.querySelector(".resetYes").getAttribute('objectID')+realityServer.domObjects.querySelector(".resetYes").getAttribute('frameID');
        }
        if(realityServer.domObjects.querySelector(".resetOK")){
            var thisYes = realityServer.domObjects.querySelector(".resetOK");
            thisYes.remove();
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
            removeNode.remove();
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
        console.log(frameKey);
        window.location.href= "/content/" + realityServer.objects[objectKey].name + "/"+realityServer.objects[objectKey].frames[frameKey].name;
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
        if(realityServer.domObjects.querySelector(".deleteYes")){
            oldID = whatKindOfObject+realityServer.domObjects.querySelector(".deleteYes").getAttribute('objectID')+realityServer.domObjects.querySelector(".deleteYes").getAttribute('frameID');
        }
        if(realityServer.domObjects.querySelector(".deleteOK")){
            var thisYes = realityServer.domObjects.querySelector(".deleteOK");
            thisYes.remove();
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
            removeNode.remove();
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
    if (buttonClassList.contains("addObject")) {
console.log(document.getElementById("textEntryObject"));
        if(!document.getElementById("textEntryObject")){
            var thisObject = document.getElementById("textEntryId").content.cloneNode(true);
               thisObject.querySelector(".addButton").addEventListener("click", realityServer.gotClick, false);
            thisObject.querySelector(".textEntry").id = "textEntryObject";
            document.getElementById("addObject").parentNode.appendChild(thisObject);
           // realityServer.domObjects.querySelector(".textfield").setAttribute("contenteditable", "true");
        } else {
            var removeNode = document.getElementById("textEntryObject");
            removeNode.remove();
        }
    }

    if (buttonClassList.contains("addButton")) {
      var textContent = document.getElementById("textEntryObject").querySelector(".textfield").innerText;
      if(textContent === "Enter Name") {return;}
      else {
          console.log(textContent);
          var removeNode = document.getElementById("textEntryObject");
          removeNode.remove();

          if (textContent !== "") {
              realityServer.sendRequest("/", "POST", function(state){
                  if(state === "ok") {
                      realityServer.objects[textContent] = new Objects();
                      realityServer.objects[textContent].name = textContent;
                  }
                  realityServer.update();}, "action=new&name="+textContent);
          }
      }//
    }


    if (buttonClassList.contains("addButtonFrame")) {
        var textContent = document.querySelector(".textEntryFrame").querySelector(".textfield").innerText;
        if(textContent === "Enter Name") {return;}
        else {
            console.log(textContent);
            var removeNode = document.querySelector(".textEntryFrame");
            removeNode.remove();

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
            }
            }, "action=zone&name="+realityServer.objects[objectKey].name+"&zone="+thisEventObject.innerText);

        console.log(thisEventObject.innerText);
    }
    if (buttonClassList.contains("addFrame")) {

        var oldID = null;
        if(realityServer.domObjects.querySelector(".addButtonFrame")){
            oldID = "object"+realityServer.domObjects.querySelector(".addButtonFrame").getAttribute('objectID');
        }
        if(realityServer.domObjects.querySelector(".textEntryFrame")){
            var thisYes = realityServer.domObjects.querySelector(".textEntryFrame");
            thisYes.remove();
        }
        console.log("object "+objectKey);
        console.log("frame "+frameKey);
        if(oldID !== "object"+objectKey) {
            var referenceNode = document.getElementById("object" + objectKey);
            var newNode = document.getElementById("textEntryFrameId").content.cloneNode(true);
            newNode.querySelector(".addButtonFrame").addEventListener("click", realityServer.gotClick, false);
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
            removeNode.remove();
        }
    }



};


realityServer.sendRequest = function(url, httpStyle, callback, body) {
    if(!body) body = "";
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
                        console.log("this");
                    console.log(req.responseText);
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
        if (item.classList.contains(classNameOld))
            item.classList.remove(classNameOld);
    } else if (classNameOld === "") {
        item.classList.add(classNameNew);
    } else {
        if (item.classList.contains(classNameOld))
            item.classList.remove(classNameOld);

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
    var thisScreen = document.body;
    if(item) thisScreen = item;

    if (!thisScreen.mozFullScreen && !document.webkitFullScreen) {
        if (thisScreen.mozRequestFullScreen) {
            thisScreen.mozRequestFullScreen();
        } else {
            thisScreen.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
        }
    } else {
        if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else {
            document.webkitCancelFullScreen();
        }
    }
};

realityServer.initialize();