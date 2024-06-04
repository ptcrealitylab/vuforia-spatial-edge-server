import {Timer} from "../three/addons/Timer.js";

/** @typedef {number} seconds */

class DateTimer extends Timer {
    /** @type {seconds} */
    #epox;

    constructor() {
        super();
        this.#epox = Date.now() - super.getElapsed();
    }

    /**
     *
     * @returns {seconds}
     */
    getEpox() {
        return this.#epox;
    }

    /**
     *
     * @returns {seconds}
     */
    getElapsedTime() {
        return super.getElapsed() + this.#epox;
    }
}

export default DateTimer;
