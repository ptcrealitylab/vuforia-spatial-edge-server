createNameSpace('realityEditor.gui');

(function(exports) {
    let _keyboard;
    function getKeyboard() {
        if (!_keyboard) {
            _keyboard = new realityEditor.device.KeyboardListener();
        }
        return _keyboard;
    }

    class MenuBar {
        constructor() {
            this.menus = [];
            this.openMenu = null;
            this.buildDom();
            this.setupKeyboard();
        }
        buildDom() {
            this.domElement = document.createElement('div');
            this.domElement.classList.add('desktopMenuBar');
        }
        setupKeyboard() {
            getKeyboard().onKeyDown((code) => {
                if (realityEditor.device.keyboardEvents.isKeyboardActive()) { return; } // ignore if a tool is using the keyboard

                // check with each of the menu items, whether this triggers anything
                this.menus.forEach(menu => {
                    menu.items.forEach(item => {
                        if (typeof item.onKeyDown === 'function') {
                            item.onKeyDown(code);
                        }
                    });
                });
            });
        }
        addMenu(menu) {
            this.menus.push(menu);
            this.domElement.appendChild(menu.domElement);
            menu.onMenuTitleClicked = this.onMenuTitleClicked.bind(this);
        }
        hideMenu(menu) {
            if (menu.isHidden) { return; }
            menu.isHidden = true;
            this.redraw();
        }
        unhideMenu(menu) {
            if (!menu.isHidden) { return; }
            menu.isHidden = false;
            this.redraw();
        }
        onMenuTitleClicked(menu) {
            if (menu.isOpen) {
                if (this.openMenu && this.openMenu !== menu) {
                    this.openMenu.closeDropdown();
                }
                this.openMenu = menu;
            }
        }
        addItemToMenu(menuName, item) {
            let menu = this.menus.find(menu => {
                return menu.name === menuName;
            });
            if (!menu) {
                menu = new Menu(menuName);
                this.menus.push(menu);
            }
            menu.addItem(item);
            this.redraw();
        }
        // Note: assumes items in different menus don't have duplicate names
        addCallbackToItem(itemName, callback) {
            let item = this.getItemByName(itemName);
            if (item) {
                item.addCallback(callback);
            }
        }
        setItemEnabled(itemName, enabled) {
            let item = this.getItemByName(itemName);
            if (item) {
                if (enabled) {
                    item.enable();
                } else {
                    item.disable();
                }
            }
        }
        getItemByName(itemName) {
            let match = null;
            this.menus.forEach(menu => {
                if (match) { return; } // only add to the first match
                let item = menu.items.find(item => {
                    return item.text === itemName;
                });
                if (item) {
                    match = item;
                }
            });
            return match;
        }
        redraw() {
            let numHidden = 0;
            // tell each menu to redraw
            this.menus.forEach((menu, index) => {
                menu.redraw(index - numHidden);
                if (menu.isHidden) {
                    numHidden++;
                }
            });
        }
    }

    class Menu {
        constructor(name) {
            this.name = name;
            this.items = [];
            this.isOpen = false;
            this.isHidden = false;
            this.buildDom();
            this.menuIndex = 0;
            this.onMenuTitleClicked = null; // MenuBar can inject callback here to coordinate multiple menus
        }
        buildDom() {
            this.domElement = document.createElement('div');
            this.domElement.classList.add('desktopMenuBarMenu');
            const title = document.createElement('div');
            title.classList.add('desktopMenuBarMenuTitle');
            title.innerText = this.name;
            this.domElement.appendChild(title);
            const dropdown = document.createElement('div');
            dropdown.classList.add('desktopMenuBarMenuDropdown');
            dropdown.classList.add('hiddenDropdown');
            this.domElement.appendChild(dropdown);

            title.addEventListener('pointerdown', () => {
                this.isOpen = !this.isOpen;
                this.redraw();
                if (typeof this.onMenuTitleClicked === 'function') {
                    this.onMenuTitleClicked(this);
                }
            });
        }
        closeDropdown() {
            this.isOpen = false;
            this.redraw();
        }
        addItem(menuItem) {
            this.items.push(menuItem);
            let dropdown = this.domElement.querySelector('.desktopMenuBarMenuDropdown');
            dropdown.appendChild(menuItem.domElement);
            menuItem.parent = this;
        }
        redraw(index) {
            if (typeof index !== 'undefined') { this.menuIndex = index; }
            this.domElement.style.left = (100 * this.menuIndex) + 'px';

            let dropdown = this.domElement.querySelector('.desktopMenuBarMenuDropdown');
            let title = this.domElement.querySelector('.desktopMenuBarMenuTitle');
            if (this.isOpen) {
                dropdown.classList.remove('hiddenDropdown');
                title.classList.add('desktopMenuBarMenuTitleOpen');
            } else {
                dropdown.classList.add('hiddenDropdown');
                title.classList.remove('desktopMenuBarMenuTitleOpen');
            }

            this.items.forEach((item, itemIndex) => {
                item.redraw(itemIndex);
            });

            if (this.isHidden) {
                this.domElement.style.display = 'none';
            } else {
                this.domElement.style.display = '';
            }
        }
    }

    class MenuItem {
        constructor(text, options, onClick) {
            this.text = text;
            this.callbacks = [];
            if (onClick) {
                this.addCallback(onClick);
            }
            // options include: { shortcutKey: 'M', toggle: true, defaultVal: true, disabled: true }
            // note: shortcutKey should be an entry in the KeyboardListener's keyCodes
            this.options = options || {};
            this.buildDom();
            this.parent = null;
        }
        buildDom() {
            this.domElement = document.createElement('div');
            this.domElement.classList.add('desktopMenuBarItem');

            let textElement = document.createElement('div');
            textElement.classList.add('desktopMenuBarItemText');
            textElement.innerText = this.text;

            if (this.options.toggle) {
                let checkmark = document.createElement('div');
                checkmark.classList.add('desktopMenuBarItemCheckmark');
                checkmark.innerText = '✓';

                textElement.classList.add('desktopMenuBarItemTextToggle');

                if (!this.options.defaultVal) {
                    checkmark.classList.add('desktopMenuBarItemCheckmarkHidden');
                }
                this.domElement.appendChild(checkmark);
            }

            this.domElement.appendChild(textElement);

            // shortcutKey: 'M', toggle: true, defaultVal: true, disabled: true
            if (this.options.shortcutKey) {
                let shortcut = document.createElement('div');
                shortcut.classList.add('desktopMenuBarItemShortcut');
                shortcut.innerText = getShortcutDisplay(this.options.shortcutKey);
                this.domElement.appendChild(shortcut);

                let thisKeyCode = getKeyboard().keyCodes[this.options.shortcutKey];
                this.onKeyDown = function(code) {
                    if (code === thisKeyCode) {
                        let succeeded = this.triggerItem();
                        if (succeeded) {
                            console.log('triggered shortcut: ' + this.text);
                        }
                    }
                };
            }

            if (this.options.disabled) {
                this.disable();
            }

            this.domElement.addEventListener('pointerup', () => {
                let succeeded = this.triggerItem();
                if (succeeded) {
                    this.parent.closeDropdown();
                }
            });
        }
        triggerItem() {
            if (this.domElement.classList.contains('desktopMenuBarItemDisabled')) {
                return false;
            }
            let toggled = this.options.toggle ? this.switchToggle() : undefined;
            this.callbacks.forEach(cb => {
                cb(toggled);
            });
            return true;
        }
        switchToggle() {
            if (!this.options.toggle) { return; }
            let checkmark = this.domElement.querySelector('.desktopMenuBarItemCheckmark');

            if (checkmark.classList.contains('desktopMenuBarItemCheckmarkHidden')) {
                checkmark.classList.remove('desktopMenuBarItemCheckmarkHidden');
                return true;
            } else {
                checkmark.classList.add('desktopMenuBarItemCheckmarkHidden');
                return false;
            }
        }
        disable() {
            this.domElement.classList.add('desktopMenuBarItemDisabled');
            let checkmark = this.domElement.querySelector('.desktopMenuBarItemCheckmark');
            if (checkmark) {
                checkmark.classList.add('desktopMenuBarItemCheckmarkDisabled');
            }
        }
        enable() {
            this.domElement.classList.remove('desktopMenuBarItemDisabled');
            let checkmark = this.domElement.querySelector('.desktopMenuBarItemCheckmark');
            if (checkmark) {
                checkmark.classList.remove('desktopMenuBarItemCheckmarkDisabled');
            }
        }
        redraw() {
            // currently not used, but can be used to update UI each time menu opens, closes, or contents change
        }
        addCallback(callback) {
            this.callbacks.push(callback);
        }
    }

    // when adding a keyboard shortcut, conform to the naming of the keyboard.keyCodes enum
    // this function maps those names to human-readable shortcut keys to display in the menu
    const getShortcutDisplay = (keyCodeName) => {
        if (keyCodeName === 'BACKSPACE') {
            return '⌫';
        } else if (keyCodeName === 'TAB') {
            return '⇥';
        } else if (keyCodeName === 'ENTER') {
            return '⏎';
        } else if (keyCodeName === 'SHIFT') {
            return '⇪';
        } else if (keyCodeName === 'CTRL') {
            return '⌃';
        } else if (keyCodeName === 'ALT') {
            return '⎇';
        } else if (keyCodeName === 'ESCAPE') {
            return 'Esc';
        } else if (keyCodeName === 'SPACE') {
            return '_';
        } else if (keyCodeName === 'UP') {
            return '↑';
        } else if (keyCodeName === 'DOWN') {
            return '↓';
        } else if (keyCodeName === 'LEFT') {
            return '←';
        } else if (keyCodeName === 'RIGHT') {
            return '→';
        } else if (keyCodeName.match(/^_\d$/)) {
            return keyCodeName[1]; // convert '_0' to '0', '_9' to '9'
        } else if (keyCodeName === 'SEMICOLON') {
            return ';';
        } else if (keyCodeName === 'EQUALS') {
            return '=';
        } else if (keyCodeName === 'COMMA') {
            return ',';
        } else if (keyCodeName === 'DASH') {
            return '-';
        } else if (keyCodeName === 'PERIOD') {
            return '.';
        } else if (keyCodeName === 'FORWARD_SLASH') {
            return '/';
        } else if (keyCodeName === 'OPEN_BRACKET') {
            return '[';
        } else if (keyCodeName === 'BACK_SLASH') {
            return '\\';
        } else if (keyCodeName === 'CLOSE_BRACKET') {
            return ']';
        } else if (keyCodeName === 'SINGLE_QUOTE') {
            return '\'';
        }
        return keyCodeName;
    };

    exports.MenuBar = MenuBar;
    exports.Menu = Menu;
    exports.MenuItem = MenuItem;
})(realityEditor.gui);
