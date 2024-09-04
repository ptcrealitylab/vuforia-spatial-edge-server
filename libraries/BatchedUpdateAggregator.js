/**
 * This class is designed to prevent N^2 /batchedUpdate messages from frequently sending when N clients
 * are all moving around at once. We establish a short window interval (e.g. 100ms), and all /batchedUpdate
 * messages that are received within that same window are grouped together. Pending messages are sent to
 * all clients a single time per interval (rather than individually as soon as they are received).
 * The interval adjusts dynamically based on the number of active clients, as well as the average round-trip
 * time that each client has self-reported; this helps to maintain speed when network isn't congested.
 */
class BatchedUpdateAggregator {
    /**
     * @param {Function} broadcastCallback - The function to call with the aggregated updates every interval.
     * @param {Object} [options] - Optional configuration object.
     * @param {number} [options.minAggregationIntervalMs=33] - The minimum interval (in milliseconds) between aggregations. Defaults to 33ms.
     * @param {number} [options.maxAggregationIntervalMs=1000] - The maximum interval (in milliseconds) between aggregations. Defaults to 1000ms.
     * @param {number} [options.rollingWindowSize=30] - The size of the rolling window used to calculate the peak number of active clients. Defaults to 30.
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
        this.activeClients = new Set(); // this stores the list of clientIds active in the current time interval
        this.activeClientsHistory = []; // this stores the *number* of active clients per time window, going into the past
        this.rollingWindowSize = options.rollingWindowSize;
        this.clientRTTs = new Map(); // Store round-trip times for each client

        this.ENABLE_LOGGING = false;

        // Start periodic pruning of inactive clients
        this.RTT_EXPIRY_TIME = 10000; // 10 seconds – this controls how long in the past the average RTT is based on
        this._startPruningInactiveClients();
    }

    /**
     * Call this with the round-trip-time of a client to make the batchedUpdate include that in its congestion calculations
     * @public
     *
     * @param {string} clientId
     * @param {number} rtt
     */
    trackClientRTT(clientId, rtt) {
        const currentTime = Date.now();

        if (!this.clientRTTs.has(clientId)) {
            this.clientRTTs.set(clientId, []);
        }

        const rttHistory = this.clientRTTs.get(clientId);

        // Store RTT along with the current timestamp
        rttHistory.push({ rtt, timestamp: currentTime });

        // Remove RTT entries older than a certain threshold
        this.clientRTTs.set(clientId, rttHistory.filter(entry => currentTime - entry.timestamp < this.RTT_EXPIRY_TIME));
    }

    /**
     * Method to handle incoming updates
     * @public
     *
     * @param update
     */
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
        this._pushUpdateToBuffer(update);

        // Dynamically adjust the aggregation interval based on the rolling average of active clients
        this._adjustAggregationInterval();

