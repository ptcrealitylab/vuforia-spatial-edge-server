///todo make callback dependent on network call
/**
 * Copyright (c) 2021 PTC
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/
 */

/**
 * Refactor out parsing, all classes (cbobj, cbsub, DataPackage, Socket), the WebSocket polyfill
 * add failure reasons to validation
 */

class ToolboxUtilities {
    constructor() {
        this.eCb = {};
        if (typeof TextDecoder === 'undefined' && typeof require !== 'undefined') {
            let util = require('util');
            this.dec = new util.TextDecoder();
            this.enc = new util.TextEncoder();
        } else {
            this.dec = new TextDecoder();
            this.enc = new TextEncoder();
        }
    }

    on(e, ...args) {
        if (!this.eCb[e]) {
            this.eCb[e] = [];
        }
        this.eCb[e].push(...args);
    }

    emitInt(e, ...args) {
        if (!this.eCb[e]) {
            return;
        }
        this.eCb[e].forEach(cb => cb(...args));
    }

    removeAllListeners() {
        for (let k in this.eCb) {
            delete this.eCb[k];
        }
    }

    intToByte(num) {
        return [
            (num >> 24) & 255,
            (num >> 16) & 255,
            (num >> 8) & 255,
            num & 255,
        ];
    }

    byteToInt(num) {
        return (
            (num[num.length - 1]) |
        (num[num.length - 2] << 8) |
        (num[num.length - 3] << 16) |
        (num[num.length - 4] << 24)
        );
    }

    validate(obj, msgLength, schema) {
        if (typeof obj !== "object") {
            return false; // for now only objects
        }

        let validString = (obj, p, key) => {
            if (typeof obj[key] !== 'string') return false; // this if is a hack to test for null as well
            if (Number.isInteger(p[key].minLength)) if (obj[key].length < p[key].minLength) return false;
            if (Number.isInteger(p[key].maxLength)) if (obj[key].length > p[key].maxLength) return false;
            if (p[key].pattern) if (!obj[key].match(p[key].pattern)) return false;
            if (p[key].enum) if (!p[key].enum.includes(obj[key])) return false;
            return true;
        };
        let validInteger = (obj, p, key) => {
            if (!Number.isInteger(obj[key])) {
                return false;
            }
            if (Number.isInteger(p[key].minimum)) {
                if (obj[key] < p[key].minimum) {
                    return false;
                }
            }
            if (Number.isInteger(p[key].maximum)) {
                if (obj[key] > p[key].maximum) {
                    return false;
                }
            }
            return true;
        };
        let validNull = (obj, p, key) => {
            if (obj.m === "res" && obj[key] === null) {
                return false;
            }
            return obj[key] === null;
        };
        let validBoolean = (obj, p, key) => {
            return typeof obj[key] === 'boolean';
        };
        let validNumber = (obj, p, key) => {
            return typeof obj[key] === 'number';
        };
        let validUndefined = (obj, p, key) => {
            return !obj[key];
        };
        let validArray = (obj, p, key, msgLength) => {
            if (!Array.isArray(obj[key])) return false;

            if (Number.isInteger(p[key].minLength) && msgLength < p[key].minLength) return false;
            if (Number.isInteger(p[key].maxLength) && msgLength > p[key].maxLength) return false;
            return true;
        };
        let validObject = (obj, p, key, msgLength) => {
            if (typeof obj[key] !== 'object') return;
            if (Number.isInteger(p[key].minLength) && msgLength < p[key].minLength) return false;
            if (Number.isInteger(p[key].maxLength) && msgLength > p[key].maxLength) return false;
            return true;
        };
        let validKey = (obj, p, key) => {
            return p.hasOwnProperty(key);
        };
        let validRequired = (obj, required) => {
            for (let key in required) {
                if (!obj.hasOwnProperty(required[key])) {
                    return false;
                }
            }
            return true;
        };
        let p = schema.items.properties;
        let verdict = true;
        for (let key in obj) {
            if (validKey(obj, p, key)) {
                let evaluate = false;
                if (p[key].type.includes("string") && validString(obj, p, key)) evaluate = true;
                if (p[key].type.includes("integer") && validInteger(obj, p, key)) evaluate = true;
                if (p[key].type.includes("null") && validNull(obj, p, key)) evaluate = true;
                if (p[key].type.includes("boolean") && validBoolean(obj, p, key)) evaluate = true;
                if (p[key].type.includes("number") && validNumber(obj, p, key)) evaluate = true;
                if (p[key].type.includes("array") && validArray(obj, p, key, msgLength)) evaluate = true; // use msg for length to simplify / speedup
                if (p[key].type.includes("object") && validObject(obj, p, key, msgLength)) evaluate = true; // use msg for length to simplify / speedup
                if (p[key].type.includes("undefined") && validUndefined(obj, p, key)) evaluate = true;
                if (!evaluate) verdict = false;
            } else verdict = false;
        }
        if (!validRequired(obj, schema.items.required)) {
            verdict = false;
        }
        return verdict;
    }

