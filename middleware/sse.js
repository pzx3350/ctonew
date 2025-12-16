/**
 * Create Server-Sent Events headers
 */
const createSSEHeaders = () => ({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
});

/**
 * Send SSE event
 * @param {Object} res - Express response object
 * @param {string} eventType - Type of event
 * @param {Object} data - Data to send
 */
const sendSSEEvent = (res, eventType, data) => {
    res.write(`data: ${JSON.stringify({
        type: eventType,
        data,
        timestamp: new Date().toISOString()
    })}\n\n`);
};

/**
 * Send SSE heartbeat
 * @param {Object} res - Express response object
 */
const sendSSEHeartbeat = (res) => {
    res.write(`data: ${JSON.stringify({
        type: 'heartbeat',
        timestamp: new Date().toISOString()
    })}\n\n`);
};

module.exports = {
    createSSEHeaders,
    sendSSEEvent,
    sendSSEHeartbeat
};