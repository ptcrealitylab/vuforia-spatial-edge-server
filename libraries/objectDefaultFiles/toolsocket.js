/**
 * Copyright (c) 2021 PTC
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/
 */

class ToolboxUtilities {
    constructor(){this.eCb={}};
    on(e,...args){if(!this.eCb[e])this.eCb[e]=[];this.eCb[e].push(...args);};
    emit(e,...args){if(this.eCb[e])this.eCb[e].forEach(cb=>cb(...args));};
    removeAllListeners() {for(let k in this.eCb) delete this.eCb[k];};
    validate = (obj, msgLength, schema,) => {
        if(typeof obj !== "object") return false; // for now only objects
        let validString = (obj, p, key) => {
            if (typeof obj[key] !== 'string') return false; // this if is a hack to test for null as well
            if (Number.isInteger(p[key].minLength)) if (obj[key].length < p[key].minLength) return false;
            if (Number.isInteger(p[key].maxLength)) if (obj[key].length > p[key].maxLength) return false;
            if (p[key].pattern) if (!obj[key].match(p[key].pattern)) return false;
            if (p[key].enum) if (!p[key].enum.includes(obj[key])) return false;
            return true;
        }
        let validInteger = (obj, p, key) => {
            if (!Number.isInteger(obj[key])) return false;
            if (Number.isInteger(p[key].minimum)) {if (obj[key] < p[key].minimum) return false;}
            if (Number.isInteger(p[key].maximum)) {if (obj[key] > p[key].maximum) return false;}
            return true;
        }
        let validNull = (obj, p, key) => {
            if(obj.m === "res" && obj[key] === null) return false;
            return obj[key] === null;
        }
        let validBoolean = (obj, p, key) => {
            return typeof obj[key] === 'boolean';
        }
        let validNumber = (obj, p, key) => {
            return typeof obj[key] === 'number';
        }
        let validUndefined = (obj, p, key) => {
            return !obj[key];
        }
        let validArray = (obj, p, key, msgLength) => {
            if (!Array.isArray(obj[key])) return false;

            if (Number.isInteger(p[key].minLength)) if (msgLength < p[key].minLength) return false;
            if (Number.isInteger(p[key].maxLength)) if (msgLength > p[key].maxLength) return false;
            return true;
        }
        let validObject = (obj, p, key, msgLength) => {
            if (typeof obj[key] !== 'object') return;
            if (Number.isInteger(p[key].minLength)) if (msgLength < p[key].minLength) return false;
            if (Number.isInteger(p[key].maxLength)) if (msgLength > p[key].maxLength) return false;
            return true;
        }
        let validKey = (obj, p, key) => {
            return p.hasOwnProperty(key);
        }
        let validRequired = (obj, required) => {
            for (let key in required) {if(!obj.hasOwnProperty(required[key])) return false;}
            return true;
        }
        let p = schema.items.properties;
        let verdict = true;
        for (let key in obj) {
            if(validKey(obj, p, key)) {
                let evaluate = false;
                if (p[key].type.includes("string")) if(validString(obj, p, key)) evaluate = true;
                if (p[key].type.includes("integer")) if(validInteger(obj, p, key)) evaluate = true;
                if (p[key].type.includes("null")) if(validNull(obj, p, key)) evaluate = true;
                if (p[key].type.includes("boolean")) if(validBoolean(obj, p, key)) evaluate = true;
                if (p[key].type.includes("number")) if(validNumber(obj, p, key)) evaluate = true;
                if (p[key].type.includes("array")) if(validArray(obj, p, key, msgLength)) evaluate = true; // use msg for length to simplify / speedup
                if (p[key].type.includes("object")) if(validObject(obj, p, key, msgLength)) evaluate = true; // use msg for length to simplify / speedup
                if (p[key].type.includes("undefined")) if(validUndefined(obj, p, key)) evaluate = true;
                if(!evaluate) verdict = false;
            } else verdict = false;
        }
        if(!validRequired(obj, schema.items.required)) verdict = false;
        return verdict;
    };
    parseUrl = (url, schema) => {
        let urlProtocol=url.split("://")
        let protocol = null;
        let server = null;
        let port = null;
        if(urlProtocol) if(urlProtocol[1]){
            url = urlProtocol[1];
            protocol = urlProtocol[0];
        }

        let urlSplit=url.split("/")
        if(protocol) {
            server = urlSplit[0]; urlSplit.shift();
            let serverSplit = server.split(":")
            server = serverSplit[0];
            if(serverSplit[1]) port = parseInt(Number(serverSplit[1]));
        }
        let res={}
        let route = "";
        let querySplit = [];
        if(urlSplit[urlSplit.length-1]) querySplit = urlSplit[urlSplit.length-1].split("?");
        let fileSplit = null;
        if(querySplit) if(querySplit[0]) {
             fileSplit = querySplit[0].split(".");
        if(querySplit[1]) {
            urlSplit[urlSplit.length-1] = querySplit[0]
        }
        }
        try{
            if(!schema.items.properties.type) schema.items.properties.type = {"type": "string", "minLength": 1, "maxLength": 5, "enum": ["jpg", "jpeg", "gif", "zip", "glb", "html", "htm", "xml", "dat", "png", "js", "json", "obj", "fbx", "svg", "mp4", "pdf", "csv", "css", "woff", "otf", "webm","webp", "ttf"]};
            if(!schema.items.properties.protocol) schema.items.properties.protocol = {"type": "string", "minLength": 1, "maxLength": 20, "enum": ["spatialtoolbox", "ws", "wss", "http", "https"]};
            if(!schema.items.properties.query) schema.items.properties.query = {"type": "string", "minLength": 0, "maxLength": 2000, "pattern": "^[A-Za-z0-9~!@$%^&*()-_=+{}|;:,./?]*$"};
            if(!schema.items.properties.route )  schema.items.properties.route = {"type": "string", "minLength": 0, "maxLength": 2000, "pattern": "^[A-Za-z0-9/~!@$%^&*()-_=+|;:,.]*$"};
            if(!schema.items.properties.server)  schema.items.properties.server = {"type": "string", "minLength": 0, "maxLength": 2000, "pattern": "^[A-Za-z0-9~!@$%^&*()-_=+|;:,.]*$"};
            if(!schema.items.properties.port )  schema.items.properties.port = {"type": "number", "min": 0, "max": 99999};
            for(let i=0;i<urlSplit.length;i++) {
                if (schema.items.expected.includes(urlSplit[i])) {
                    if (urlSplit[i + 1])
                        res[urlSplit[i]] = urlSplit[i + 1]
                    i++;
                } else if(urlSplit[i]){route = route +'/'+urlSplit[i]}
            }
       }catch(e){return null}
        if(querySplit) if(querySplit[1]) res.query = querySplit[1]
        if(route) res.route = route;
        if(server) res.server = server;
        if(protocol) res.protocol = protocol;
        if(port) res.port = port;
        if(fileSplit) if(fileSplit.length > 1) res.type = fileSplit[fileSplit.length-1];
        if(this.validate(res,url.length,schema))
            return res;
        else
            return null
    }
    uuidShort = (length) => { let abcUuid = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", uuid = "";
        while (uuid.length < length) uuid = abcUuid.charAt(Math.floor(Math.random() * abcUuid.length)) + uuid; return uuid;
    }
}

