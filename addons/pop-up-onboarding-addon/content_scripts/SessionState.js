/*
* Copyright © 2021 PTC
*/

import { sharedNetworkSettings } from './NetworkSettings.js';

export const MANAGER_BASE_URL = 'https://toolboxedge.net/metaverse-manager/';

class SessionState {
    constructor() {
        this.isSharingVideo = false;
        this.isMicrophoneOn = false;
        this.humanTrackingEnabled = false;
        this.stationaryDeviceEnabled = false;
        this.enablePoseTrackingTimeout = null;
        this.metaverseManagerCredentials = null;
        this.designatedEdgeServerIp = null;
        this.metaverse_id = null; // this is retrieved from the metaverse manager database after scanning
        this.shareUrl = null; // 'https://toolboxedge.net/stable/n/o297Q0m9pnWlJt4eKCkE/s/dCe6YS8jNdMsMjicr5iqDUTfUDdBw3URrtYBOvW4';
        this.shareUrlListening = false;
        this.isConnected = false;
        this.username = null;
    }
    //The following 4 methods build and set the share url
    set shareUrl(url) {
        this._shareUrl = url;
    }
    // automatically adds the ?world=${primaryId} query item if we are using a primary world
    get shareUrl() {
        if (!this._shareUrl) return null;

        let primaryWorldInfo = realityEditor.network.discovery.getPrimaryWorldInfo();
        let queryItems = [];
        if (primaryWorldInfo && primaryWorldInfo.id) {
            queryItems.push(encodeURIComponent('world') + '=' + encodeURIComponent(primaryWorldInfo.id));
        }
        return `${this._shareUrl}${queryItems.length ? '?' + queryItems.join('&') : ''}`;
    }
    getShareUrl(callback) {
        if (!sharedNetworkSettings) {
            setTimeout(() => {
                this.getShareUrl();
            }, 1000);
            return;
        }
        sharedNetworkSettings.addOnChange((settings) => {
            this.isConnected = settings.isConnected;
            this.shareUrl = `https://${settings.serverUrl}/stable` +
                `/n/${settings.networkUUID}` +
                `/s/${settings.networkSecret}`;
                console.log('onChangeHit');
            callback();
        });
        this.shareUrlListening = true;
    }
    setMetaverseId(id) {
        this.metaverse_id = id;
        // todo: trigger callback functions to notify any modules that we have this value now
    }
    turnOnVideo() {
        this.isSharingVideo = true;
        this.isMicrophoneOn = true; // microphone defaults to on

        let bestWorldObject = realityEditor.worldObjects.getBestWorldObject();
        if (!bestWorldObject || bestWorldObject.objectId === realityEditor.worldObjects.getLocalWorldId()) {
            this.enablePoseTrackingTimeout = setTimeout(this.turnOnVideo, 500);
            console.log('no world object yet... try turnOnVideo again in 500ms');
            return;
        }

        let networkId = sharedNetworkSettings.cachedSettings.networkUUID;
        let networkSecret = sharedNetworkSettings.cachedSettings.networkSecret;

        console.log('enablePoseTracking', {ip: bestWorldObject.ip, networkId, networkSecret});

        realityEditor.app.appFunctionCall("enablePoseTracking", {
            ip: bestWorldObject.ip,
            networkId,
            networkSecret,
        });
    }
    turnOffVideo() {
        this.isSharingVideo = false;
        this.isMicrophoneOn = false;

        if (this.enablePoseTrackingTimeout) {
            clearTimeout(this.enablePoseTrackingTimeout);
            this.enablePoseTrackingTimeout = null;
        }

        realityEditor.app.appFunctionCall("disablePoseTracking", {});
    }
    turnOnMicrophone() {
        this.isMicrophoneOn = true;
        realityEditor.app.appFunctionCall("unmuteMicrophone", {});
    }
    turnOffMicrophone() {
        this.isMicrophoneOn = false;
        realityEditor.app.appFunctionCall("muteMicrophone", {});
    }
    enableHumanTracking() {
        this.humanTrackingEnabled = true;
        realityEditor.app.appFunctionCall('enableHumanTracking', {});
    }
    disableHumanTracking() {
        this.humanTrackingEnabled = false;
        realityEditor.app.disableHumanTracking();
    }
    enableStationaryDevice() {
        this.stationaryDeviceEnabled = true;
        realityEditor.app.appFunctionCall('enableStationaryDevice', {});
    }
    disableStationaryDevice() {
        this.stationaryDeviceEnabled = false;
        realityEditor.app.appFunctionCall('disableStationaryDevice', {});
    }
    updateUsername(credentials) {
        const ENDPOINT = `${MANAGER_BASE_URL}api/users/userdetails`;
        fetch(ENDPOINT, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${credentials}`
            }
            // body: JSON.stringify(body),
        })
            .then((res) => {
                console.log(res);
                return res.json();
            })
            .then((result) => {
                console.log('user details successfully fetched from the manager');
                console.log(result);
                sharedSessionState.setUsername(result.username);
            })
            .catch((err) => {
                console.log('user details were not fetched from the manager');
                console.warn(err);
                let defaultUsername = realityEditor.device.environment.isDesktop() ? 'Remote User' : 'Local User';
                this.setUsername(defaultUsername);
            });
    }
    setUsername(username) {
        this.username = username;
        console.log(`set username to ${username}`);
        realityEditor.avatar.setMyUsername(username);
    }
}

export const sharedSessionState = new SessionState();