        // Start the timer if it's not already running
        if (!this.aggregationTimer) {
            this.aggregationTimer = setTimeout(() => {
                this._aggregateAndSendUpdates();
                this.aggregationTimer = null; // Reset the timer
            }, this.aggregationIntervalMs);
        }
    }

    /**
     * There's no reason to send multiple messages updating the same property, so remove old identical queued messages
     * before adding the newest one to the updateBuffer. These will be sent out in `_aggregateAndSendUpdates`
     * @param {Object} update
     */
    _pushUpdateToBuffer(update) {
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

    /**
     * Calculates the average round-trip-time across all clients over the past RTT_EXPIRY_TIME milliseconds
     * @return {number}
     */
    _getAverageRTT() {
        let totalRTT = 0;
        let count = 0;
        const currentTime = Date.now();

        this.clientRTTs.forEach(rttHistory => {
            // Filter out expired RTT entries before calculating
            const recentRTTs = rttHistory.filter(entry => currentTime - entry.timestamp < this.RTT_EXPIRY_TIME);

            if (recentRTTs.length > 0) {
                totalRTT += recentRTTs.reduce((sum, entry) => sum + entry.rtt, 0);
                count += recentRTTs.length;
            }
        });

        return count > 0 ? totalRTT / count : 0;
    }

    /**
     * Removes any reported round-trip-times that are older than RTT_EXPIRY_TIME milliseconds,
     * so that old values and disconnected clients no longer influence the current traffic interval
     */
    _startPruningInactiveClients() {
        // Prune inactive clients every 30 seconds
        setInterval(() => {
            const currentTime = Date.now();
            this.clientRTTs.forEach((rttHistory, clientId) => {
                // If all RTT entries are expired, remove the client
                const recentRTTs = rttHistory.filter(entry => currentTime - entry.timestamp < this.RTT_EXPIRY_TIME);
                if (recentRTTs.length === 0) {
                    this.clientRTTs.delete(clientId);
                } else {
                    // Otherwise, update the RTT list for that client
                    this.clientRTTs.set(clientId, recentRTTs);
                }
            });

            if (this.ENABLE_LOGGING) {
                console.log('Pruned inactive clients from RTT tracking.');
            }
        }, this.RTT_EXPIRY_TIME); // Pruning interval
    }

    /**
     * Adds a clientId to the active clients, so that the number of active clients can be computed for this time interval.
     * @param {string} clientId
     */
    _trackActiveClient(clientId) {
        this.activeClients.add(clientId);
    }

    /**
     * Updates a rolling list of the number of clients sending messages per time interval,
     * for the past `rollingWindowSize` number of time intervals.
     * @param {number} clientCount
     */
    _updateClientHistory(clientCount) {
        if (this.activeClientsHistory.length >= this.rollingWindowSize) {
            this.activeClientsHistory.shift(); // Remove the oldest entry
        }
        this.activeClientsHistory.push(clientCount);
    }

    /**
     * Gives peak number of users sending messages over the rolling window. Defaults to 1 user.
     * Note: I've found this to work better than rolling average for responding to congestion.
     * @return {number}
     */
    _getPeakClientCount() {
        return Math.max(...this.activeClientsHistory, 1);
    }

    /**
     * Dynamically adjusts the tick-rate of the system to attempt to balance speed and congestion,
     * based on the number of active clients and the self-reported RTTs of each client.
     */
    _adjustAggregationInterval() {
        const peakClientCount = this._getPeakClientCount();
        const averageRTT = this._getAverageRTT(); // try getMedianRTT as well?

        // Dynamically increase the time interval to reduce traffic; it increases based on two factors:

        // 1. Begin by calculating the number of user-to-user connections (assumes each message broadcasts to every client)
        const MAX_MS_DELAY_DUE_TO_CLIENT_NUMBER = 150; // cap this factor at a threshold to prevent it from getting too slow purely due to number of clients
        let interval = Math.min(peakClientCount * (peakClientCount - 1), MAX_MS_DELAY_DUE_TO_CLIENT_NUMBER);

        // 2. Introduce a scaling factor that adds to the base interval based on higher round-trip-time values
        const RTT_SCALING_FACTOR = 1.5; // Adjusts sensitivity to RTT; can be tuned to more aggressively dampen traffic
        interval += (averageRTT * RTT_SCALING_FACTOR);

        // Clamp the interval to be within the min and max bounds, e.g. between 1fps and 30fps
        this.aggregationIntervalMs = Math.max(
            this.minAggregationIntervalMs,
            Math.min(this.maxAggregationIntervalMs, interval)
        );

        if (this.ENABLE_LOGGING && this.aggregationIntervalMs !== this.minAggregationIntervalMs) {
            console.log(`Adjusted aggregation interval to ${this.aggregationIntervalMs}ms based on ${peakClientCount} peak active clients and ${averageRTT}ms average RTT.`);
        }
    }

    /**
     * Aggregate all of the batchedUpdates received in the current interval (stored in `updateBuffer`)
     * into a single batchedUpdate message, broadcast the message to all clients,
     * and prepare state for the next time interval
     */
    _aggregateAndSendUpdates() {
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