class MainToolboxSocket extends ToolboxUtilities {
    constructor(url, networkID, origin) {
        super();
        let that = this;
        let log = (...args) => console.log(...args);
        this.retryAmount = 5;
        this.timetoRequestPackage = 3000;
        this.netBeatInterval = 1000;
        this.networkID = networkID;
        this.url = url;
        this.origin = origin;
        this.CONNECTING = 0;
        this.OPEN = 1;
        this.CLOSING = 2;
        this.CLOSED = 3;
        this.id = 0;
        this.readyState = 3;
        this.rsOld = null;
        this.packageID = 0;
        this.packageCb = {};
        this.routineIntervalRef = null;
        this.netBeatIntervalRef = null;
        this.envNode = false;
        this.isServer = false;
        this.CbObj = function (callback, time, msg) {
            this.callback = callback;
            this.time = time;
            this.retry = 0;
            this.msg = msg;
        }
        this.CbSub = function (route, socket) {
            this.route = route;
            this.socket = socket;
            //sub and pub are acknowledged. pub is not acknowledged
            // user subscribes, pub message is forwarded to all subscribers. if socket ends or subscription ends
        }
        this.DataPackage = function (origin, network, method, route, body, id = null) {
            this.i = id;
            this.o = origin;
            this.n = network;
            this.m = method;
            this.r = route;
            this.b = body;
            this.s = null
        };
        this.dataPackageSchema = {
            "type": "object",
            "items": {
                "properties": {
                    "i": {"type": ["string", "null", "undefined"], "minLength": 1, "maxLength": 22, "pattern": "^[A-Za-z0-9_]*$"},
                    "o": {"type": "string", "minLength": 1, "maxLength": 10, "enum": ["server", "client", "web", "edge", "proxy"]},
                    "n": {"type": "string", "minLength": 1, "maxLength": 25, "pattern": "^[A-Za-z0-9_]*$"},
                    "m": {"type": "string", "minLength": 1, "maxLength": 10, "enum": ["beat", "action", "ping", "get", "post", "put", "patch", "delete", "new", "unsub", "sub", "pub", "message", "io", "res"]},
                    "r": {"type": "string", "minLength": 0, "maxLength": 2000, "pattern": "^[A-Za-z0-9_/?:&+.%=-]*$"},
                    "b": {"type": ["boolean", "array", "number", "string", "object"], "minLength": 0, "maxLength": 70000000},
                    "s": {"type": ["string", "null", "undefined"], "minLength": 0, "maxLength": 45, "pattern": "^[A-Za-z0-9_]*$"}
                },
                "required": ["i", "o", "n", "m", "r", "b"]
            }
        }
        this.Response = function (obj) {
            this.send = (res) => {
                if (obj.i) {
                    let resObj = new that.DataPackage(that.origin, obj.n, 'res', obj.r, {}, obj.i);
                    if (res) resObj.b = res;
                    else resObj.b = 204;
                    that.send(resObj);
                }
            }
        }
        this.router = (msg) => {
            let obj;
            try { obj = JSON.parse(msg); } catch (e) { console.log('no json'); return; }
            if (!that.validate(obj, msg.length, this.dataPackageSchema)) {

                console.log(obj, "not allowed");
                return;
            }

            if (obj.m === 'ping') {
                that.send(new that.DataPackage(that.origin, obj.n, 'res', obj.r, 'pong', obj.i));
                if (that.networkID !== obj.n) {
                    that.networkID = obj.n;
                    this.emit('network', obj.n, that.networkID, obj);

                }
            }
            if (obj.i && obj.m === 'res') {
                if (this.packageCb.hasOwnProperty(obj.i)) {
                    this.packageCb[obj.i].callback(obj.b);
                    delete this.packageCb[obj.i];
                }
                return;
            }
            if (this.dataPackageSchema.items.properties.m.enum.includes(obj.m)) {
                this.routerCallback(obj);
            }
        }
        this.routerCallback = (obj) => {
            if (obj.i) {
                this.emit(obj.m, obj.r, obj.b, new this.Response(obj));
            } else {
                this.emit(obj.m, obj.r, obj.b);
            }
        }

        this.routineIntervalRef = setInterval(function () {
            //  if (!this.isServer) console.log('state', Object.keys(this.packageCb).length, this.packageID);
            if (this.readyState === this.CLOSED || !this.readyState) {
                if (!this.isServer)
                    this.connect(this.url, this.networkID, this.origin)
            }
            for (let key in this.packageCb) {
                if (this.timetoRequestPackage < (Date.now() - this.packageCb[key].time)) {
                    if (this.packageCb.hasOwnProperty(key)) {
                        this.packageCb[key].retry++;
                        if (this.retryAmount < this.packageCb[key].retry)
                            delete this.packageCb[key];
                        else {
                            this.packageCb[key].time = Date.now();
                            this.resend(key);
                        }
                    }
                }
            }
        }.bind(this), this.timetoRequestPackage);

        this.message =  this.new =  this.delete = this.patch = this.io =
            this.put = this.post = this.get = this.action = this.beat = (route, body, callback) => {};
        for (let value of this.dataPackageSchema.items.properties.m.enum) {
            this[value] = (route, body, callback) => {
                this.send(new this.DataPackage(this.origin, this.networkID, value, route, body), callback);
            };
        }
        this.send = (obj, callback) => {
            if (this.readyState !== this.OPEN || !obj) return;
            if (typeof callback === 'function') {
                if (this.packageID < Number.MAX_SAFE_INTEGER) {
                    this.packageID++;
                } else {
                    this.packageID = 0;
                }
                obj.i = this.packageID+this.uuidShort(4);
                this.packageCb[obj.i] = new this.CbObj(callback, Date.now(), obj);
            } else {
                if (obj.m !== 'res')
                    obj.i = null;
            }
            this.socket.send(JSON.stringify(obj));
        }
        this.resend = (id) => {
            if (this.readyState !== this.OPEN) return;
            if (this.packageCb.hasOwnProperty(id)) {
                this.socket.send(JSON.stringify(this.packageCb[id].msg));
            }
        }
        this.stateEmitter = (emitterString, statusID,) => {
            this.readyState = statusID;
            this.emit(emitterString, statusID);
            if (this.rsOld !== this.readyState) {
                this.emit('status', this.readyState);
                this.rsOld = this.readyState
            }
        }
        this.attachEvents = () => {
            if(this.envNode){
                this.socket.on('connected', () => { that.stateEmitter('connected', that.OPEN); });
                this.socket.on('connecting', () => { that.stateEmitter('connecting', that.CONNECTING); });
            }
            this.socket.onclose = () => { that.stateEmitter('close', that.CLOSED); };
            this.socket.onopen = () => { that.ping(); that.stateEmitter('open', that.OPEN); };
            this.socket.onerror = (err) => { that.emit('error', err); };
            this.socket.onmessage = (msg) => { that.router(msg.data) };
            this.close = () => { this.socket.close(); this.removeAllListeners();
                clearInterval(this.routineIntervalRef);
                clearInterval(this.netBeatIntervalRef);
            }
        }
        this.ping = () => {
            let netBeatMsg = new that.DataPackage(this.origin, this.networkID, 'ping', 'action/ping', '');
            if (that.readyState !== this.OPEN) {
                that.readyState = that.CLOSED;
                return;
            }
            try {
                that.send(netBeatMsg, (msg) => {
                    if (msg === 'pong' || msg === '')
                        that.readyState = that.OPEN;
                    else
                        that.readyState = that.CLOSED;
                }, that.socket)
            } catch (e) {
                that.readyState = that.CLOSED;
                console.log(e);
            }
        }
        this.setNetworkId = (networkId) =>  this.networkID = networkId;
    }
}

