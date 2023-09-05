createNameSpace('realityEditor.gui');

(function(exports) {
    let menuBar = null;

    const MENU = Object.freeze({
        View: 'View',
        Camera: 'Camera',
        History: 'History',
        Help: 'Help',
        Develop: 'Develop'
    });
    exports.MENU = MENU;

    const ITEM = Object.freeze({
        PointClouds: '3D Videos',
        SpaghettiMap: 'Spaghetti Map',
        ModelVisibility: 'Model Visibility',
        ModelTexture: 'Model Texture',
        UnityVirtualizers: 'Unity Virtualizers',
        SurfaceAnchors: 'Surface Anchors',
        VideoPlayback: 'Video Timeline',
        Voxelizer: 'Model Voxelizer',
        Follow1stPerson: 'Follow 1st-Person',
        Follow3rdPerson: 'Follow 3rd-Person',
        StopFollowing: 'Stop Following',
        ClonePatch: 'Clone Patch',
        UndoPatch: 'Undo Patch',
        UndoPatches: 'Clear All Patches',
        OrbitCamera: 'Orbit Camera',
        ResetCameraPosition: 'Reset Camera Position',
        GettingStarted: 'Getting Started',
        ShowDeveloperMenu: 'Show Developer Menu',
        DebugAvatarConnections: 'Debug Avatar Connections',
        DeleteAllTools: 'Delete All Tools',
        ViewCones: 'Show View Cones',
        AdvanceCameraShader: 'Next Camera Lens',
        NerfRendering: 'NeRF Rendering',
        ToggleAnalyticsSettings: 'Toggle Analytics Settings',
        ToggleHumanPoses: 'Human Poses',
        DarkMode: 'Dark Mode',
        CutoutViewFrustums: 'Cut Out 3D Videos'
    });
    exports.ITEM = ITEM;

    // sets up the initial contents of the menuBar
    // other modules can add more to it by calling getMenuBar().addItemToMenu(menuName, menuItem)
    const setupMenuBar = () => {
        if (menuBar) { return; }

        const MenuBar = realityEditor.gui.MenuBar;
        const Menu = realityEditor.gui.Menu;
        const MenuItem = realityEditor.gui.MenuItem;

        menuBar = new MenuBar();
        // menuBar.addMenu(new Menu('File'));
        // menuBar.addMenu(new Menu('Edit'));
        menuBar.addMenu(new Menu(MENU.View));
        menuBar.addMenu(new Menu(MENU.Camera));
        menuBar.addMenu(new Menu(MENU.History));
        let developMenu = new Menu(MENU.Develop); // keep a reference, so we can show/hide it on demand
        menuBar.addMenu(developMenu);
        menuBar.hideMenu(developMenu);
        menuBar.addMenu(new Menu(MENU.Help));

        const togglePointClouds = new MenuItem(ITEM.PointClouds, { shortcutKey: 'M', toggle: true, defaultVal: true, disabled: true }, (value) => {
            console.log('toggle point clouds', value);
        });
        menuBar.addItemToMenu(MENU.View, togglePointClouds);

        const toggleHumanPoses = new MenuItem(ITEM.ToggleHumanPoses, { shortcutKey: 'H', toggle: true, defaultVal: true, disabled: false }, null);
        menuBar.addItemToMenu(MENU.View, toggleHumanPoses);

        const toggleSpaghetti = new MenuItem(ITEM.SpaghettiMap, { toggle: true, defaultVal: false, disabled: true }, null);
        menuBar.addItemToMenu(MENU.View, toggleSpaghetti);

        const toggleModelVisibility = new MenuItem(ITEM.ModelVisibility, { shortcutKey: 'T', toggle: true, defaultVal: true }, null); // other module can attach a callback later
        menuBar.addItemToMenu(MENU.View, toggleModelVisibility);

        const toggleModelTexture = new MenuItem(ITEM.ModelTexture, { shortcutKey: 'Y', toggle: true, defaultVal: true }, null);
        menuBar.addItemToMenu(MENU.View, toggleModelTexture);

        const toggleViewCones = new MenuItem(ITEM.ViewCones, { shortcutKey: 'K', toggle: true, defaultVal: false }, null);
        menuBar.addItemToMenu(MENU.View, toggleViewCones);

        const toggleUnityVirtualizers = new MenuItem(ITEM.UnityVirtualizers, { shortcutKey: 'V', toggle: true, defaultVal: false }, null); // other module can attach a callback later
        menuBar.addItemToMenu(MENU.View, toggleUnityVirtualizers);

        const toggleCutoutViewFrustums = new MenuItem(ITEM.CutoutViewFrustums, { toggle: true, defaultVal: false }, null);
        menuBar.addItemToMenu(MENU.View, toggleCutoutViewFrustums);

        const toggleSurfaceAnchors = new MenuItem(ITEM.SurfaceAnchors, { shortcutKey: 'SEMICOLON', toggle: true, defaultVal: false }, null); // other module can attach a callback later
        menuBar.addItemToMenu(MENU.View, toggleSurfaceAnchors);

        const toggleVideoPlayback = new MenuItem(ITEM.VideoPlayback, { shortcutKey: 'OPEN_BRACKET', toggle: true, defaultVal: false }, null); // other module can attach a callback later
        menuBar.addItemToMenu(MENU.View, toggleVideoPlayback);

        const toggleNerfRendering = new MenuItem(ITEM.NerfRendering, { shortcutKey: 'N', toggle: true, defaultVal: false }, null);
        menuBar.addItemToMenu(MENU.View, toggleNerfRendering);

        const toggleDarkMode = new MenuItem(ITEM.DarkMode, { toggle: true, defaultVal: true }, null);
        menuBar.addItemToMenu(MENU.View, toggleDarkMode);

        const rzvAdvanceCameraShader = new MenuItem(ITEM.AdvanceCameraShader, { disabled: true }, null);
        menuBar.addItemToMenu(MENU.Camera, rzvAdvanceCameraShader);

        const toggleAnalyticsSettings = new MenuItem(ITEM.ToggleAnalyticsSettings, { toggle: true, defaultVal: false }, null);
        menuBar.addItemToMenu(MENU.History, toggleAnalyticsSettings);

        const clonePatch = new MenuItem(ITEM.ClonePatch, { shortcutKey: 'P', disabled: true }, null);
        menuBar.addItemToMenu(MENU.History, clonePatch);

        const undoPatch = new MenuItem(ITEM.UndoPatch, { shortcutKey: '' }, null);
        menuBar.addItemToMenu(MENU.History, undoPatch);

        const undoPatches = new MenuItem(ITEM.UndoPatches, { shortcutKey: '' }, null);
        menuBar.addItemToMenu(MENU.History, undoPatches);

        const toggleVoxelizer = new MenuItem(ITEM.Voxelizer, { shortcutKey: '', toggle: true, defaultVal: false }, null); // other module can attach a callback later
        menuBar.addItemToMenu(MENU.History, toggleVoxelizer);

        const stopFollowing = new MenuItem(ITEM.StopFollowing, { shortcutKey: '_0', toggle: false, disabled: true }, null);
        menuBar.addItemToMenu(MENU.Camera, stopFollowing);

        const orbitCamera = new MenuItem(ITEM.OrbitCamera, { shortcutKey: 'O', toggle: true, defaultVal: false }, null);
        menuBar.addItemToMenu(MENU.Camera, orbitCamera);

        const resetCamera = new MenuItem(ITEM.ResetCameraPosition, { shortcutKey: 'ESCAPE' }, null);
        menuBar.addItemToMenu(MENU.Camera, resetCamera);

        const gettingStarted = new MenuItem(ITEM.GettingStarted, null, () => {
            // TODO: build a better Getting Started / Help experience
            window.open('https://spatialtoolbox.vuforia.com/', '_blank');
        });
        menuBar.addItemToMenu(MENU.Help, gettingStarted);

        const debugAvatars = new MenuItem(ITEM.DebugAvatarConnections, { toggle: true }, (checked) => {
            realityEditor.avatar.toggleDebugMode(checked);
        });
        menuBar.addItemToMenu(MENU.Develop, debugAvatars);

        const deleteAllTools = new MenuItem(ITEM.DeleteAllTools, { toggle: true }, (_checked) => {
            // console.info(objects);
            // for (let object in objects) {
            //     let objectKey = object.uuid;
            //     for (let frame in object.frames) {
            //         let frameKey = frame.uuid;
            //         realityEditor.device.deleteFrame(frame, objectKey, frameKey);
            //     }
            // }
            let objectKey = '_WORLD_instantScancm14a1gx_Lesaou7om0z';
            let object = realityEditor.getObject(objectKey);
            for (let frame in object.frames) {
                if (object.frames.hasOwnProperty(frame)) {
                    console.log(object.frames[frame]);
                    let frameKey = object.frames[frame].uuid;
                    realityEditor.device.deleteFrame(frame, objectKey, frameKey);
                }
            }
        });
        menuBar.addItemToMenu(MENU.Develop, deleteAllTools);

        const showDeveloper = new MenuItem(ITEM.ShowDeveloperMenu, { toggle: true }, (checked) => {
            if (checked) {
                menuBar.unhideMenu(developMenu);
            } else {
                menuBar.hideMenu(developMenu);
            }
        });
        menuBar.addItemToMenu(MENU.Help, showDeveloper);

        document.body.appendChild(menuBar.domElement);

        // Offset certain UI elements that align to the top of the screen, such as the envelope X button
        realityEditor.device.environment.variables.screenTopOffset = menuBar.domElement.getBoundingClientRect().height;
    };

    const getMenuBar = () => { // use this to access the shared MenuBar instance
        if (!menuBar) {
            try {
                setupMenuBar();
            } catch (e) {
                console.warn(e);
            }
        }
        return menuBar;
    };

    exports.setupMenuBar = setupMenuBar;
    exports.getMenuBar = getMenuBar;

})(realityEditor.gui);
