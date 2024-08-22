/**
 * This class is designed to prevent N^2 /batchedUpdate messages from frequently sending when N clients
 * are all moving around at once. We establish a short window interval (e.g. 100ms), and all /batchedUpdate
 * messages that are received within that same window are grouped together. Pending messages are sent to
 * all clients a single time per interval (rather than individually as soon as they are received).
 */
class UpdateAggregator {
    constructor(initialAggregationIntervalMs, broadcastCallback, rollingWindowSize = 10) {
        this.baseAggregationIntervalMs = initialAggregationIntervalMs; // Base interval
        this.aggregationIntervalMs = initialAggregationIntervalMs; // Current interval
        this.broadcastCallback = broadcastCallback;
        this.updateBuffer = [];
        this.aggregationTimer = null;
        this.activeClientsHistory = []; // Store client counts for the rolling average
        this.rollingWindowSize = rollingWindowSize; // Number of updates to consider for rolling average
    }

    // Method to handle incoming updates
    addUpdate(update) {
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
        const currentClientCount = this.activeClientsHistory.length > 0
            ? this.activeClientsHistory[this.activeClientsHistory.length - 1]
            : 0;

        // If the client is new, increment the count
        if (!this.activeClientsHistory.includes(clientId)) {
            const newClientCount = currentClientCount + 1;
            this._updateClientHistory(newClientCount);
        }
    }

    // Update the rolling average of active clients
    _updateClientHistory(clientCount) {
        if (this.activeClientsHistory.length >= this.rollingWindowSize) {
            this.activeClientsHistory.shift(); // Remove the oldest entry
        }
        this.activeClientsHistory.push(clientCount);
    }

    // Method to calculate the rolling average of active clients
    getRollingAverageClientCount() {
        const total = this.activeClientsHistory.reduce((sum, count) => sum + count, 0);
        return total / this.activeClientsHistory.length;
    }

    // Method to adjust the aggregation interval based on the rolling average of active clients
    adjustAggregationInterval() {
        const avgClientCount = this.getRollingAverageClientCount();

        // Apply the linear formula: y = 23.33 * x - 166.6
        // this results in 100ms for fewer clients, 300ms for 20 clients, 1000ms for 50 clients
        let interval = 23.33 * avgClientCount - 166.6;

        // Clamp the interval to be within the min and max bounds
        this.aggregationIntervalMs = Math.max(
            this.baseAggregationIntervalMs,
            Math.min(1000, interval)
        );
    }

    // Method to aggregate updates and broadcast them
    aggregateAndSendUpdates() {
        if (this.updateBuffer.length === 0) {
            return;
        }

        // Combine all updates into a single batched message
        let aggregatedUpdates = {
            batchedUpdates: [],
        };

        for (let bufferedUpdate of this.updateBuffer) {
            aggregatedUpdates.batchedUpdates.push(...bufferedUpdate.batchedUpdates);
        }

        this.updateBuffer = [];
        this.broadcastCallback(aggregatedUpdates);
    }
}

module.exports = UpdateAggregator;