class MainIo extends ToolboxUtilities {
    constructor() {
        super();
        this.network = null;
        this.origin = null;
        this.socket = null;
        this.id = 0;
        this.routeSchema = {
            "type": "object",
            "items": {
                "properties": {
                    "n": {"type": "string", "minLength": 1, "maxLength": 25, "pattern": "^[A-Za-z0-9_]*$"}
                },
                "required": ["n"],
                "expected": ["n"],
            }
        }
    }
    attachEvents() {
        let that = this;

        this.socket.on('connected', () => {
            this.returnObject.connected = true;
            this.emit('connected'); this.emit('connection');this.emit('connect');
        });
        this.socket.on('connecting', () => { this.emit('connecting'); });
        this.socket.on('close', () => {
            this.emit('disconnect');
            this.returnObject.connected = false;
            if(this.sockets) if(this.sockets.connected) if(this.returnObject) if(this.returnObject.id){
                delete this.sockets.connected[this.returnObject.id];
            }
            this.emit('close');
            this.removeAllListeners();
        });
        this.socket.on('open', () => {

            this.returnObject.connected = true;
            this.emit('connect'); this.emit('connection');
        });
        this.socket.on('error', (err) => { this.emit('error', err);  });
        this.socket.on('io', (route, msg) => { this.emit(route, msg);
          });
    }
    connect (url, network, origin){
        if (this.socket) {
            this.returnObject.connected = false;
            this.socket.close();
            this.removeAllListeners();
        }
        this.origin = "server";
        this.network = "io";
        if (network) this.network = network;
        if (origin) this.origin = origin;
        if(typeof window !== 'undefined') {
            this.origin = "web";
        }

        if(!url && typeof window !== 'undefined') {
            let proxy = {
                route : location.pathname,
                port: location.port,
                ip: location.hostname,
                protocol: location.protocol,
                ws : "ws://"
            }
            if(proxy.protocol === 'https:'){
                proxy.ws = 'wss://'
            } else if (proxy.protocol === 'http:'){
                proxy.ws = 'ws://'}
            url = proxy.ws + proxy.ip + ':' + proxy.port + proxy.route;
        }
        if(url.indexOf("http") === 0) {
            url = url.replace('http', 'ws')
        }

        let getURLData = this.parseUrl(url, this.routeSchema);
        if(getURLData) if(getURLData.n && !network) this.network = getURLData.n

        this.socket =  new ToolSocket(url, this.network, this.origin);
        this.attachEvents();
        let that = this;
        this.returnObject = {
            on :  (route, cb) => that.on(route, (msg) => cb(msg)),
            emit: (title, message) => that.socket.io(title, message),
            connected : false
        }
        return this.returnObject;
    };

}

