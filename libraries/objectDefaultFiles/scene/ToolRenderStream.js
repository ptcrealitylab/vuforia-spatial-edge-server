/**
 * @typedef {import("./ValueNode").ValueDict} ValueDict
 * @typedef {{update: () => void, sendGet: () => void, sendSet: (state: ValueDict) => void, sendUpdate: (delta: ValueDict) => void, onReceivedGet: () => void, onReceivedSet: () => void, onReceivedUpdate: () => void, setListener: (listener: ToolRenderInterface) => void}} ToolRenderInterface
 */

class ToolRenderSocket {
    static V1 = "ToolRendererV1";
    static CMD_GET = "get";
    static CMD_SET = "set";
    static CMD_UPDATE = "update";

    /** @type {import('./MessageInterface').MessageInterface} */
    #messageInterface;

    /** @type {ToolRenderInterface | null} */
    #listener;

    /**
     *
     * @param {import('./MessageInterface').MessageInterface} messageInterface
     */
    constructor(messageInterface) {
        this.#messageInterface = messageInterface;
        this.#messageInterface.setOnMessage((event) => {
            this.onMessage(event.data);
        });
    }

    sendGet() {
        this.#messageInterface.postMessage({protocol: ToolRenderSocket.V1, command: ToolRenderSocket.CMD_GET});
    }

    sendSet(delta) {
        this.#messageInterface.postMessage({protocol: ToolRenderSocket.V1, command: ToolRenderSocket.CMD_SET, delta: delta});
    }

    sendUpdate(delta) {
        this.#messageInterface.postMessage({protocol: ToolRenderSocket.V1, command: ToolRenderSocket.CMD_UPDATE, delta: delta});
    }

    onMessage(msg) {
        if (this.#listener && msg.protocol === ToolRenderSocket.V1) {
            if (msg.command === ToolRenderSocket.CMD_UPDATE) {
                this.#listener.onReceivedUpdate(msg.delta);
            } else if (msg.command === ToolRenderSocket.CMD_SET) {
                this.#listener.onReceivedSet(msg.delta);
            } else if (msg.command === ToolRenderSocket.CMD_GET) {
                this.#listener.onReceivedGet();
            }
        }
    }

    setListener(listener) {
        this.#listener = listener;
    }
}


export { ToolRenderSocket };