    parseUrl(url, schema) {
        let urlProtocol = url.split("://");
        let protocol = null;
        let server = null;
        let port = null;
        if (urlProtocol && urlProtocol[1]) {
            url = urlProtocol[1];
            protocol = urlProtocol[0];
        }
        let urlSplit = url.split("/");
        if (protocol) {
            server = urlSplit[0];
            urlSplit.shift();
            let serverSplit = server.split(":");
            server = serverSplit[0];
            if (serverSplit[1]) {
                port = parseInt(Number(serverSplit[1]));
            }
        }
        let res = {};
        let route = "";
        let querySplit = [];
        if (urlSplit[urlSplit.length - 1]) querySplit = urlSplit[urlSplit.length - 1].split("?");
        let fileSplit = null;
        if (querySplit) if (querySplit[0]) {
            fileSplit = querySplit[0].split(".");
            if (querySplit[1]) {
                urlSplit[urlSplit.length - 1] = querySplit[0];
            }
        }
        try {
            if (!schema.items.properties.type) schema.items.properties.type = {"type": "string", "minLength": 1, "maxLength": 5, "enum": ["jpg", "jpeg", "gif", "zip", "glb", "html", "map", "htm", "xml", "dat", "png", "js", "json", "obj", "fbx", "svg", "mp4", "pdf", "csv", "css", "woff", "otf", "webm", "webp", "ttf"]};
            if (!schema.items.properties.protocol) schema.items.properties.protocol = {"type": "string", "minLength": 1, "maxLength": 20, "enum": ["spatialtoolbox", "ws", "wss", "http", "https"]};
            if (!schema.items.properties.query) schema.items.properties.query = {"type": "string", "minLength": 0, "maxLength": 2000, "pattern": "^[A-Za-z0-9~!@$%^&*()-_=+{}|;:,./?]*$"};
            if (!schema.items.properties.route )  schema.items.properties.route = {"type": "string", "minLength": 0, "maxLength": 2000, "pattern": "^[A-Za-z0-9/~!@$%^&*()-_=+|;:,.]*$"};
            if (!schema.items.properties.server)  schema.items.properties.server = {"type": "string", "minLength": 0, "maxLength": 2000, "pattern": "^[A-Za-z0-9~!@$%^&*()-_=+|;:,.]*$"};
            if (!schema.items.properties.port )  schema.items.properties.port = {"type": "number", "min": 0, "max": 99999};
            for (let i = 0;i < urlSplit.length;i++) {
                if (schema.items.expected.includes(urlSplit[i])) {
                    if (urlSplit[i + 1]) {
                        res[urlSplit[i]] = urlSplit[i + 1];
                    }
                    i++;
                } else if (urlSplit[i]) {
                    route = route + '/' + urlSplit[i];
                }
            }
        } catch (e) {
            return null;
        }
        if (querySplit && querySplit[1]) {
            res.query = querySplit[1];
        }
        if (route) {
            res.route = route;
        }
        if (server) {
            res.server = server;
        }
        if (protocol) {
            res.protocol = protocol;
        }
        if (port) {
            res.port = port;
        }
        if (fileSplit && fileSplit.length > 1) {
            res.type = fileSplit[fileSplit.length - 1];
        }

        if (this.validate(res, url.length, schema)) {
            return res;
        } else {
            return null;
        }
    }

