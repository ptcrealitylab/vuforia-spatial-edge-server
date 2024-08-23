/**
 * This class is designed to prevent N^2 /batchedUpdate messages from frequently sending when N clients
 * are all moving around at once. We establish a short window interval (e.g. 100ms), and all /batchedUpdate
 * messages that are received within that same window are grouped together. Pending messages are sent to
 * all clients a single time per interval (rather than individually as soon as they are received).
 */
class UpdateAggregator {
    /**
     * @param {number} initialAggregationIntervalMs - the minimum interval window length, e.g. 100ms
     * @param {function} broadcastCallback – the function to call with the aggregated updates every interval
     * @param {number} rollingWindowSize - how many previous intervals, e.g. 10 or 30, to calculate the rolling average
     *                                     of the number clients currently sending messages through the server
     */
    constructor(initialAggregationIntervalMs, broadcastCallback, rollingWindowSize = 30) {
        if (typeof initialAggregationIntervalMs !== 'number' || initialAggregationIntervalMs <= 0) {
            throw new Error('initialAggregationIntervalMs must be a positive number');
        }
        if (typeof rollingWindowSize !== 'number' || rollingWindowSize <= 0) {
            throw new Error('rollingWindowSize must be a positive number');
        }
        if (typeof broadcastCallback !== 'function') {
            throw new Error('broadcastCallback must be a function');
        }

        this.baseAggregationIntervalMs = initialAggregationIntervalMs;
        this.aggregationIntervalMs = initialAggregationIntervalMs; // this updates based on number of connected clients
        this.broadcastCallback = broadcastCallback;
        this.updateBuffer = [];
        this.aggregationTimer = null;
        this.activeClients = new Set();
        this.activeClientsHistory = [];
        this.rollingWindowSize = rollingWindowSize;

        this.ENABLE_LOGGING = false;
    }

    // Method to handle incoming updates
    addUpdate(update) {
        if (!update || !update.batchedUpdates || !Array.isArray(update.batchedUpdates)) {
            console.warn('Invalid update format received');
            return;
        }

        const senderId = update.batchedUpdates.length > 0 ? update.batchedUpdates[0].editorId : null;
        if (senderId) {
            this._trackActiveClient(senderId);
        }

        this.updateBuffer.push(update);

        // Dynamically adjust the aggregation interval based on the rolling average of active clients
        this.adjustAggregationInterval();

        // Start the timer if it's not already running
        if (!this.aggregationTimer) {
            this.aggregationTimer = setTimeout(() => {
                this.aggregateAndSendUpdates();
                this.aggregationTimer = null; // Reset the timer
            }, this.aggregationIntervalMs);
        }
    }

    // Track active clients and maintain a rolling average
    _trackActiveClient(clientId) {
        this.activeClients.add(clientId);
    }

    // Update the rolling average of active clients
    _updateClientHistory(clientCount) {
        if (this.activeClientsHistory.length >= this.rollingWindowSize) {
            this.activeClientsHistory.shift(); // Remove the oldest entry
        }
        this.activeClientsHistory.push(clientCount);
    }

    // rolling average doesn't work as well ask peak usage over the window. defaults to 1 user.
    getPeakClientCount() {
        return Math.max(...this.activeClientsHistory, 1);
    }

    // Method to adjust the aggregation interval based on the rolling average of active clients
    adjustAggregationInterval() {
        const peakClientCount = this.getPeakClientCount();

        // This results in 100ms for <= 5 clients, 300ms for 15 clients, 1000ms for 50 clients
        let interval = 20 * peakClientCount;

        // Clamp the interval to be within the min and max bounds
        this.aggregationIntervalMs = Math.max(
            this.baseAggregationIntervalMs,
            Math.min(1000, interval)
        );

        if (this.ENABLE_LOGGING && this.aggregationIntervalMs !== this.baseAggregationIntervalMs) {
            console.log(`Adjusted aggregation interval to ${this.aggregationIntervalMs}ms based on ${peakClientCount} active clients.`);
        }
    }

    // Method to aggregate updates and broadcast them
    aggregateAndSendUpdates() {
        if (this.updateBuffer.length === 0) {
            return;
        }

        // Combine all updates into a single batched message
        const aggregatedUpdates = {
            batchedUpdates: [],
        };

        for (let bufferedUpdate of this.updateBuffer) {
            aggregatedUpdates.batchedUpdates.push(...bufferedUpdate.batchedUpdates);
        }

        this.updateBuffer = [];

        this._updateClientHistory(this.activeClients.size);
        this.activeClients.clear();

        this.broadcastCallback(aggregatedUpdates);
    }
}

module.exports = UpdateAggregator;
