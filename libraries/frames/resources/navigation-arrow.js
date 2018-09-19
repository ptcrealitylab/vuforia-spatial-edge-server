(function(exports) {

    var isPaused = false;
    var container;
    var containerWrapper;
    var realityInterface;
    var alwaysFullscreen;
    var isArrowShown = false;
    var arrow;
    var contentSize = {
        width: 100,
        height: 100
    };
    var margins = {
        top: 20,
        bottom: 20,
        left: 20,
        right: 20
    };

    var isTransitioningFullscreen = false;

    function init(_container, _realityInterface, _alwaysFullscreen) {
        container = _container;
        realityInterface = _realityInterface;
        alwaysFullscreen = _alwaysFullscreen;

        realityInterface.subscribeToMatrix();
        realityInterface.addMatrixListener(matrixCallback);

        containerWrapper = document.createElement('div');
        wrap(container, containerWrapper);

        arrow = document.createElement('div');
        arrow.id = 'navigationArrow';
        document.body.appendChild(arrow);
        arrow.style.display = 'none';
    }

    function pause() {
        isPaused = true;
    }

    function resume() {
        isPaused = false;
    }

    function wrap(el, wrapper) {
        el.parentNode.insertBefore(wrapper, el);
        wrapper.appendChild(el);
    }

    function matrixCallback(/*modelViewMatrix, projectionMatrix*/) {
        if (isPaused) return;

        var x = realityInterface.getPositionX();
        var y = realityInterface.getPositionY();

        // noinspection JSSuspiciousNameCombination
        if (Math.abs(x) < screen.height/2 + contentSize.width && Math.abs(y) < screen.width/2 + contentSize.height) {
            // hideArrow();

            if (!isTransitioningFullscreen) {
                if (isArrowShown) {
                    isTransitioningFullscreen = true;
                    containerWrapper.style.display = 'none';
                    arrow.style.display = 'none';
                    if (!alwaysFullscreen) {
                        realityInterface.setFullScreenOff();
                    }
                    setTimeout(function() {
                        containerWrapper.style.display = '';
                        isTransitioningFullscreen = false;
                        isArrowShown = false;
                    }, 100);
                }
            }

        } else {
            updateArrow();

            if (!isTransitioningFullscreen) {
                if (!isArrowShown) {

                    isTransitioningFullscreen = true;
                    containerWrapper.style.display = 'none';
                    arrow.style.display = 'none';
                    realityInterface.setFullScreenOn();

                    setTimeout(function() {
                        arrow.style.display = 'inline';
                        isTransitioningFullscreen = false;
                        isArrowShown = true;
                    }, 100);

                }
            }
        }
    }

    function updateArrow() {

        var arrowSize = 20;

        var arrowX = realityInterface.getPositionX();
        var arrowY = realityInterface.getPositionY();
        var centerX = (screen.height / 2) - arrowSize; // 20 is the width of the arrow
        var centerY = (screen.width / 2) - arrowSize; // 20 is the height of the arrow

        var angleOffset = -1 * Math.PI / 4; // icon is naturally facing upper right... turn to point straight up
        var arrowAngle = angleOffset + Math.atan2(arrowY, arrowX) - Math.PI/2;
        // var distance = 75; // to put it on a center of fixed distance

        var distance = Math.sqrt(arrowX*arrowX + arrowY*arrowY); //to put it as far away as the object, limited to within the screen
        var newX = centerX + distance * Math.cos(arrowAngle+angleOffset);
        var newY = centerY + distance * Math.sin(arrowAngle+angleOffset);
        newX = Math.max(margins.left, Math.min(screen.height - 2*arrowSize - margins.right, newX));
        newY = Math.max(margins.top, Math.min(screen.width - 2*arrowSize - margins.bottom, newY));

        // // to put it on closest edge to screen
        // var X = arrowX;// - centerX;
        // var Y = arrowY;// - centerY;
        // console.log(X);
        // var H = screen.width;
        // var W = screen.height;
        // var x;
        // var y;
        //
        // if (Math.abs(Y) > H/2) {
        //     y = -1 * (H/2);
        //     x = y * (X/Y);
        //
        //     if (Y < 0) {
        //         x *= -1;
        //         y *= -1;
        //     }
        //
        //     newX = centerX + x;
        //     newY = centerY + y;
        //
        // } else if (Math.abs(X) > W/2) {
        //     x = -1 * (W/2) ;
        //     y = x * (Y/X);
        //
        //     if (X < 0) {
        //         x *= -1;
        //         y *= -1;
        //     }
        //
        //     newX = centerX + x;
        //     newY = centerY + y;
        // }

        arrow.style.left = newX + 'px';
        arrow.style.top = newY + 'px';
        arrow.style.transform = 'rotate(' + arrowAngle + 'rad)';
    }

    function setContentSize(width, height) {
        contentSize.width = width;
        contentSize.height = height;
    }

    function setMargins(top, bottom, left, right) {
        margins.top = top;
        margins.bottom = bottom;
        margins.left = left;
        margins.right = right;
    }

    exports.initNavigationArrow = init;
    exports.pauseNavigationArrow = pause;
    exports.resumeNavigationArrow = resume;
    exports.setNavigationContentSize = setContentSize;
    exports.setNavigationMargins = setMargins;

})(window);
