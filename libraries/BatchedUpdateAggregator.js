/**
 * This class is designed to prevent N^2 /batchedUpdate messages from frequently sending when N clients
 * are all moving around at once. We establish a short window interval (e.g. 100ms), and all /batchedUpdate
 * messages that are received within that same window are grouped together. Pending messages are sent to
 * all clients a single time per interval (rather than individually as soon as they are received).
 */
class BatchedUpdateAggregator {
    /**
     * @param {Function} broadcastCallback - The function to call with the aggregated updates every interval.
     * @param {Object} [options] - Optional configuration object.
     * @param {number} [options.minAggregationIntervalMs=33] - The minimum interval (in milliseconds) between aggregations. Defaults to 33ms.
     * @param {number} [options.maxAggregationIntervalMs=1000] - The maximum interval (in milliseconds) between aggregations. Defaults to 1000ms.
     * @param {number} [options.rollingWindowSize=30] - The size of the rolling window used to calculate the average or peak number of active clients. Defaults to 30.
     */
    constructor(broadcastCallback, options = { minAggregationIntervalMs: 33, maxAggregationIntervalMs: 1000, rollingWindowSize: 30 }) {
        if (typeof options.minAggregationIntervalMs !== 'number' || options.minAggregationIntervalMs <= 0) {
            throw new Error('minAggregationIntervalMs must be a positive number');
        }
        if (typeof options.maxAggregationIntervalMs !== 'number' || options.maxAggregationIntervalMs <= 0) {
            throw new Error('maxAggregationIntervalMs must be a positive number');
        }
        if (typeof options.rollingWindowSize !== 'number' || options.rollingWindowSize <= 0) {
            throw new Error('rollingWindowSize must be a positive number');
        }
        if (typeof broadcastCallback !== 'function') {
            throw new Error('broadcastCallback must be a function');
        }

        this.minAggregationIntervalMs = options.minAggregationIntervalMs;
        this.maxAggregationIntervalMs = options.maxAggregationIntervalMs;
        this.aggregationIntervalMs = options.minAggregationIntervalMs; // this updates based on number of connected clients
        this.broadcastCallback = broadcastCallback;
        this.updateBuffer = [];
        this.aggregationTimer = null;
        this.activeClients = new Set();
        this.activeClientsHistory = [];
        this.rollingWindowSize = options.rollingWindowSize;

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

        // this.updateBuffer.push(update);
        this.pushUpdateToBuffer(update);

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

    // there's no reason to send multiple messages updating the same property, so remove old identical queued messages
    // before adding the newest one to the updateBuffer. These will be sent out in `aggregateAndSendUpdates`
    pushUpdateToBuffer(update) {
        const { batchedUpdates } = update;

        // Loop over each update in the batchedUpdates array
        batchedUpdates.forEach(newUpdate => {
            const { objectKey, frameKey, nodeKey, propertyPath, editorId } = newUpdate;

            // Filter out any existing updates in the buffer that match the criteria
            this.updateBuffer = this.updateBuffer.filter(existingUpdate => {
                return !existingUpdate.batchedUpdates.some(existingBatchedUpdate => {
                    return (
                        existingBatchedUpdate.objectKey === objectKey &&
                        existingBatchedUpdate.frameKey === frameKey &&
                        existingBatchedUpdate.nodeKey === nodeKey &&
                        existingBatchedUpdate.propertyPath === propertyPath &&
                        existingBatchedUpdate.editorId === editorId
                    );
                });
            });
        });

        // Add the new update to the buffer
        this.updateBuffer.push(update);
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

    adjustAggregationInterval() {
        const peakClientCount = this.getPeakClientCount();

        // Set your desired BandwidthCap (number of messages per time window) and TimeWindow (e.g., 5 seconds)
        const BandwidthCap = 1000;  // Example value, adjust based on your capacity
        const TimeWindow = 5000; // 5 seconds in milliseconds

        // Calculate the interval needed to keep traffic under the BandwidthCap
        // this increases quadratically: 30ms when 3 clients, 100ms when 5, 450ms when 10, caps at 1000 when 15+
        let interval = (TimeWindow * peakClientCount * (peakClientCount - 1)) / BandwidthCap;

        // Clamp the interval to be within the min and max bounds
        this.aggregationIntervalMs = Math.max(
            this.minAggregationIntervalMs,
            Math.min(this.maxAggregationIntervalMs, interval)
        );

        if (this.ENABLE_LOGGING && this.aggregationIntervalMs !== this.minAggregationIntervalMs) {
            console.log(`Adjusted aggregation interval to ${this.aggregationIntervalMs}ms based on ${peakClientCount} peak active clients.`);
        }
    }

    // Method to aggregate multiple batchedUpdates into a single batchedUpdate and broadcast them
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

module.exports = BatchedUpdateAggregator;
