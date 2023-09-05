/*
* Copyright © 2021 PTC
*/

createNameSpace('realityEditor.device');

(function(exports) {

    class KeyboardListener {
        constructor() {
            /**
             * Enum mapping readable keyboard names to their keyCode
             * @type {Readonly<{LEFT: number, UP: number, RIGHT: number, DOWN: number, ONE: number, TWO: number, ESCAPE: number, W: number, A: number, S: number, D: number}>}
             */
            this.keyCodes = Object.freeze({
                BACKSPACE: 8,
                TAB: 9,
                ENTER: 13,
                SHIFT: 16,
                CTRL: 17,
                ALT: 18,
                ESCAPE: 27,
                SPACE: 32,
                LEFT: 37,
                UP: 38,
                RIGHT: 39,
                DOWN: 40,
                _0: 48,
                _1: 49,
                _2: 50,
                _3: 51,
                _4: 52,
                _5: 53,
                _6: 54,
                _7: 55,
                _8: 56,
                _9: 57,
                A: 65,
                B: 66,
                C: 67,
                D: 68,
                E: 69,
                F: 70,
                G: 71,
                H: 72,
                I: 73,
                J: 74,
                K: 75,
                L: 76,
                M: 77,
                N: 78,
                O: 79,
                P: 80,
                Q: 81,
                R: 82,
                S: 83,
                T: 84,
                U: 85,
                V: 86,
                W: 87,
                X: 88,
                Y: 89,
                Z: 90,
                SEMICOLON: 186,
                EQUALS: 187,
                COMMA: 188,
                DASH: 189,
                PERIOD: 190,
                FORWARD_SLASH: 191,
                OPEN_BRACKET: 219,
                BACK_SLASH: 220,
                CLOSE_BRACKET: 221,
                SINGLE_QUOTE: 222
            });
            this.keyStates = {};
            this.callbacks = {
                onKeyDown: [],
                onKeyUp: []
            };

            // set up the keyStates map with default value of "up" for each key
            Object.keys(this.keyCodes).forEach(function(keyName) {
                this.keyStates[this.keyCodes[keyName]] = 'up';
            }.bind(this));

            this.initListeners();
        }
        initListeners() {
            // when a key is pressed down, automatically update that entry in keyStates and trigger callbacks
            document.addEventListener('keydown', function(event) {
                var code = event.keyCode ? event.keyCode : event.which;
                if (this.keyStates.hasOwnProperty(code)) {
                    this.keyStates[code] = 'down';
                    this.callbacks.onKeyDown.forEach(function(cb) {
                        cb(code);
                    });
                }
            }.bind(this));

            // when a key is released, automatically update that entry in keyStates and trigger callbacks
            document.addEventListener('keyup', function(event) {
                var code = event.keyCode ? event.keyCode : event.which;
                if (this.keyStates.hasOwnProperty(code)) {
                    this.keyStates[code] = 'up';
                    this.callbacks.onKeyUp.forEach(function(cb) {
                        cb(code);
                    });
                }
            }.bind(this));
        }
        onKeyDown(callback) {
            this.callbacks.onKeyDown.push(callback);
        }
        onKeyUp(callback) {
            this.callbacks.onKeyUp.push(callback);
        }

    }

    exports.KeyboardListener = KeyboardListener;
})(realityEditor.device);
