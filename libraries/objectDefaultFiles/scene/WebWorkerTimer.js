/**
 * @typedef {number} milliseconds
 */

/** @type {milliseconds} */
let period = 40;

/**
 * @param {MessageEvent<{period: milliseconds}>} event
 */
function onSetPeriod(event) {
    period = event.data.period;
}

self.onmessage = onSetPeriod;

setInterval(() => postMessage(""), period);