    uuidShort(length) {
        let abcUuid = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", uuid = "";
        while (uuid.length < length) {
            uuid = abcUuid.charAt(Math.floor(Math.random() * abcUuid.length)) + uuid;
        }
        return uuid;
    }
}

class MainToolboxSocket extends ToolboxUtilities {
    constructor(url, networkID, origin) {
        super();
        let that = this;
        this.retryAmount = 5;
        this.timetoRequestPackage = 3000;
        this.netBeatInterval = 2000;
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
        this.binaryBuffer = [];
        this.bufferLength = 0;
        this.routineIntervalRef = null;
        this.netBeatIntervalRef = null;
        this.envNode = (typeof window === 'undefined');
        this.isServer = false;
        this.CbObj = function (callback, time, objBin) {
            this.callback = callback;
            this.time = time;
            this.retry = 0;
            this.objBin = objBin;
        };
        this.CbSub = function (route, socket) {
            this.route = route;
            this.socket = socket;
            //sub and pub are acknowledged. pub is not acknowledged
            // user subscribes, pub message is forwarded to all subscribers. if socket ends or subscription ends
        };
        this.DataPackage = function (origin, network, method, route, body, id = null) {
            this.i = id;
            this.o = origin;
            this.n = network;
            this.m = method;
            this.r = route;
            this.b = body;
            this.s = null;
        };
        this.dataPackageSchema = {
            "type": "object",
            "items": {
                "properties": {
                    "i": {"type": ["string", "null", "undefined"], "minLength": 1, "maxLength": 22, "pattern": "^[A-Za-z0-9_]*$"},
                    "o": {"type": "string", "minLength": 1, "maxLength": 10, "enum": ["server", "client", "web", "edge", "proxy"]},
                    "n": {"type": "string", "minLength": 1, "maxLength": 25, "pattern": "^[A-Za-z0-9_]*$"},
                    "m": {"type": "string", "minLength": 1, "maxLength": 10, "enum": ["beat", "action", "ping", "get", "post", "put", "patch", "delete", "new", "unsub", "sub", "pub", "message", "io", "res", "keys"]},
                    "r": {"type": "string", "minLength": 0, "maxLength": 2000, "pattern": "^[A-Za-z0-9_/?:&+.%=-]*$"},
                    "b": {"type": ["boolean", "array", "number", "string", "object"], "minLength": 0, "maxLength": 70000000},
                    "s": {"type": ["string", "null", "undefined"], "minLength": 0, "maxLength": 45, "pattern": "^[A-Za-z0-9_]*$"},
                    "f": {"type": ["number", "null", "undefined"], "min": 1, "max": 99},
                },
                "required": ["i", "o", "n", "m", "r", "b"]
            }
        };
        this.Response = function (obj) {
            this.send = (res, data) => {
                if (obj.i) {
                    if (data) {
                        if (!data.data) {
                            console.log("data object required {data: dataObject}");
                            return;
                        }
                    } else {
                        data = null;
                    }
                    let resObj = {
                        obj: new that.DataPackage(that.origin, obj.n, 'res', obj.r, {}, obj.i),
                        bin: data
                    };
                    if (res) {
                        resObj.obj.b = res;
                    } else {
                        resObj.obj.b = 204;
                    }
                    that.send(resObj, null);
                }
            };
        };

        this.router = (msg) => {
            let msgLength = 0;
            let objBin = {obj: {}, bin: {}};
            if (typeof msg !== "string") {
                if (this.bufferLength) {
                    this.binaryBuffer.push(msg);
                    if (this.binaryBuffer.length <= this.bufferLength) return;
                    objBin.obj = this.binaryBuffer[0];
                    objBin.bin.data = [];
                    for (let i = 1; i < this.binaryBuffer.length; i++) {
                        objBin.bin.data.push(this.binaryBuffer[i]);
                    }
                    this.bufferLength = 0;
                    this.binaryBuffer = [];
                    msgLength = this.binaryBuffer.byteLength;
                } else {
                    objBin = this.readBinary(msg);
                    msgLength = msg.byteLength;
                    if (!objBin.bin.data.byteLength) {
                        objBin.bin.data = null;
                    }
                }
            } else {
                objBin = {obj: JSON.parse(msg), bin: {data: null}};
                msgLength = msg.length;
                if (objBin.obj.f) {
                    this.binaryBuffer = [];
                    this.bufferLength = objBin.obj.f;
                    this.binaryBuffer.push(objBin.obj);
                    return;
                }
            }

            // todo Needs some extra testing to check if the size limit works out.
            if (typeof objBin.obj !== "object") return;
            if (typeof objBin.obj.b === "undefined") return;

            if (!that.validate(objBin.obj, msgLength, this.dataPackageSchema)) {
                // console.log(objBin.obj.r,"not allowed");
                console.log("not allowed");
                return;
            }
            if (objBin.obj.m === 'ping') {
                if (that.networkID !== objBin.obj.n) {
                    this.emitInt('network', objBin.obj.n, that.networkID, objBin.obj);
                    that.networkID = objBin.obj.n;
                }
            }
            if (objBin.obj.i && objBin.obj.m === 'res') {
                if (this.packageCb.hasOwnProperty(objBin.obj.i)) {
                    this.packageCb[objBin.obj.i].callback(objBin.obj.b, objBin.bin);
                    delete this.packageCb[objBin.obj.i];
                }
                return;
            }
            if (this.dataPackageSchema.items.properties.m.enum.includes(objBin.obj.m)) {
                this.routerCallback(objBin);
            }
        };
        this.routerCallback = (objBin) => {
            if (objBin.obj.i) {
                this.emitInt(objBin.obj.m, objBin.obj.r, objBin.obj.b, new this.Response(objBin.obj), objBin.bin);
            } else {
                this.emitInt(objBin.obj.m, objBin.obj.r, objBin.obj.b, null, objBin.bin);
            }
        };

        this.routineIntervalRef = setInterval(() => {
            if (this.readyState === this.CLOSED || !this.readyState) {
                if (!this.isServer) {
                    this.connect(this.url, this.networkID, this.origin);
                }
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
        }, this.timetoRequestPackage);

        this.message = this.new = this.delete = this.patch = this.io = this.put = this.post = this.get = this.action = this.keys = this.beat = this.ping = (_route, _body, _callback) => {};

        for (let value of this.dataPackageSchema.items.properties.m.enum) {
            this[value] = (route, body, callback, dataObject) => {
                if (dataObject) {
                    if (!dataObject.data) {
                        console.log("your binary must be a data object {data: binaryData}");
                        return;
                    }
                } else {
                    dataObject = {data: null};
                }
                let objBin = {
                    obj: new this.DataPackage(this.origin, this.networkID, value, route, body),
                    bin: dataObject
                };
                this.send(objBin, callback);

            };
        }
        this.createBinary = (objBin) => {
            let bytes = null;
            let jsonBuffer = this.enc.encode(JSON.stringify(objBin.obj));
            if (this.envNode) {
                let jsonBufferLength = Buffer.from(this.intToByte(jsonBuffer.byteLength));
                bytes = Buffer.concat([jsonBufferLength, jsonBuffer, objBin.bin.data]);
                return bytes;
            } else {
                let binaryBuffer = objBin.bin.data ? Uint8Array.from(objBin.bin.data) : null;
                let jsonBufferLength = Uint8Array.from(this.intToByte(jsonBuffer.byteLength));
                let binaryBuffer2Length = 0;
                if (binaryBuffer) binaryBuffer2Length =  binaryBuffer.byteLength;
                let bytes = new Uint8Array(jsonBufferLength.byteLength + jsonBuffer.byteLength + binaryBuffer2Length);
                bytes.set(jsonBufferLength, 0);
                bytes.set(jsonBuffer, jsonBufferLength.byteLength);
                if (binaryBuffer)
                    bytes.set(binaryBuffer, jsonBufferLength.byteLength + jsonBuffer.byteLength);
                return bytes;
            }
        };
        this.readBinary = (msgBuffer) => {
            let getJsonBufferLength = this.byteToInt(msgBuffer.slice(0, 4));
            let resultJsonBuffer = JSON.parse(this.dec.decode(msgBuffer.slice(4, getJsonBufferLength + 4)));
            let resultBinaryBuffer = msgBuffer.slice(getJsonBufferLength + 4, msgBuffer.byteLength);
            return {obj: resultJsonBuffer, bin: {data: resultBinaryBuffer}};
        };

        this.send = (objBin, callback) => {
            if (this.readyState !== this.OPEN || !objBin.obj) return;
            if (typeof callback === 'function') {
                if (this.packageID < Number.MAX_SAFE_INTEGER) {
                    this.packageID++;
                } else {
                    this.packageID = 0;
                }
                objBin.obj.i = this.packageID + this.uuidShort(4);
                this.packageCb[objBin.obj.i] = new this.CbObj(callback, Date.now(), objBin);
            } else if (objBin.obj.m !== 'res') {
                objBin.obj.i = null;
            }
            if (objBin.bin && objBin.bin.data) {
                if (Array.isArray(objBin.bin.data)) {
                    objBin.obj.f = objBin.bin.data.length;
                    this.socket.send(JSON.stringify(objBin.obj), {binary: false});
                    for (let i = 0; i < objBin.bin.data.length; i++) {
                        this.socket.send(objBin.bin.data[i], {binary: true});
                    }
                } else {
                    this.socket.send(this.createBinary(objBin), {binary: true});
                }
                return;
            }
            objBin.obj.f = null;
            this.socket.send(JSON.stringify(objBin.obj), {binary: false});
        };
        this.resend = (id) => {
            if (this.readyState !== this.OPEN) {
                return;
            }

            if (this.packageCb.hasOwnProperty(id) && this.packageCb[id].objBin.bin) {
                if (this.packageCb[id].objBin.bin.data) {
                    if (Array.isArray(this.packageCb[id].objBin.bin.data)) {
                        this.packageCb[id].objBin.obj.f = this.packageCb[id].objBin.bin.data.length;
                        this.socket.send(JSON.stringify(this.packageCb[id].objBin.obj), {binary: false});
                        for (let i = 0; i < this.packageCb[id].objBin.bin.data.length; i++) {
                            this.socket.send(this.packageCb[id].objBin.bin.data[i], {binary: true});
                        }
                    } else {
                        this.socket.send(this.createBinary(this.packageCb[id].objBin), {binary: true});
                    }
                } else {
                    this.socket.send(JSON.stringify(this.packageCb[id].objBin.obj), {binary: false});
                }
            }
        };
        this.stateEmitter = (emitterString, statusID) => {
            this.readyState = statusID;
            this.emitInt(emitterString, statusID);
            if (this.rsOld !== this.readyState) {
                this.emitInt('status', this.readyState);
                this.rsOld = this.readyState;
            }
        };
        this.attachEvents = () => {
            if (this.envNode) {
                this.socket.on('connected', () => {
                    that.readyState = that.OPEN;
                    that.stateEmitter('connected', that.OPEN);
                });
                this.socket.on('connecting', () => {
                    that.readyState = that.CONNECTING;
                    that.stateEmitter('connecting', that.CONNECTING);
                });
            }
            this.socket.onclose = () => {
                that.readyState = that.CLOSED;
                that.stateEmitter('close', that.CLOSED);
                this.closer();
            };
            this.socket.onopen = () => {
                that.readyState = that.OPEN;
                that.stateEmitter('open', that.OPEN);
                that.pingInt();
            };

            if (this.envNode) {
                this.socket.onmessage = (msg) => {
                    that.router(msg.data);
                };
            } else {
                this.socket.onmessage = async (msg) => {
                    if (typeof msg.data !== "string")
                        that.router(new Uint8Array(await msg.data.arrayBuffer()));
                    else
                        that.router(msg.data);
                };
            }
            this.close = () => {
                this.socket.close();
                clearInterval(this.routineIntervalRef);
                clearInterval(this.netBeatIntervalRef);
                this.routineIntervalRef = null;
                this.netBeatIntervalRef = null;
                this.removeAllListeners();
                if (this.sockets) if (this.sockets.connected) if (this.id) delete this.sockets.connected[this.id];
                this.closer();
                return "closed";
            };
            this.closer = () => {

            };
        };
        this.on('ping', function (route, msg, res) {
            res.send("pong");
        });
        this.pingInt = () => {
            if (that.readyState !== this.OPEN) {
                that.readyState = that.CLOSED;
                return;
            }
            try {
                this.ping('action/ping', 'ping', function (msg) {
                    if (msg === 'pong') {
                        that.emitInt("pong");
                        that.readyState = that.OPEN;
                    } else
                        that.readyState = that.CLOSED;
                });
            } catch (e) {
                that.readyState = that.CLOSED;
                console.log(e);
            }
        };
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
        };

    }
    attachEvents() {
        this.emit = (title, message, data) => {
            this.socket.io(title, message, null, data);
        };
        this.socket.on('connected', () => {
            this.connected = true;
            this.emitInt('connected');
            this.emitInt('connect');
        });
        this.socket.on('connecting', () => {
            this.emitInt('connecting');
        });
        this.socket.on('close', () => {
            this.emitInt('disconnect');
            this.closer();
        });
        this.socket.on('open', () => {
            this.connected = true;
            this.emitInt('connect');
        });
        this.socket.on('error', (err) => {
            this.emitInt('error', err);
        });
        this.socket.on('io', (route, msg, res, data) => {
            this.emitInt(route, msg, data);
        });
        this.close = () => {
            this.socket.close();
            this.removeAllListeners();
            this.closer();
        };
        this.closer = () => {
            this.connected = false;
            if (this.sockets && this.sockets.connected && this.id) {
                delete this.sockets.connected[this.id];
            }
            this.emitInt('close');
        };
    }
    connect (url, network, origin) {
        if (this.socket) {
            this.connected = false;
            this.socket.close();
            this.removeAllListeners();
        }
        this.origin = "server";
        this.network = "io";
        if (network) this.network = network;
        if (origin) this.origin = origin;
        if (typeof window !== 'undefined') this.origin = "web";

        if (!url && typeof window !== 'undefined') {
            let proxy = {
                route: location.pathname,
                port: location.port,
                ip: location.hostname,
                protocol: location.protocol,
                ws: "ws://"
            };
            if (proxy.protocol === 'https:') {
                proxy.ws = 'wss://';
            } else if (proxy.protocol === 'http:') {
                proxy.ws = 'ws://';
            }
            url = proxy.ws + proxy.ip + ':' + proxy.port + proxy.route;
        }
        if (url.indexOf("http") === 0) {
            url = url.replace('http', 'ws');
        }

        let getURLData = this.parseUrl(url, this.routeSchema);
        if (getURLData && getURLData.n && !network) {
            this.network = getURLData.n;
        }

        this.socket = new ToolSocket(url, this.network, this.origin);
        this.attachEvents();
        return this;
    }
}
class ToolSocket extends MainToolboxSocket {
    constructor(url, networkID, origin) {
        super(url, networkID, origin);
        let that = this;
        this.WebSocket = null;
        this.socket = null;
        if (typeof window === 'undefined') {
            this.WebSocket = require('ws');
            this.envNode = true;
        } else if (typeof WebSocket !== 'undefined') {
            this.WebSocket = WebSocket;
        } else if (typeof MozWebSocket !== 'undefined') {
            // eslint-disable-next-line no-undef
            this.WebSocket = MozWebSocket;
        } else if (typeof global !== 'undefined') {
            this.WebSocket = global.WebSocket || global.MozWebSocket;
        } else if (typeof window !== 'undefined') {
            this.WebSocket = window.WebSocket || window.MozWebSocket;
        } else if (typeof self !== 'undefined') {
            this.WebSocket = self.WebSocket || self.MozWebSocket;
        } else {
            console.log("websocket not available");
            return;
        }

        this.netBeatIntervalRef = setInterval(() => {
            if (that.readyState === that.OPEN)
                that.pingInt();
        }, that.netBeatInterval);

        this.connect = (url, networkID, origin) => {
            if (networkID) that.networkID = networkID;
            if (origin) that.origin = origin;
            if (that.socket) {
                that.readyState = that.CLOSED;
                that.socket.close();
            }
            that.socket = new that.WebSocket(url);
            that.socket.onerror = (err) => {
                that.emitInt('error', err);
            };
            that.readyState = that.CONNECTING;
            that.attachEvents();

        };
        // connect for the first time when opened.
        this.connect(this.url, this.networkID, this.origin);
    }
}
ToolSocket.Server = class Server extends ToolboxUtilities {
    constructor(param, origin) {
        super();
        this.origin = origin || 'server';
        if (typeof window !== 'undefined') {
            return;
        }
        let that = this;
        this.socketID = 1;
        this.webSockets = {
        };
        console.log('ToolSocket Server Start');
        let WebSocket = require('ws');
        this.server = new WebSocket.Server(param);
        this.server.on('connection', (socket, ...args) => {
            class Socket extends MainToolboxSocket {
                constructor(socket) {
                    super(undefined, undefined, that.origin);
                    this._socket = socket._socket;
                    this.socket = socket;
                    if (!this.networkID) this.networkID = "toolbox";
                    this.envNode = true;
                    this.isServer = true;
                    this.readyState = this.OPEN;
                    this.attachEvents();
                }
            }

            if (this.socketID >= Number.MAX_SAFE_INTEGER) this.socketID = 1;
            this.socketID++;
            this.webSockets[this.socketID] = new Socket(socket);
            this.webSockets[this.socketID].id = this.socketID + '';
            that.emitInt('connection', this.webSockets[this.socketID], ...args);

            // todo proxy origin from main class and parameters
            //  that.emitInt('connection', new Socket(socket), ...args);
        });
    }
};

