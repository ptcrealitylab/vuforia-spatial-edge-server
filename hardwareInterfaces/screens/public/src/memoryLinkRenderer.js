createNameSpace("realityEditor.memoryLinkRenderer");

(function(exports) {

    var guiState;
    var allLinks = {};
    var memoryLinkCanvas = {};

    function initFeature() {

        realityEditor.modeToggle.addGuiStateListener(function(newGuiState) {
            guiState = newGuiState;
            if (memoryLinkCanvas.context) {
                memoryLinkCanvas.hasContent = true;
                memoryLinkCanvas.context.clearRect(0, 0, memoryLinkCanvas.canvas.width, memoryLinkCanvas.canvas.height);
            }
        });

        realityEditor.network.addPostMessageHandler('memoryMessage', handleMessageFromMemory);

        memoryLinkCanvas.canvas = document.createElement('canvas');
        memoryLinkCanvas.canvas.id = 'memoryLinkCanvas';
        memoryLinkCanvas.canvas.width = window.outerWidth;
        memoryLinkCanvas.canvas.height = window.outerHeight;
        memoryLinkCanvas.context = memoryLinkCanvas.canvas.getContext('2d');
        document.body.appendChild(memoryLinkCanvas.canvas);
    }

    /**
     * Handles messages posted into the window/iframe with structure {memoryMessage: msgContent}
     * @param {Object} msgContent - JSON object passed into the memoryMessage property of the post message
     */
    function handleMessageFromMemory(msgContent) {
        var memoryObjectID = msgContent.objectID;
        allLinks[memoryObjectID] = msgContent.links;
    }

    /**
     * Called 60fps to render any links within memoryFrames, or between memoryFrames
     */
    function renderLinks() {
        if (guiState !== 'node') return;

        if (memoryLinkCanvas.hasContent) {
            memoryLinkCanvas.context.clearRect(0, 0, memoryLinkCanvas.canvas.width, memoryLinkCanvas.canvas.height);
        }

        for (var memoryObjectID in allLinks) {
            var thisMemoryLinks = allLinks[memoryObjectID];
            timeCorrection.delta = 1/60.0; // 60 frames per second
            drawMemoryLinks(thisMemoryLinks);
        }
    }

    /**
     * Draws all links originating in a certain memory's object
     * Currently depends on the linkRenderer module to draw an individual link
     * @param {Object.<string, Object>} links - maps link keys to Link objects
     */
    function drawMemoryLinks(links) {
        for (var linkKey in links) {
            var link = links[linkKey];
            // get start node div
            var nodeDivA = document.getElementById('placeholder' + link.nodeA);
            // get end node div
            var nodeDivB = document.getElementById('placeholder' + link.nodeB);

            if (nodeDivA && nodeDivB) {
                // console.log('found start and end node divs', nodeDivA, nodeDivB);

                var nodeACenter = {
                    x: nodeDivA.getClientRects()[0].x + nodeDivA.getClientRects()[0].width/2,
                    y: nodeDivA.getClientRects()[0].y + nodeDivA.getClientRects()[0].height/2
                };
                var nodeBCenter = {
                    x: nodeDivB.getClientRects()[0].x + nodeDivB.getClientRects()[0].width/2,
                    y: nodeDivB.getClientRects()[0].y + nodeDivB.getClientRects()[0].height/2
                };
                var startOffset = {
                    x: 0,
                    y: 0
                };
                var endOffset = {
                    x: 0,
                    y: 0
                };
                var linkWidth = 5;
                var startColorCode = (typeof link.logicA === 'number') ? link.logicA  : 4; // white
                var endColorCode = (typeof link.logicB === 'number') ? link.logicB  : 4;
                if (isNaN(link.ballAnimationCount)) {
                    link.ballAnimationCount = 0;
                }
                var speed = 1; // manually chosen to a number that feels right
                realityEditor.linkRenderer.drawLine(memoryLinkCanvas.context, [nodeACenter.x + startOffset.x, nodeACenter.y + startOffset.y], [nodeBCenter.x + endOffset.x, nodeBCenter.y + endOffset.y], linkWidth, linkWidth, link, timeCorrection, startColorCode, endColorCode, speed);
                memoryLinkCanvas.hasContent = true;
            }
        }
    }

    exports.initFeature = initFeature;
    exports.renderLinks = renderLinks;

})(realityEditor.memoryLinkRenderer);