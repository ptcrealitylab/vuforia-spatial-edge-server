createNameSpace("realityEditor.gui.ar.moveabilityOverlay");

realityEditor.gui.ar.moveabilityOverlay = {};
realityEditor.gui.ar.moveabilityOverlay.element = document.body;
realityEditor.gui.ar.moveabilityOverlay.svgNS = {};
realityEditor.gui.ar.moveabilityOverlay.x = window.innerWidth;
realityEditor.gui.ar.moveabilityOverlay.y = window.innerHeight;

realityEditor.gui.ar.moveabilityOverlay.createSvg = function(svg){ // TODO: call this in drawMarkerPlaneIntersection if the width of the polyline elements inside it is different than the width of the parent iframe
    svg.innerHTML ="";
    var x = parseInt(svg.style.width, 10);
    var y = parseInt(svg.style.height, 10);

    //  if the object is fullscreen, handle differently so we don't convert 100% to 100px)
    if (svg.style.width[svg.style.width.length-1] === "%") {
        return;
    }
    
    this.drawBox(svg, svg.namespaceURI, x, y);
    // this.drawNegativeSpace(svg, svg.namespaceURI, x, y, 0+","+0+","+0+","+0+","+0+","+0+","+0+","+0);
};

realityEditor.gui.ar.moveabilityOverlay.changeClipping = function(svg,points){
    svg.getElementById("lineID").setAttribute('points',points);
};

// realityEditor.gui.ar.moveabilityOverlay.drawNegativeSpace = function(svg, svgNS, x,y, points){
//     if(!x) return;
//     var line = document.createElementNS(svgNS,'polyline');
//     line.setAttribute('points',points);
//
//     var defs = svg.appendChild(document.createElementNS(svgNS,'defs'));
//     var clipPath = defs.appendChild(document.createElementNS(svgNS,'clipPath'));
//     clipPath.id = "clippy";
//
//     var lineLement = clipPath.appendChild(line);
//     lineLement.id = "lineID";
//
//     var group = document.createElementNS(svgNS,'g');
//     group.setAttribute('stroke-width',x/400);
//     group.setAttribute('stroke','fff00');
//     group.setAttribute('fill','none');
//     group.setAttribute('clip-path',"url(#clippy)");
//
//     for(var i = 0; i<= x; i = i+10){
//         this.drawMultiLine(group,svgNS, i+","+0+","+i+","+y,100,x,y,"#ed1d7c");
//     }
//     svg.appendChild(group);
// };


realityEditor.gui.ar.moveabilityOverlay.drawBox = function(svg, svgNS, x,y){
    var that = this;

    this.drawMultiLine(svg, svgNS,x/200+","+x/5+","+x/200+","+x/200+","+x/5+","+x/200,20,x,y);
    this.drawMultiLine(svg,svgNS, (x-x/200)+","+x/5+","+(x-x/200)+","+x/200+","+(x-(x/5))+","+x/200,20,x,y);

    this.drawMultiLine(svg,svgNS, x/200+","+(y-x/5)+","+x/200+","+(y-x/200)+","+x/5+","+(y-x/200),20,x,y);
    this.drawMultiLine(svg,svgNS, (x-x/200)+","+(y-x/5)+","+(x-x/200)+","+(y-x/200)+","+(x-(x/5))+","+(y-x/200),20,x,y);

    var crossDividerX = Math.round(x/100);
    var crossDividerY = Math.round(y/100);
    var crossDistanceX = x/(crossDividerX);
    var crossDistanceY = y/(crossDividerY);

    if (crossDividerY === 1) {
        crossDistanceX = x / 2;
        crossDistanceY = y / 2;
        this.drawCross(svg,svgNS, crossDistanceX, crossDistanceY,x,y);
    }

    for(var w = 1; w< crossDividerY; w++) {
        callX(w)
    }
    
    function callX (w){
        if (crossDividerX === 1) {
            crossDistanceX = x / 2;
            that.drawCross(svg,svgNS, crossDistanceX, crossDistanceY,x,y);
        }
        
        for (var i = 1; i < crossDividerX; i++) {
            that.drawCross(svg,svgNS, (crossDistanceX * i), (crossDistanceY*w),x,y);
        }
    }
};
realityEditor.gui.ar.moveabilityOverlay.drawMultiLine = function(svg,svgNS, points, width,x,y, color){
    if(!color) color = '#00ff00';
    if(!width) width = 200;

    var line = document.createElementNS(svgNS,'polyline');
    line.setAttribute('stroke-width',x/width);
    line.setAttribute('stroke',color);
    line.setAttribute('fill','none');
    line.setAttribute('points',points);
    svg.appendChild(line);
};


realityEditor.gui.ar.moveabilityOverlay.drawCross = function(svg,svgNS, pX,pY,x,y){
    this.drawMultiLine(svg,svgNS, (pX)+","+(pY-(x/32))+","+(pX)+","+(pY+(x/32)),100,x,y);
    this.drawMultiLine(svg,svgNS, (pX+(x/32))+","+(pY)+","+(pX-(x/32))+","+(pY),100,x,y);
    //   drawMultiLine(svg, (x+20)+","+(y+20)+","+(x-20)+","+(y-20));
};