class ToolSocket extends MainToolboxSocket {
    constructor(url, networkID, origin) {
        super(url, networkID, origin);
        let that = this;
        this.WebSocket = null;
        this.socket = null;
        if (typeof window === 'undefined') { this.WebSocket = require('ws'); this.envNode = true;
        } else if (typeof WebSocket !== 'undefined') { this.WebSocket = WebSocket
        } else if (typeof MozWebSocket !== 'undefined') { this.WebSocket = MozWebSocket
        } else if (typeof global !== 'undefined') { this.WebSocket = global.WebSocket || global.MozWebSocket
        } else if (typeof window !== 'undefined') { this.WebSocket = window.WebSocket || window.MozWebSocket
        } else if (typeof self !== 'undefined') { this.WebSocket = self.WebSocket || self.MozWebSocket
        } else { console.log("websocket not available"); return;}

        this.netBeatIntervalRef = setInterval(() => {
            if (that.readyState === that.OPEN)
                that.ping();
        }, that.netBeatInterval);

        this.connect = (url, networkID, origin) => {
            if (networkID) that.networkID = networkID;
            if (origin) that.origin = origin;
            if (that.socket) {
                that.readyState = that.CLOSED;
                that.socket.close();
            }
            that.socket = new that.WebSocket(url);
            that.readyState = that.CONNECTING;
            this.attachEvents();
        }
        // connect for the first time when opened.
        this.connect(this.url, this.networkID, this.origin);
    }
    static Server = class Server extends ToolboxUtilities {
        constructor(param, origin) {
            super();
            if(origin) this.origin = origin; else this.origin = "server";
            if (typeof window !== 'undefined') return;
            let that = this;
            console.log('ToolSocket Server Start')
            let WebSocket = require('ws');
            this.server = new WebSocket.Server(param);
            this.server.on('connection', (socket, ...args) => {
                class Socket extends MainToolboxSocket {
                    constructor(socket) {
                        super(undefined, undefined, that.origin);
                        this._socket = socket._socket;
                        this.socket = socket;
                        this.envNode = true;
                        this.isServer = true;
                        this.readyState = this.OPEN;
                        this.attachEvents();
                    }
                }
                // todo proxy origin from main class and parameters
                that.emit('connection', new Socket(socket), ...args);
            });
        };
    }