ToolSocket.Io = class Io extends MainIo {
    constructor(url, networkID, origin) {
        super(url, networkID, origin);
    }
};

ToolSocket.Io.Server = class Server extends ToolboxUtilities {
    constructor(param, origin) {
        super();
        this.origin = origin || 'server';
        if (typeof window !== 'undefined') {
            return;
        }
        console.log('IO is waiting for ToolSocket Server');
        let that = this;
        this.id = 1;
        this.sockets = {
            connected: {},
        };
        this.server = new ToolSocket.Server(param);
        this.server.on('connection', (socket, ...args) => {
            class Socket extends MainIo {
                constructor(socket) {
                    super(undefined, undefined, that.origin);
                    this.socket = socket;
                    if (!this.socket.networkID) this.socket.networkID = "io";
                    this.envNode = true;
                    this.isServer = true;
                    this.connected = true;
                    this.attachEvents();
                }
            }
            if (this.id >= Number.MAX_SAFE_INTEGER) this.id = 1;
            this.id++;
            this.sockets.connected[this.id] = new Socket(socket);
            this.sockets.connected[this.id].id = this.id + '';
            this.emitInt('connection', this.sockets.connected[this.id], ...args);
        });
    }
};

// todo make sure that connections get closed
if (typeof window === 'undefined') {
    module.exports = ToolSocket;
} else {
    window.io = new ToolSocket.Io();
}
