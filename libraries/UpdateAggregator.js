/**
 * This class is designed to prevent N^2 /batchedUpdate messages from frequently sending when N clients
 * are all moving around at once. We establish a short window interval (e.g. 100ms), and all /batchedUpdate
 * messages that are received within that same window are grouped together. Pending messages are sent to
 * all clients a single time per interval (rather than individually as soon as they are received).
 */
class UpdateAggregator {
    constructor(aggregationIntervalMs, broadcastCallback) {
        this.aggregationIntervalMs = aggregationIntervalMs;
        this.broadcastCallback = broadcastCallback; // Callback to handle broadcasting the aggregated updates
        this.updateBuffer = [];
        this.aggregationTimer = null;
    }

    // Method to handle incoming updates
    addUpdate(update) {
        this.updateBuffer.push(update);

        // Start the timer if it's not already running
        if (!this.aggregationTimer) {
            this.aggregationTimer = setTimeout(() => {
                this.aggregateAndSendUpdates();
                this.aggregationTimer = null; // Reset the timer
            }, this.aggregationIntervalMs);
        }
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

        // Clear the buffer
        this.updateBuffer = [];

        // Call the provided callback to broadcast the aggregated updates
        this.broadcastCallback(aggregatedUpdates);
    }
}

module.exports = UpdateAggregator;
