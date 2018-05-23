createNameSpace("realityEditor.draw");

realityEditor.draw.renderFrames = function() {
    // console.log('renderFrames');
    for (var frameKey in frames) {
        if (!frames.hasOwnProperty(frameKey)) continue;
        var frame = frames[frameKey];
        if (typeof frame.location === 'undefined') continue;
        if (frame.location !== 'global') continue;

        realityEditor.draw.addElement(frameKey, frame);
        realityEditor.draw.drawTransformed(frameKey, frame);
    }

    requestAnimFrame(realityEditor.draw.renderFrames);
};

realityEditor.draw.addElement = function(frameKey, frame) {
    var iframeId = "iframe" + frameKey;
    var iframeExists = document.querySelectorAll('#'+iframeId).length > 0;

    if (!iframeExists) {

        if (!frame.hasOwnProperty('width')) {
            frame.width = 300;
        }
        if (!frame.hasOwnProperty('height')) {
            frame.height = 200;
        }

        frame.screen.scale = frame.ar.scale * scaleRatio; //scaleARFactor;

        // frame.screen.scale = frame.ar.scale;
        if (frame.screen.x === 0 && frame.screen.y === 0 && (frame.ar.x !== 0 || frame.ar.y !== 0)) {
            // getScreenPosFromARPos(getScreenFrames()[2].ar.x, getScreenFrames()[2].ar.y)
            var screenPosConversion = getScreenPosFromARPos(frame.ar.x, frame.ar.y);
            frame.screen.x = screenPosConversion.x;
            frame.screen.y = screenPosConversion.y;
        }

        // var scaleFactor = getScreenScaleFactor();
        var screenFrameWidth = (frame.width);// * frame.screen.scale;
        var screenFrameHeight = (frame.height);// * frame.screen.scale;

        var addContainer = document.createElement('div');
        addContainer.id = "object" + frameKey;
        // addContainer.className = "main";
        addContainer.classList.add('main', 'arFrame');
        // addContainer.style.display = "none";
        addContainer.style.border = 0;
        addContainer.style.position = 'absolute';
        var screenPos = getScreenPosFromARPos(frame.screen.x, frame.screen.y);
        addContainer.style.left = screenPos.x + "px"; //frame.screen.x + "px";
        addContainer.style.top = screenPos.y + "px"; //frame.screen.y + "px";
        addContainer.style.transform = 'scale(' + frame.screen.scale + ')';

        var addIframe = document.createElement('iframe');
        addIframe.id = iframeId;
        addIframe.classList.add('main', 'frame');
        addIframe.frameBorder = 0;
        addIframe.style.width = (screenFrameWidth || 0) + "px";
        addIframe.style.height = (screenFrameHeight || 0) + "px";
        // addIframe.style.transform = 'scale(' + frame.screen.scale + ')';

        addIframe.style.visibility = "visible";
        // addIframe.style.pointerEvents = 'none';
        addIframe.src = 'http://' + SERVER_IP + ':' + SERVER_PORT + '/frames/' + frame.src + '.html';
        // addIframe.src = '/frames/' + frame.type + '.html';
        addIframe.dataset.nodeKey = null;
        addIframe.dataset.frameKey = frameKey;
        addIframe.dataset.objectKey = frame.objectId;
        addIframe.setAttribute("onload", 'realityEditor.network.onElementLoad(\"' + frame.objectId + '\",\"' + frameKey + '\")');
        addIframe.setAttribute("sandbox", "allow-forms allow-pointer-lock allow-same-origin allow-scripts");
        document.body.appendChild(addIframe);
        addIframe.display = 'inline';

        // add a cover object for touch event synthesizing
        var cover = document.createElement('div');
        cover.classList.add('main');
        cover.style.visibility = 'visible';
        cover.style.width = addIframe.style.width;
        cover.style.height = addIframe.style.height;
        cover.style.top = 0;
        cover.style.left = 0;
        cover.style.position = 'absolute';
        // frame.frameTouchSynthesizer = new FrameTouchSynthesizer(cover, addIframe);

        var addSVG = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        addSVG.id = "svg" + frameKey;
        addSVG.classList.add("svgOverlay");
        addSVG.style.width = "100%";
        addSVG.style.height = "100%";
        addSVG.style.zIndex = "3";
        addSVG.style.visibility = 'hidden';

        document.body.appendChild(addContainer);
        addContainer.appendChild(addIframe);
        addContainer.appendChild(cover);
        addContainer.appendChild(addSVG);
    }
};

realityEditor.draw.drawTransformed = function(frameKey, frame) {
    var frameContainerDom = document.querySelector('#object'+frameKey);
    if (frame.visualization === 'screen') {
        var svg = frameContainerDom.querySelector('#svg' + frameKey);
        if (svg.childElementCount === 0) {
            var iFrame = frameContainerDom.querySelector('#iframe' + frameKey);
            console.log('retroactively creating the svg overlay');
            svg.style.width = iFrame.style.width;
            svg.style.height = iFrame.style.height;
            realityEditor.gui.ar.moveabilityOverlay.createSvg(svg);
        }

        if (editingState.frameKey === frameKey) {
            svg.style.visibility = 'visible';
        } else {
            svg.style.visibility = 'hidden';
        }

        // frameContainerDom.style.display = 'inline';
        frameContainerDom.classList.remove('arFrame');
        frameContainerDom.classList.add('screenFrame');
        frameContainerDom.style.left = frame.screen.x + 'px';
        frameContainerDom.style.top = frame.screen.y + 'px';

        frameContainerDom.style.transform = 'scale(' + frame.screen.scale + ')';

    } else {
        // frameContainerDom.style.display = 'none';
        frameContainerDom.classList.remove('screenFrame');
        frameContainerDom.classList.add('arFrame');
    }
};

// draw circles for scaling

var editorLineWidth = 2; // default for a iphone scaled screen
var editorLineDash = 7;

/**
 * @desc
 * @param context
 * @param lineStartPoint
 * @param lineEndPoint
 * @param radius
 **/

realityEditor.draw.drawGreen = function(context, lineStartPoint, lineEndPoint, radius) {
    context.beginPath();
    context.arc(lineStartPoint[0], lineStartPoint[1], radius, 0, Math.PI * 2);
    context.strokeStyle = "#7bff08";
    context.lineWidth = editorLineWidth * windowToEditorRatio; // scale up by
    context.setLineDash([editorLineDash * windowToEditorRatio]);
    context.stroke();
    context.closePath();

};

/**
 * @desc
 * @param context
 * @param lineStartPoint
 * @param lineEndPoint
 * @param radius
 **/

realityEditor.draw.drawRed = function(context, lineStartPoint, lineEndPoint, radius) {
    context.beginPath();
    context.arc(lineStartPoint[0], lineStartPoint[1], radius, 0, Math.PI * 2);
    context.strokeStyle = "#ff036a";
    context.lineWidth = editorLineWidth * windowToEditorRatio;
    context.setLineDash([editorLineDash * windowToEditorRatio]);
    context.stroke();
    context.closePath();
};

/**
 * @desc
 * @param context
 * @param lineStartPoint
 * @param lineEndPoint
 * @param radius
 **/

realityEditor.draw.drawBlue = function(context, lineStartPoint, lineEndPoint, radius) {
    context.beginPath();
    context.arc(lineStartPoint[0], lineStartPoint[1], radius, 0, Math.PI * 2);
    context.strokeStyle = "#01fffd";
    context.lineWidth = editorLineWidth * windowToEditorRatio;
    context.setLineDash([editorLineDash * windowToEditorRatio]);
    context.stroke();
    context.closePath();
};