    static Io = class Io extends MainIo {
        constructor(url, networkID, origin) {
            super(url, networkID, origin);
        }

        static Server = class Server extends ToolboxUtilities {
            constructor(param, origin) {
                super();
                if(origin) this.origin = origin; else this.origin = "server";
                if (typeof window !== 'undefined') return;
                let that = this;
                console.log('IO is waiting for ToolSocket Server')
                this.id = 1;
                this.sockets = {
                    connected : {},
                };

                this.server = new ToolSocket.Server(param);
                this.server.on('connection', (socket, ...args) => {
                    class Socket extends MainIo {
                        constructor(socket, ...args) {
                            super(socket, ...args);
                            this.socket = socket;
                            this.sockets = that.sockets;
                            this.socket.networkID = "io";
                            this.envNode = true;
                            this.isServer = true;
                            return this.connect();
                        }
                        connect(){
                            let that = this;
                            this.attachEvents();
                            this.returnObject = {
                                on :  (route, cb) => that.on(route, (msg) => cb(msg)),
                                emit:  (title, message) => that.socket.io(title, message),
                                connected : true
                            }

                            return this.returnObject;
                        }
                    }
                    if(that.id>= Number.MAX_SAFE_INTEGER) that.id = 1;
                    that.id++;
                    that.sockets.connected[that.id] = new Socket(socket);
                    that.sockets.connected[that.id].id = that.id;
                    that.emit('connection', that.sockets.connected[that.id], ...args);
                });



            };
        }

}

}



// todo I need to overwrite these emitters
// todo make sure that connections get closed



if (typeof window === 'undefined')
{  module.exports = ToolSocket;
} else {
    var io = new ToolSocket.Io();
}
